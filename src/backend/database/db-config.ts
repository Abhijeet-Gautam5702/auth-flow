import mongoose from "mongoose";
import { responseType, env } from "../../constants";

export const dbConnect = async () => {
  try {
    const response = await mongoose.connect(env.database.uri, {
      dbName: env.database.dbName,
    });

    console.log(
      `${responseType.CONNECTION_SUCCESSFUL.type}: Database successfully connected`
    );
    console.log(
      `Port: ${response.connection.port} \nHost: ${response.connection.host}`
    );
  } catch (error: any) {
    console.log(`${responseType.DATABASE_ERROR.type}: ${error.message}`);
    throw error;
  }
};
