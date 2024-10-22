import app from "./app";
import { dbConnect } from "./database/db-config";
import { env, responseType } from "./constants";

// Connect to the database
(async () => {
  await dbConnect();
})();

// Listen to the express app
const port = env.app.port;
try {
  app.listen(port, () => {
    console.log(`App listening on port: ${port}`);
  });
} catch (error: any) {
  console.log(`${responseType.SERVER_ERROR}: ${error.message}`);
  process.exit(1);
}
