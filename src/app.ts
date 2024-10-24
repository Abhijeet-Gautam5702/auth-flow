import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
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
    origin: env.app.corsOrigin,
  })
);

// Router imports
import { healthCheckRouter } from "./routes/healthcheck.route";
import { userRouter } from "./routes/user.route";
import { validateProject } from "./middlewares/validate-project";
import { adminRouter } from "./routes/admin.route";

// Validate the Project credentials on hitting any endpoint
app.use(validateProject);

app.use(`/api/${API_VERSION}/healthcheck`, healthCheckRouter);
app.use(`/api/${API_VERSION}/user`, userRouter);
app.use(`/api/${API_VERSION}/admin`, adminRouter);

export default app;
