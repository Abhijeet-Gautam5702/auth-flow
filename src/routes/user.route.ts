import { Router } from "express";
import {
  createAccount,
  createLoginSession,
  deleteLoginSession,
} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/user-auth.middleware";

const router = Router();

router.route("/create").post(createAccount);
router.route("/session/create").post(createLoginSession);
router.route("/session/delete").delete(authenticateUser, deleteLoginSession);

export const userRouter = router;
