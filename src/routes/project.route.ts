import { Router } from "express";
import {
  clearInactiveUserAccounts,
  createNewProjectKey,
  createProject,
  deleteAllProjects,
  deleteProject,
  getAllProjects,
  getProject,
  projectOverview,
  resetEmailTemplateToDefault,
  updateEmailTemplates,
  updateLoginMethods,
  updateSecurity,
} from "../controllers/project.controller";
import { validateProject } from "../middlewares/validate-project";

// Endpoints related to a single project
const router = Router();

router.route("/create").post(createProject);
router.route("/generate-new-key").put(validateProject, createNewProjectKey);
router.route("/:projectId").get(getProject);
router.route("/delete/:projectId").delete(deleteProject);

router.route("/update/login-methods").put(validateProject, updateLoginMethods);
router.route("/update/security").put(validateProject, updateSecurity);
router
  .route("/update/email-templates")
  .put(validateProject, updateEmailTemplates);

router
  .route("/reset/email-template/:emailTemplate")
  .put(validateProject, resetEmailTemplateToDefault);
router
  .route("/reset/security-setting")
  .put(validateProject, resetEmailTemplateToDefault);

router.route("/overview").get(validateProject, projectOverview);

router
  .route("/remove-inactive-accounts")
  .delete(validateProject, clearInactiveUserAccounts);

// Endpoints related to all projects under an admin
const router2 = Router();

router2.route("/").get(getAllProjects);
router2.route("/delete").delete(deleteAllProjects);

export const projectRouter = router; // router for handling single project
export const multipleProjectsRouter = router2; // router for handling multiple projects at a time
