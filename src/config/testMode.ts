// @ts-nocheck
/**
 * Test Mode Configuration
 * 
 * When TEST_MODE=true:
 * - 1 month = 10 minutes (30 days = 10 minutes)
 * - 7 days = 4 minutes (as requested for first reminder)
 * - 3 days = ~1.7 minutes (3/7 * 4)
 * - 1 day = ~0.57 minutes (1/7 * 4)
 * 
 * This allows testing the reminder system quickly
 */

// Hardcoded for testing - set to false for production
export const TEST_MODE = true;

// Time conversion ratios for test mode
// Based on: 7 days = 4 minutes, so 1 day = 4/7 minutes ≈ 0.57 minutes
export const TEST_TIME_RATIOS = {
  // 7 days = 4 minutes (as requested)
  DAYS_7_TO_MINUTES: 4,
  // Calculate minutes per day
  get MINUTES_PER_DAY() {
    return this.DAYS_7_TO_MINUTES / 7; // ~0.57 minutes per day
  },
  // 1 month = 30 days = 30 * 0.57 = ~17 minutes (but we'll use 10 minutes for simplicity)
  MONTH_TO_MINUTES: 10
};

/**
 * Convert days to minutes in test mode
 */
export function daysToMinutes(days: number): number {
  if (!TEST_MODE) return days;
  return days * TEST_TIME_RATIOS.MINUTES_PER_DAY;
}

/**
 * Convert minutes to days in test mode (for display)
 */
export function minutesToDays(minutes: number): number {
  if (!TEST_MODE) return minutes;
  return Math.round(minutes / TEST_TIME_RATIOS.MINUTES_PER_DAY);
}

/**
 * Add "days" (minutes in test mode) to a date
 */
export function addDays(date: Date, days: number): Date {
  if (TEST_MODE) {
    const minutes = daysToMinutes(days);
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add "months" (10 minutes in test mode) to a date
 */
export function addMonths(date: Date, months: number): Date {
  if (TEST_MODE) {
    // 1 month = 10 minutes in test mode
    const minutes = months * TEST_TIME_RATIOS.MONTH_TO_MINUTES;
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
