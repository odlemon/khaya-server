// @ts-nocheck
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";
import crypto from "crypto";

function rejectIfAdminTerminated(user: any, done: (e: Error | null, u?: false) => void): boolean {
  if (user?.adminTerminatedAt) {
    done(new Error("Account disabled"));
    return true;
  }
  return false;
}

passport.use(new GoogleStrategy({
  clientID: "720698635389-0ckrr5nqc79mikfl1i482idd8nv00jrb.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "https://lysp-backend.vercel.app/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (user) {
      if (rejectIfAdminTerminated(user, done)) return;
      return done(null, user); // Existing user, login
    }
    // If not found by googleId, check if email exists (user may have registered with email before)
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    if (!email) return done(new Error("No email found in Google profile"));
    user = await User.findOne({ email });
    if (user) {
      if (rejectIfAdminTerminated(user, done)) return;
      // Optionally, link Google account to existing user
      user.googleId = profile.id;
      user.registrationMethod = "google";
      await user.save();
      return done(null, user);
    }
    // Register new user
    const [firstName, ...rest] = profile.displayName.split(" ");
    const lastName = rest.join(" ") || "-";
    
    const randomPassword = crypto.randomBytes(16).toString("hex");
    user = await User.create({
      firstName,
      lastName,
      email,
      password: randomPassword,
      role: "tenant", // Default role for new users via Google OAuth
      googleId: profile.id,
      registrationMethod: "google"
    });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
}); 