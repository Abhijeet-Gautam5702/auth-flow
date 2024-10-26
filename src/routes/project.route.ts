import { Router } from "express";
import { authenticateAdmin } from "../middlewares/admin-auth";
import {
  createNewProjectKey,
  createProject,
} from "../controllers/project.controller";
const router = Router();

router.route("/create").post(authenticateAdmin, createProject);
router.route("/generate-new-key").put(authenticateAdmin, createNewProjectKey);

export const projectRouter = router;
