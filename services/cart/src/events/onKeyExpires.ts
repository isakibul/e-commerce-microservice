import { REDIS_HOST, REDIS_PORT } from "@/config";
import { clearCart } from "@/services";
import { Redis } from "ioredis";

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

const CHANNEL_KEY = "__keyevent@0__:expired";
redis.config("SET", "notify-keyspace-events", "Ex");
redis.subscribe(CHANNEL_KEY);

redis.on("message", async (ch, message) => {
  if (ch === CHANNEL_KEY && message.startsWith("sessions:")) {
    const cartSessionId = message.replace("sessions:", "");

    try {
      const cleared = await clearCart(cartSessionId);
      if (cleared) {
        console.log(`Released cart inventory for session:${cartSessionId}`);
      }
    } catch (error) {
      console.error(
        `Failed to release cart inventory for session:${cartSessionId}`,
        error,
      );
    }
  }
});
