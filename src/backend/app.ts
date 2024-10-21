import express from "express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import { API_VERSION, env } from "../constants";

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

app.use(`/api/${API_VERSION}/healthcheck`, healthCheckRouter);

export default app;
