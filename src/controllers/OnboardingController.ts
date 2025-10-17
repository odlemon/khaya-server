// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { LandlordOnboarding, TenantOnboarding } from "../models/Onboarding";
import { User } from "../models/User";
import { Types } from "mongoose";

export class OnboardingController {

  // Get onboarding status for current user
  async getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      console.log("User role:", user.role); // Debug log

      let onboarding;
      if (user.role === "landlord") {
        onboarding = await LandlordOnboarding.findOne({ userId });
      } else if (user.role === "tenant") {
        onboarding = await TenantOnboarding.findOne({ userId });
      } else {
        console.log("Invalid role:", user.role); // Debug log
        return res.status(400).json({ success: false, message: "Invalid user role for onboarding" });
      }

      if (!onboarding) {
        // Create new onboarding record
        if (user.role === "landlord") {
          onboarding = new LandlordOnboarding({ userId });
        } else {
          onboarding = new TenantOnboarding({ userId });
        }
        await onboarding.save();
      }

      res.status(200).json({
        success: true,
        data: {
          isCompleted: onboarding.isCompleted,
          currentStep: onboarding.currentStep,
          totalSteps: onboarding.totalSteps,
          userType: onboarding.userType,
          steps: onboarding.steps
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Update landlord onboarding step
  async updateLandlordOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { step, data } = req.body;

      const user = await User.findById(userId);
      if (!user || user.role !== "landlord") {
        return res.status(403).json({ success: false, message: "Only landlords can access landlord onboarding" });
      }

      let onboarding = await LandlordOnboarding.findOne({ userId });
      if (!onboarding) {
        onboarding = new LandlordOnboarding({ userId });
      }

      // Update the specific step
      if (step && onboarding.steps[step]) {
        onboarding.steps[step].data = { ...onboarding.steps[step].data, ...data };
        onboarding.steps[step].completed = true;
        
        // Update current step
        const stepOrder = ["profileSetup", "propertyDetails", "verification", "preferences", "paymentSetup"];
        const currentStepIndex = stepOrder.indexOf(step);
        if (currentStepIndex !== -1 && currentStepIndex >= onboarding.currentStep - 1) {
          onboarding.currentStep = currentStepIndex + 2; // Move to next step
        }
      }

      // Check if all steps are completed
      const allStepsCompleted = Object.values(onboarding.steps).every(step => step.completed);
      if (allStepsCompleted) {
        onboarding.isCompleted = true;
        onboarding.currentStep = onboarding.totalSteps;
        
        // Update user verification status
        await User.findByIdAndUpdate(userId, { isVerified: true });
      }

      await onboarding.save();

      res.status(200).json({
        success: true,
        message: "Onboarding step updated successfully",
        data: {
          isCompleted: onboarding.isCompleted,
          currentStep: onboarding.currentStep,
          totalSteps: onboarding.totalSteps,
          steps: onboarding.steps
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Update tenant onboarding step
  async updateTenantOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { step, data } = req.body;

      const user = await User.findById(userId);
      if (!user || user.role !== "tenant") {
        return res.status(403).json({ success: false, message: "Only tenants can access tenant onboarding" });
      }

      let onboarding = await TenantOnboarding.findOne({ userId });
      if (!onboarding) {
        onboarding = new TenantOnboarding({ userId });
      }

      // Update the specific step
      if (step && onboarding.steps[step]) {
        onboarding.steps[step].data = { ...onboarding.steps[step].data, ...data };
        onboarding.steps[step].completed = true;
        
        // Update current step
        const stepOrder = ["profileSetup", "rentalHistory", "preferences", "verification", "documents", "servicePreferences"];
        const currentStepIndex = stepOrder.indexOf(step);
        if (currentStepIndex !== -1 && currentStepIndex >= onboarding.currentStep - 1) {
          onboarding.currentStep = currentStepIndex + 2; // Move to next step
        }
      }

      // Check if all steps are completed
      const allStepsCompleted = Object.values(onboarding.steps).every(step => step.completed);
      if (allStepsCompleted) {
        onboarding.isCompleted = true;
        onboarding.currentStep = onboarding.totalSteps;
        
        // Update user verification status
        await User.findByIdAndUpdate(userId, { isVerified: true });
      }

      await onboarding.save();

      res.status(200).json({
        success: true,
        message: "Onboarding step updated successfully",
        data: {
          isCompleted: onboarding.isCompleted,
          currentStep: onboarding.currentStep,
          totalSteps: onboarding.totalSteps,
          steps: onboarding.steps
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get onboarding progress
  async getOnboardingProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      let onboarding;
      if (user.role === "landlord") {
        onboarding = await LandlordOnboarding.findOne({ userId });
      } else if (user.role === "tenant") {
        onboarding = await TenantOnboarding.findOne({ userId });
      } else {
        return res.status(400).json({ success: false, message: "Invalid user role" });
      }

      if (!onboarding) {
        return res.status(404).json({ success: false, message: "Onboarding not found" });
      }

      // Calculate progress
      const completedSteps = Object.values(onboarding.steps).filter(step => step.completed).length;
      const progress = Math.round((completedSteps / onboarding.totalSteps) * 100);

      res.status(200).json({
        success: true,
        data: {
          progress,
          completedSteps,
          totalSteps: onboarding.totalSteps,
          currentStep: onboarding.currentStep,
          isCompleted: onboarding.isCompleted,
          userType: onboarding.userType
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Skip onboarding step (for testing or optional steps)
  async skipOnboardingStep(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { step } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      let onboarding;
      if (user.role === "landlord") {
        onboarding = await LandlordOnboarding.findOne({ userId });
      } else if (user.role === "tenant") {
        onboarding = await TenantOnboarding.findOne({ userId });
      } else {
        return res.status(400).json({ success: false, message: "Invalid user role" });
      }

      if (!onboarding) {
        return res.status(404).json({ success: false, message: "Onboarding not found" });
      }

      // Mark step as completed without data
      if (step && onboarding.steps[step]) {
        onboarding.steps[step].completed = true;
        onboarding.currentStep = Math.min(onboarding.currentStep + 1, onboarding.totalSteps);
      }

      await onboarding.save();

      res.status(200).json({
        success: true,
        message: "Onboarding step skipped successfully",
        data: {
          currentStep: onboarding.currentStep,
          totalSteps: onboarding.totalSteps
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Reset onboarding (for testing or re-onboarding)
  async resetOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (user.role === "landlord") {
        await LandlordOnboarding.findOneAndDelete({ userId });
      } else if (user.role === "tenant") {
        await TenantOnboarding.findOneAndDelete({ userId });
      } else {
        return res.status(400).json({ success: false, message: "Invalid user role" });
      }

      // Reset user verification status
      await User.findByIdAndUpdate(userId, { isVerified: false });

      res.status(200).json({
        success: true,
        message: "Onboarding reset successfully"
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get onboarding requirements for user type
  async getOnboardingRequirements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      let requirements;
      if (user.role === "landlord") {
        requirements = {
          userType: "landlord",
          totalSteps: 5,
          steps: [
            {
              id: "profileSetup",
              title: "Business Profile Setup",
              description: "Tell us about your business and experience",
              required: true,
              fields: [
                { name: "businessName", type: "text", label: "Business Name", required: false },
                { name: "businessType", type: "select", label: "Business Type", required: false, options: ["Individual", "Company", "Trust"] },
                { name: "businessLicense", type: "text", label: "Business License Number", required: false },
                { name: "taxId", type: "text", label: "Tax ID", required: false },
                { name: "yearsInBusiness", type: "number", label: "Years in Business", required: false },
                { name: "portfolioSize", type: "number", label: "Number of Properties", required: false }
              ]
            },
            {
              id: "propertyDetails",
              title: "Property Portfolio",
              description: "Information about your properties",
              required: true,
              fields: [
                { name: "propertyTypes", type: "multiselect", label: "Property Types", required: true, options: ["apartment", "house", "room", "studio", "townhouse"] },
                { name: "totalProperties", type: "number", label: "Total Properties", required: true },
                { name: "averageRent", type: "number", label: "Average Monthly Rent", required: true },
                { name: "preferredAreas", type: "multiselect", label: "Preferred Areas", required: true },
                { name: "propertyManagement", type: "boolean", label: "Use Property Management Services", required: false }
              ]
            },
            {
              id: "verification",
              title: "Identity Verification",
              description: "Upload required documents for verification",
              required: true,
              fields: [
                { name: "idDocument", type: "file", label: "ID Document", required: true },
                { name: "proofOfOwnership", type: "files", label: "Proof of Property Ownership", required: true },
                { name: "bankStatement", type: "file", label: "Bank Statement", required: false },
                { name: "references", type: "multiselect", label: "Professional References", required: false }
              ]
            },
            {
              id: "preferences",
              title: "Rental Preferences",
              description: "Set your rental preferences and requirements",
              required: true,
              fields: [
                { name: "preferredTenants", type: "multiselect", label: "Preferred Tenant Types", required: false, options: ["Students", "Professionals", "Families", "Couples"] },
                { name: "minimumRent", type: "number", label: "Minimum Monthly Rent", required: true },
                { name: "leaseTerms", type: "multiselect", label: "Preferred Lease Terms", required: true, options: ["6 months", "12 months", "24 months", "Flexible"] },
                { name: "maintenanceServices", type: "boolean", label: "Include Maintenance Services", required: false },
                { name: "khayalamiAgent", type: "boolean", label: "Use Khayalami Agent Services", required: false },
                { name: "zeroDeposit", type: "boolean", label: "Offer Zero Deposit Option", required: false }
              ]
            },
            {
              id: "paymentSetup",
              title: "Payment Setup",
              description: "Configure your payment preferences",
              required: true,
              fields: [
                { name: "bankAccount", type: "text", label: "Bank Account Number", required: true },
                { name: "paymentMethod", type: "select", label: "Preferred Payment Method", required: true, options: ["Bank Transfer", "EFT", "Card Payment"] },
                { name: "autoPayments", type: "boolean", label: "Enable Auto Payments", required: false },
                { name: "preferredCurrency", type: "select", label: "Preferred Currency", required: true, options: ["ZAR", "USD", "EUR"] }
              ]
            }
          ]
        };
      } else if (user.role === "tenant") {
        requirements = {
          userType: "tenant",
          totalSteps: 6,
          steps: [
            {
              id: "profileSetup",
              title: "Employment Information",
              description: "Tell us about your employment status",
              required: true,
              fields: [
                { name: "employmentStatus", type: "select", label: "Employment Status", required: true, options: ["Employed", "Self-Employed", "Student", "Retired", "Unemployed"] },
                { name: "employer", type: "text", label: "Employer Name", required: false },
                { name: "monthlyIncome", type: "number", label: "Monthly Income", required: true },
                { name: "employmentDuration", type: "number", label: "Years Employed", required: false },
                { name: "references", type: "multiselect", label: "Professional References", required: false }
              ]
            },
            {
              id: "rentalHistory",
              title: "Rental History",
              description: "Information about your previous rentals",
              required: true,
              fields: [
                { name: "previousLandlords", type: "multiselect", label: "Previous Landlords", required: false },
                { name: "rentalHistory", type: "number", label: "Years of Rental History", required: false },
                { name: "evictionHistory", type: "boolean", label: "Any Eviction History", required: true },
                { name: "paymentHistory", type: "select", label: "Payment History", required: true, options: ["Excellent", "Good", "Fair", "Poor"] },
                { name: "references", type: "multiselect", label: "Landlord References", required: false }
              ]
            },
            {
              id: "preferences",
              title: "Property Preferences",
              description: "Tell us what you're looking for",
              required: true,
              fields: [
                { name: "preferredAreas", type: "multiselect", label: "Preferred Areas", required: true },
                { name: "budget.min", type: "number", label: "Minimum Budget", required: true },
                { name: "budget.max", type: "number", label: "Maximum Budget", required: true },
                { name: "propertyTypes", type: "multiselect", label: "Property Types", required: true, options: ["apartment", "house", "room", "studio", "townhouse"] },
                { name: "bedrooms", type: "number", label: "Number of Bedrooms", required: true },
                { name: "moveInDate", type: "date", label: "Preferred Move-in Date", required: true },
                { name: "leaseDuration", type: "number", label: "Lease Duration (months)", required: true },
                { name: "petFriendly", type: "boolean", label: "Pet Friendly Required", required: false },
                { name: "parkingRequired", type: "boolean", label: "Parking Required", required: false }
              ]
            },
            {
              id: "verification",
              title: "Identity Verification",
              description: "Upload required documents for verification",
              required: true,
              fields: [
                { name: "idDocument", type: "file", label: "ID Document", required: true },
                { name: "payslips", type: "files", label: "Recent Payslips", required: false },
                { name: "bankStatement", type: "file", label: "Bank Statement", required: false },
                { name: "creditCheck", type: "boolean", label: "Allow Credit Check", required: true },
                { name: "backgroundCheck", type: "boolean", label: "Allow Background Check", required: true }
              ]
            },
            {
              id: "documents",
              title: "Required Documents",
              description: "Upload additional required documents",
              required: true,
              fields: [
                { name: "proofOfIncome", type: "files", label: "Proof of Income", required: true },
                { name: "employmentLetter", type: "file", label: "Employment Letter", required: false },
                { name: "bankStatements", type: "files", label: "Bank Statements (3 months)", required: false },
                { name: "references", type: "multiselect", label: "Personal References", required: false }
              ]
            },
            {
              id: "preferences",
              title: "Service Preferences",
              description: "Set your service preferences",
              required: true,
              fields: [
                { name: "zeroDeposit", type: "boolean", label: "Interested in Zero Deposit", required: false },
                { name: "utilitiesIncluded", type: "boolean", label: "Prefer Utilities Included", required: false },
                { name: "maintenanceServices", type: "boolean", label: "Include Maintenance Services", required: false },
                { name: "notificationPreferences.email", type: "boolean", label: "Email Notifications", required: false },
                { name: "notificationPreferences.sms", type: "boolean", label: "SMS Notifications", required: false },
                { name: "notificationPreferences.push", type: "boolean", label: "Push Notifications", required: false }
              ]
            }
          ]
        };
      } else {
        return res.status(400).json({ success: false, message: "Invalid user role" });
      }

      res.status(200).json({
        success: true,
        data: requirements
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const onboardingController = new OnboardingController(); 