import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { apiRateLimiter } from "./middlewares/api-limit";
import { API_VERSION, env } from "./constants";

// Initialize express app
const app = express();

// Middlewares
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: true,
  })
);
app.use(apiRateLimiter.overall(5 * 60 * 1000, 100));

// Router imports
import { userRouter } from "./routes/user.route";
import { validateProject } from "./middlewares/validate-project";
import { adminRouter } from "./routes/admin.route";
import { multipleProjectsRouter, projectRouter } from "./routes/project.route";
import { authenticateAdmin } from "./middlewares/admin-auth";
import { securityLogRouter } from "./routes/security-log.route";

app.use(`/api/${API_VERSION}/user`, validateProject, userRouter);
app.use(`/api/${API_VERSION}/admin`, adminRouter);
app.use(`/api/${API_VERSION}/project`, authenticateAdmin, projectRouter);
app.use(
  `/api/${API_VERSION}/projects`,
  authenticateAdmin,
  multipleProjectsRouter
);
app.use(`/api/${API_VERSION}/logs`, validateProject, securityLogRouter);

export default app;
