import amqp from "amqplib";
import { EMAIL_EXCHANGE, QUEUE_URL } from "@/config";

let connection: amqp.ChannelModel | null = null;
let channel: amqp.ConfirmChannel | null = null;

export const EMAIL_ROUTING_KEYS = {
  VERIFICATION_REQUESTED: "email.verification.requested",
  VERIFICATION_SUCCESS_REQUESTED: "email.verification_success.requested",
} as const;

const EMAIL_QUEUES = [
  EMAIL_ROUTING_KEYS.VERIFICATION_REQUESTED,
  EMAIL_ROUTING_KEYS.VERIFICATION_SUCCESS_REQUESTED,
] as const;

const getChannel = async () => {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(QUEUE_URL);
  connection.on("error", (error) => {
    console.error("RabbitMQ connection error", error);
  });
  connection.on("close", () => {
    connection = null;
    channel = null;
  });

  channel = await connection.createConfirmChannel();
  channel.on("error", (error) => {
    console.error("RabbitMQ channel error", error);
  });
  channel.on("close", () => {
    channel = null;
  });

  await channel.assertExchange(EMAIL_EXCHANGE, "direct", { durable: true });
  await Promise.all(
    EMAIL_QUEUES.map(async (queue) => {
      await channel?.assertQueue(queue, { durable: true });
      await channel?.bindQueue(queue, EMAIL_EXCHANGE, queue);
    }),
  );

  return channel;
};

const publishEmailEvent = async <T>(routingKey: string, payload: T) => {
  const activeChannel = await getChannel();
  const message = Buffer.from(JSON.stringify(payload));

  activeChannel.publish(EMAIL_EXCHANGE, routingKey, message, {
    contentType: "application/json",
    deliveryMode: 2,
    messageId:
      typeof payload === "object" && payload && "eventId" in payload
        ? String(payload.eventId)
        : undefined,
    timestamp: Math.floor(Date.now() / 1000),
  });

  await activeChannel.waitForConfirms();
  console.log(`Published RabbitMQ email event: ${routingKey}`);
};

export const closeQueue = async () => {
  await channel?.close().catch(() => undefined);
  await connection?.close().catch(() => undefined);
  channel = null;
  connection = null;
};

export default publishEmailEvent;
