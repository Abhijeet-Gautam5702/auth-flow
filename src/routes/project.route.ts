import { Router } from "express";
import {
  createNewProjectKey,
  createProject,
  getProject,
  updateEmailTemplates,
  updateLoginMethods,
  updateSecurity,
} from "../controllers/project.controller";
import { validateProject } from "../middlewares/validate-project";

const router = Router();

router.route("/create").post(createProject);
router.route("/generate-new-key").put(validateProject, createNewProjectKey);
router.route("/:projectId").get(getProject);

router.route("/update/login-methods").put(validateProject, updateLoginMethods);
router.route("/update/security").put(validateProject, updateSecurity);
router
  .route("/update/email-templates")
  .put(validateProject, updateEmailTemplates);

export const projectRouter = router;
