import { Router } from "express";
import { getLogsByUserId } from "../controllers/security-log.controller";
import { authenticateAdmin } from "../middlewares/admin-auth";
import { validateProject } from "../middlewares/validate-project";

const router = Router();

router.route("/user").get(authenticateAdmin, validateProject, getLogsByUserId);

export const securityLogRouter = router;
