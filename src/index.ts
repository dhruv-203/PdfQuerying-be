import "dotenv/config";
import { server } from "./app";
import { db } from "./config/db";
const PORT = process.env.PORT || 8000;

db.initialize().then(() => {
  console.log("Connected to DB");
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
