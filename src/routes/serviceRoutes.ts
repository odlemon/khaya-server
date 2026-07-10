// @ts-nocheck
import express from "express";
import { serviceBookingController } from "../controllers/ServiceBookingController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ========== TENANT/LANDLORD ENDPOINTS ==========

/**
 * Book a new service
 * POST /api/services/book
 * Role: Tenant | Landlord
 */
router.post(
  "/book",
  authorize(["tenant", "landlord"]),
  serviceBookingController.bookService.bind(serviceBookingController)
);

/**
 * Get all services for a rental
 * GET /api/services/rental/:rentalId?status=pending&serviceType=plumbing
 * Role: Tenant | Landlord
 */
router.get(
  "/rental/:rentalId",
  authorize(["tenant", "landlord"]),
  serviceBookingController.getServicesForRental.bind(serviceBookingController)
);

/**
 * Get service by ID
 * GET /api/services/:serviceId
 * Role: Tenant | Landlord
 */
router.get(
  "/:serviceId",
  authorize(["tenant", "landlord"]),
  serviceBookingController.getServiceById.bind(serviceBookingController)
);

/**
 * Landlord approves service request
 * POST /api/services/:serviceId/approve
 * Role: Landlord
 */
router.post(
  "/:serviceId/approve",
  authorize(["landlord"]),
  serviceBookingController.approveLandlordService.bind(serviceBookingController)
);

/**
 * Landlord rejects service request
 * POST /api/services/:serviceId/reject
 * Role: Landlord
 */
router.post(
  "/:serviceId/reject",
  authorize(["landlord"]),
  serviceBookingController.rejectLandlordService.bind(serviceBookingController)
);

/**
 * Cancel service
 * PUT /api/services/:serviceId/cancel
 * Role: Tenant | Landlord
 */
router.put(
  "/:serviceId/cancel",
  authorize(["tenant", "landlord"]),
  serviceBookingController.cancelService.bind(serviceBookingController)
);

/**
 * Rate service (after completion)
 * POST /api/services/:serviceId/rate
 * Role: Tenant | Landlord
 */
router.post(
  "/:serviceId/rate",
  authorize(["tenant", "landlord"]),
  serviceBookingController.rateService.bind(serviceBookingController)
);

/**
 * Get all services for user (across all rentals)
 * GET /api/services/history?status=completed&serviceType=plumbing
 * Role: Tenant | Landlord
 */
router.get(
  "/history",
  authorize(["tenant", "landlord"]),
  serviceBookingController.getUserServices.bind(serviceBookingController)
);

/**
 * Get service reminders
 * GET /api/services/reminders
 * Role: Tenant | Landlord
 */
router.get(
  "/reminders",
  authorize(["tenant", "landlord"]),
  serviceBookingController.getServiceReminders.bind(serviceBookingController)
);

/**
 * Pay for service
 * POST /api/services/:serviceId/pay
 * Role: Tenant | Landlord (based on paidBy field)
 */
router.post(
  "/:serviceId/pay",
  authorize(["tenant", "landlord"]),
  serviceBookingController.payForService.bind(serviceBookingController)
);

// ========== ADMIN ENDPOINTS ==========

/**
 * Admin: Get all service requests
 * GET /api/admin/services?status=pending&urgency=high
 * Role: Admin
 */
router.get(
  "/admin/all",
  authorize(["admin"]),
  requirePermission("khayalami.services.view"),
  serviceBookingController.getAllServices.bind(serviceBookingController)
);

router.put(
  "/admin/:serviceId/assign",
  authorize(["admin"]),
  requirePermission("khayalami.services.assign"),
  serviceBookingController.assignVendor.bind(serviceBookingController)
);

router.put(
  "/admin/:serviceId/status",
  authorize(["admin"]),
  requirePermission("khayalami.services.assign"),
  serviceBookingController.updateServiceStatus.bind(serviceBookingController)
);

router.post(
  "/admin/:serviceId/bill",
  authorize(["admin"]),
  requirePermission("khayalami.services.billing"),
  serviceBookingController.createServiceBill.bind(serviceBookingController)
);

/**
 * Get all services for landlord
 * GET /api/services/landlord/all?status=approved&serviceType=plumbing
 * Role: Landlord
 */
router.get(
  "/landlord/all",
  authorize(["landlord"]),
  serviceBookingController.getLandlordServices.bind(serviceBookingController)
);

/**
 * Get pending services for landlord
 * GET /api/services/landlord/pending
 * Role: Landlord
 */
router.get(
  "/landlord/pending",
  authorize(["landlord"]),
  serviceBookingController.getLandlordPendingServices.bind(serviceBookingController)
);

/**
 * Get service by ID
 * GET /api/services/:serviceId
 * Role: Tenant | Landlord
 */
router.get(
  "/:serviceId",
  authorize(["tenant", "landlord"]),
  serviceBookingController.getServiceById.bind(serviceBookingController)
);

/**
 * Admin: Get services needing vendor assignment
 * GET /api/services/admin/needing-vendor
 * Role: Admin
 */
router.get(
  "/admin/needing-vendor",
  authorize(["admin"]),
  requirePermission("khayalami.services.view"),
  serviceBookingController.getServicesNeedingVendorAssignment.bind(serviceBookingController)
);

router.post(
  "/admin/:serviceId/assign-vendor",
  authorize(["admin"]),
  requirePermission("khayalami.services.assign"),
  serviceBookingController.assignVendorToService.bind(serviceBookingController)
);

router.post(
  "/admin/:serviceId/approve",
  authorize(["admin"]),
  requirePermission("khayalami.services.approve"),
  serviceBookingController.adminApproveService.bind(serviceBookingController)
);

router.post(
  "/admin/:serviceId/reject",
  authorize(["admin"]),
  requirePermission("khayalami.services.reject"),
  serviceBookingController.adminRejectService.bind(serviceBookingController)
);

/**
 * Mark service as completed
 * POST /api/services/:serviceId/complete
 * Role: Tenant | Landlord | Admin
 */
router.post(
  "/:serviceId/complete",
  authorize(["tenant", "landlord", "admin"]),
  serviceBookingController.markServiceCompleted.bind(serviceBookingController)
);

/**
 * Get services with payment status
 * GET /api/services/payment-status?paymentStatus=unpaid&status=completed
 * Role: Tenant | Landlord
 */
router.get(
  "/payment-status",
  authorize(["tenant", "landlord"]),
  serviceBookingController.getServicesWithPaymentStatus.bind(serviceBookingController)
);

export default router;

