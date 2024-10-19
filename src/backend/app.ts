import express from "express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import { env } from "../constants";

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


export default app;
