import { Router } from "express";
import {
  createAccount,
  createLoginSession,
  deleteLoginSession,
} from "../controllers/admin.controller";
import { authenticateAdmin } from "../middlewares/admin-auth";

const router = Router();

router.route("/account/create").post(createAccount);
router.route("/account/login").post(createLoginSession);
router.route("/account/logout").put(authenticateAdmin, deleteLoginSession);

export const adminRouter = router;
