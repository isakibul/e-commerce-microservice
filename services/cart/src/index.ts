import { createApp } from "@/app";
import { PORT, SERVICE_NAME } from "@/config";
import "@/events/onKeyExpires";
import "@/receiver";

const app = createApp();

app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} is running on port ${PORT}`);
});
