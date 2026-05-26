import dotenv from "dotenv";
import { createApp } from "@/app";

dotenv.config();

const PORT = process.env.PORT || 4003;
const serviceName = process.env.SERVICE_NAME || "Auth-Service";
const app = createApp();

app.listen(PORT, () => {
  console.log(`${serviceName} is running on port ${PORT}`);
});
