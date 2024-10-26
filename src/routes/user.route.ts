import { Router } from "express";
import {
  createAccount,
  createLoginSession,
  deleteAccount,
  deleteAllLoginSessions,
  deleteCurrentLoginSession,
  deleteLoginSessionByID,
  getAllLoginSessions,
  getCurrentUser,
} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/user-auth";

const router = Router();

// Endpoints related to user
router.route("/").get(authenticateUser, getCurrentUser);
router.route("/create").post(createAccount);
router.route("/delete").delete(authenticateUser, deleteAccount);

// Endpoints related to a single session of a user
router.route("/session/create").post(createLoginSession);
router
  .route("/session/delete")
  .delete(authenticateUser, deleteCurrentLoginSession);
router
  .route("/session/delete/:sessionId")
  .delete(authenticateUser, deleteLoginSessionByID);

// Endpoints related to all sessions of a single user
router.route("/sessions").get(authenticateUser, getAllLoginSessions);
router
  .route("/sessions/delete")
  .delete(authenticateUser, deleteAllLoginSessions);

export const userRouter = router;
