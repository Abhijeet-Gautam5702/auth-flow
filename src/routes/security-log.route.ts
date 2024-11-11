import { Router } from "express";
import { getLogsByEventCode, getLogsByUserId } from "../controllers/security-log.controller";
import { authenticateAdmin } from "../middlewares/admin-auth";
import { validateProject } from "../middlewares/validate-project";

const router = Router();

router.route("/user").get(authenticateAdmin, getLogsByUserId);
router.route("/event").get(authenticateAdmin, getLogsByEventCode);

export const securityLogRouter = router;
