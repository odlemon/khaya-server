import { Rental } from "../models/Rental";
import { ConditionLog } from "../models/ConditionLog";
import { Notification } from "../models/Notification";
import { appNotificationService } from "./AppNotificationService";
import { logger } from "../utils/logger";
import { addMonths } from "../config/testMode";

/**
 * Tenants record the condition of the property once a quarter for the life of
 * the tenancy, so there is a dated trail between the move-in and move-out logs
 * if the deposit is ever disputed.
 *
 * The checkpoints reuse the month-N values already on ConditionLog.logType
 * rather than inventing a parallel vocabulary, which is why the schedule stops
 * at month 12 — that is as far as the enum goes.
 *
 * This is a reminder, not a gate: nothing is blocked when a tenant misses one.
 */
export const CONDITION_LOG_INTERVAL_MONTHS = 3;
export const CONDITION_LOG_MAX_MONTH = 12;

/** How long before its due date a checkpoint starts being announced. */
export const CONDITION_LOG_DUE_SOON_DAYS = 7;

export type ConditionCheckpointStatus = "satisfied" | "overdue" | "due_soon" | "upcoming";

export interface ConditionCheckpoint {
  /** Matches ConditionLog.logType, e.g. "month-3". */
  logType: string;
  monthOffset: number;
  dueDate: Date;
  status: ConditionCheckpointStatus;
  satisfiedAt?: Date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Build the quarterly checkpoints for one rental and mark off the ones already
 * covered by an uploaded log. Pure — callers supply the logs they already hold
 * so the dashboard does not issue a second query.
 */
export function buildQuarterlySchedule(
  rental: { startDate?: Date; createdAt?: Date; endDate?: Date | null; endedAt?: Date | null },
  logs: Array<{ logType?: string; uploadedAt?: Date; createdAt?: Date }>,
  now: Date = new Date()
): ConditionCheckpoint[] {
  const start = rental.startDate || rental.createdAt;
  if (!start) return [];

  // Do not ask for logs past the end of the tenancy.
  const finish = rental.endedAt || rental.endDate || null;

  const satisfiedBy = new Map<string, Date | undefined>();
  for (const log of logs || []) {
    if (log?.logType) satisfiedBy.set(log.logType, log.uploadedAt || log.createdAt);
  }

  const checkpoints: ConditionCheckpoint[] = [];

  for (
    let month = CONDITION_LOG_INTERVAL_MONTHS;
    month <= CONDITION_LOG_MAX_MONTH;
    month += CONDITION_LOG_INTERVAL_MONTHS
  ) {
    const dueDate = addMonths(new Date(start), month);
    if (finish && dueDate > new Date(finish)) break;

    const logType = `month-${month}`;
    const satisfiedAt = satisfiedBy.get(logType);

    let status: ConditionCheckpointStatus;
    if (satisfiedBy.has(logType)) {
      status = "satisfied";
    } else if (dueDate <= now) {
      status = "overdue";
    } else if (daysBetween(now, dueDate) <= CONDITION_LOG_DUE_SOON_DAYS) {
      status = "due_soon";
    } else {
      status = "upcoming";
    }

    checkpoints.push({ logType, monthOffset: month, dueDate, status, satisfiedAt });
  }

  return checkpoints;
}

/** The checkpoint a tenant should act on next, if any. */
export function firstOutstandingCheckpoint(
  schedule: ConditionCheckpoint[]
): ConditionCheckpoint | null {
  return (
    schedule.find((c) => c.status === "overdue") ||
    schedule.find((c) => c.status === "due_soon") ||
    null
  );
}

export class ConditionLogScheduleService {
  /**
   * Notify tenants whose quarterly condition report is due or overdue.
   * Called from the cron route; safe to run repeatedly.
   */
  async checkAndSendReminders(): Promise<{ rentalsChecked: number; remindersSent: number }> {
    const now = new Date();
    const rentals = await Rental.find({ status: "active" })
      .populate("propertyId", "title address")
      .lean();

    let remindersSent = 0;

    for (const rental of rentals as any[]) {
      try {
        const logs = await ConditionLog.find({ rentalId: rental._id })
          .select("logType uploadedAt createdAt")
          .lean();

        const schedule = buildQuarterlySchedule(rental, logs as any[], now);
        const outstanding = schedule.filter(
          (c) => c.status === "overdue" || c.status === "due_soon"
        );

        for (const checkpoint of outstanding) {
          const tenantId = rental.tenantId?.toString?.() || String(rental.tenantId || "");
          if (!tenantId) continue;

          // One reminder per checkpoint per rental, however often this runs.
          const already = await Notification.findOne({
            userId: tenantId,
            type: "condition_log_due",
            "data.rentalId": rental._id?.toString?.() || String(rental._id),
            "data.logType": checkpoint.logType,
          }).lean();

          if (already) continue;

          const propertyLabel =
            rental.propertyId?.title ||
            (rental.propertyId?.address
              ? `${rental.propertyId.address.street || ""}, ${rental.propertyId.address.city || ""}`.trim()
              : "your rental");

          const quarter = checkpoint.monthOffset / CONDITION_LOG_INTERVAL_MONTHS;
          const body =
            checkpoint.status === "overdue"
              ? `Your quarterly condition report for ${propertyLabel} is overdue. Please record a short walkthrough video.`
              : `Your quarterly condition report for ${propertyLabel} is due soon. Please record a short walkthrough video.`;

          await appNotificationService.notify({
            userId: tenantId,
            type: "condition_log_due",
            title: `Property condition report (quarter ${quarter})`,
            body,
            data: {
              rentalId: rental._id?.toString?.() || String(rental._id),
              propertyId: rental.propertyId?._id?.toString?.() || String(rental.propertyId || ""),
              logType: checkpoint.logType,
              dueDate: checkpoint.dueDate,
              status: checkpoint.status,
              path: "/rental-dashboard",
            },
          });

          remindersSent++;
          logger.info(
            `[ConditionLogs] Reminded tenant ${tenantId} about ${checkpoint.logType} (${checkpoint.status}) on rental ${rental._id}`
          );
        }
      } catch (error: any) {
        // One bad rental should not stop the rest of the run.
        logger.error(
          `[ConditionLogs] Failed while checking rental ${rental?._id}: ${error?.message || error}`
        );
      }
    }

    logger.info(
      `[ConditionLogs] Checked ${rentals.length} active rental(s), sent ${remindersSent} reminder(s)`
    );

    return { rentalsChecked: rentals.length, remindersSent };
  }
}

export const conditionLogScheduleService = new ConditionLogScheduleService();
