// @ts-nocheck
import { Router } from "express";
import { landlordPreferencesController } from "../controllers/LandlordPreferencesController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication and landlord role
router.use(authenticate);
router.use(authorize(["landlord"]));

// Get preferences
router.get("/", landlordPreferencesController.getPreferences.bind(landlordPreferencesController));

// Update payment reception method
router.patch(
  "/payment-reception",
  landlordPreferencesController.updatePaymentReception.bind(landlordPreferencesController)
);

// Update subscription payment method
router.patch(
  "/subscription-payment",
  landlordPreferencesController.updateSubscriptionPayment.bind(landlordPreferencesController)
);

// Update premium features
router.patch(
  "/premium-features",
  landlordPreferencesController.updatePremiumFeatures.bind(landlordPreferencesController)
);

export default router;




