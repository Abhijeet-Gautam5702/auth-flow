import { Router } from "express";
import { authenticateAdmin } from "../middlewares/admin-auth";
import { createProject } from "../controllers/project.controller";
const router = Router();

router.route("/create").post(authenticateAdmin, createProject);

export const projectRouter = router;
