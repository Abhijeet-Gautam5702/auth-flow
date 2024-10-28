import { Router } from "express";
import {
  createNewProjectKey,
  createProject,
  deleteAllProjects,
  deleteProject,
  getAllProjects,
  getProject,
  updateEmailTemplates,
  updateLoginMethods,
  updateSecurity,
} from "../controllers/project.controller";
import { validateProject } from "../middlewares/validate-project";

const router = Router();

// Endpoints related to a single project
router.route("/create").post(createProject);
router.route("/generate-new-key").put(validateProject, createNewProjectKey);
router.route("/:projectId").get(getProject);

router.route("/update/login-methods").put(validateProject, updateLoginMethods);
router.route("/update/security").put(validateProject, updateSecurity);
router
  .route("/update/email-templates")
  .put(validateProject, updateEmailTemplates);

router.route("/delete/:projectId").delete(deleteProject);

// Endpoints related to all projects under an admin
router.route("/get-all-projects").get(getAllProjects);
router.route("/delete-all").delete(deleteAllProjects);

export const projectRouter = router;
