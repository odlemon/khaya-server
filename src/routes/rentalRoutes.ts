// @ts-nocheck
import express from "express";
import { rentalController } from "../controllers/RentalController";
import { authenticate } from "../middleware/authenticate";

const router = express.Router();

// All rental routes require authentication
router.use(authenticate);

// Get user's rentals
router.get("/", 
  (req, res, next) => rentalController.getUserRentals(req, res, next)
);

// Get rental dashboard (detailed view)
router.get("/:id", 
  (req, res, next) => rentalController.getRentalDashboard(req, res, next)
);

// Condition Logs
router.get("/:rentalId/condition-logs", 
  (req, res, next) => rentalController.getConditionLogs(req, res, next)
);

router.post("/:rentalId/condition-logs", 
  (req, res, next) => rentalController.createConditionLog(req, res, next)
);

router.put("/condition-logs/:conditionLogId", 
  (req, res, next) => rentalController.updateConditionLog(req, res, next)
);

router.delete("/condition-logs/:conditionLogId", 
  (req, res, next) => rentalController.deleteConditionLog(req, res, next)
);

// Payments
router.get("/:rentalId/payments", 
  (req, res, next) => rentalController.getPayments(req, res, next)
);

router.get("/:rentalId/payments/stats", 
  (req, res, next) => rentalController.getPaymentStats(req, res, next)
);

router.post("/payments/:paymentId/submit", 
  (req, res, next) => rentalController.submitPaymentProof(req, res, next)
);

router.post("/payments/:paymentId/verify", 
  (req, res, next) => rentalController.verifyPayment(req, res, next)
);

router.post("/payments/:paymentId/reject", 
  (req, res, next) => rentalController.rejectPayment(req, res, next)
);

router.post("/payments/:paymentId/dispute", 
  (req, res, next) => rentalController.disputePayment(req, res, next)
);

// Maintenance Requests
router.get("/:rentalId/maintenance", 
  (req, res, next) => rentalController.getMaintenanceRequests(req, res, next)
);

router.post("/:rentalId/maintenance", 
  (req, res, next) => rentalController.createMaintenanceRequest(req, res, next)
);

// Service Bookings
router.get("/:rentalId/services", 
  (req, res, next) => rentalController.getServiceBookings(req, res, next)
);

router.post("/:rentalId/services", 
  (req, res, next) => rentalController.createServiceBooking(req, res, next)
);

export default router;

