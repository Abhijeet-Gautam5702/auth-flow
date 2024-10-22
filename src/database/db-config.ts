import mongoose from "mongoose";
import { responseType, env } from "../constants";
import { logger } from "../utils/logger";

export const dbConnect = async () => {
  try {
    const response = await mongoose.connect(env.database.uri, {
      dbName: env.database.dbName,
    });
    logger(
      responseType.CONNECTION_SUCCESSFUL.type,
      "Database successfully connected"
    );
    console.log(
      `Port: ${response.connection.port} \nHost: ${response.connection.host}`
    );
  } catch (error: any) {
    logger(responseType.DATABASE_ERROR.type, error.message);
    throw error;
  }
};
