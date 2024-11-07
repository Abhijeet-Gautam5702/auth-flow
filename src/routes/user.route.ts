import { Router } from "express";
import {
  createAccount,
  createLoginSession,
  deleteAccount,
  deleteAllLoginSessions,
  deleteCurrentLoginSession,
  deleteLoginSessionByID,
  emailOTPAuth,
  getAllLoginSessions,
  getCurrentUser,
  magicURLAuth,
  refreshAccessToken,
  resetPassword,
  verifyEmail,
} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/user-auth";
import { accountLockout } from "../services/account-lockout";

const router = Router();

// Endpoints related to user
router.route("/").get(authenticateUser, getCurrentUser);
router.route("/create").post(createAccount);
router.route("/delete").delete(authenticateUser, deleteAccount);
router.route("/access-token/refresh").post(refreshAccessToken);

// Endpoints related to a single session of a user
router
  .route("/auth/session/create")
  .post(accountLockout.checkFailedLoginAttempts, createLoginSession);
router
  .route("/auth/session/delete")
  .delete(authenticateUser, deleteCurrentLoginSession);
router
  .route("/auth/session/delete/:sessionId")
  .delete(authenticateUser, deleteLoginSessionByID);

// Endpoints related to all sessions of a single user
router.route("/sessions").get(authenticateUser, getAllLoginSessions);
router
  .route("/sessions/delete")
  .delete(authenticateUser, deleteAllLoginSessions);

// Endpoints related to email-sending functionalities
router.route("/verify").post(authenticateUser, verifyEmail);
router.route("/reset-password").post(authenticateUser, resetPassword);
router
  .route("/auth/magic-url")
  .post(accountLockout.checkFailedLoginAttempts, magicURLAuth);
router
  .route("/auth/otp-on-email")
  .post(accountLockout.checkFailedLoginAttempts, emailOTPAuth);

export const userRouter = router;
