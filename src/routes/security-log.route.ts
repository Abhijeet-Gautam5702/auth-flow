import { Router } from "express";
import { getLogsByEventCode, getLogsByUserId } from "../controllers/security-log.controller";
import { authenticateAdmin } from "../middlewares/admin-auth";

const router = Router();

router.route("/user").get(authenticateAdmin, getLogsByUserId);
router.route("/event").get(authenticateAdmin, getLogsByEventCode);

export const securityLogRouter = router;
