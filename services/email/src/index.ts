import { createLogger } from "@ecommerce/shared";
import { createApp } from "@/app";
import { PORT, SERVICE_NAME } from "@/config";
import "@/receiver";

const app = createApp();
const logger = createLogger(SERVICE_NAME);

app.listen(PORT, () => {
  logger.info("service_started", { port: PORT });
});
