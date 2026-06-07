// @ts-nocheck
// routes/authRoutes.ts

import { Router } from "express";
import { authController } from "../controllers/AuthController";
import { authenticate } from "../middleware/authenticate";
import { createToken } from "../middleware/authenticate";
import jwt from "jsonwebtoken";
import passport from "passport";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwtConfig";

const router = Router();

router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post("/forgot-password", authController.forgotPassword.bind(authController));
router.post("/reset-password", authController.resetPassword.bind(authController));
router.post("/verify-2fa", authController.verify2FALogin.bind(authController));
router.get("/me", authenticate,  authController.me.bind(authController));

// Admin route for updating user roles
router.put("/users/:userId/role", authenticate, authController.updateUserRole.bind(authController));

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    // Generate JWT and redirect to frontend with token
    const user = req.user as any;
    if (!user) {
      return res.redirect("/login?error=NoUser");
    }
    const token = jwt.sign({
      userId: user._id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    // Redirect to frontend with token as query param
    res.redirect(`https://lysp.io/auth/login?token=${token}`);
  }
);

export default router;
