// @ts-nocheck
import express, { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

router.use(authenticate);
router.use(authorize(["admin"]));
router.use(requirePermission("khayalami.staff.users.manage"));

/**
 * Update user role (restricted setup endpoint — staff management only).
 */
router.put("/update-role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

    const validRoles = [
      "admin",
      "insurance_admin",
      "bank_admin",
      "landlord",
      "tenant",
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid role. Must be one of: admin, insurance_admin, bank_admin, landlord, tenant",
      });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
