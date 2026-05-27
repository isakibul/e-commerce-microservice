import amqp from "amqplib";
import { ORDER_EXCHANGE, QUEUE_URL } from "@/config";

let connection: amqp.ChannelModel | null = null;
let channel: amqp.ConfirmChannel | null = null;

export const ORDER_ROUTING_KEYS = {
  SEND_EMAIL: "email.order_confirmation.requested",
  CLEAR_CART: "cart.clear.requested",
} as const;

const ORDER_QUEUES = [
  ORDER_ROUTING_KEYS.SEND_EMAIL,
  ORDER_ROUTING_KEYS.CLEAR_CART,
] as const;

export const assertQueueConnection = async () => {
  const activeConnection = await amqp.connect(QUEUE_URL);
  await activeConnection.close();
};

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

  await channel.assertExchange(ORDER_EXCHANGE, "direct", { durable: true });
  await Promise.all(
    ORDER_QUEUES.map(async (queue) => {
      await channel?.assertQueue(queue, { durable: true });
      await channel?.bindQueue(queue, ORDER_EXCHANGE, queue);
    }),
  );

  return channel;
};

const publishOrderEvent = async <T>(routingKey: string, payload: T) => {
  const activeChannel = await getChannel();
  const message = Buffer.from(JSON.stringify(payload));

  activeChannel.publish(ORDER_EXCHANGE, routingKey, message, {
    contentType: "application/json",
    deliveryMode: 2,
    messageId:
      typeof payload === "object" && payload && "eventId" in payload
        ? String(payload.eventId)
        : undefined,
    timestamp: Math.floor(Date.now() / 1000),
  });

  await activeChannel.waitForConfirms();
  console.log(`Published RabbitMQ event: ${routingKey}`);
};

export const closeQueue = async () => {
  await channel?.close().catch(() => undefined);
  await connection?.close().catch(() => undefined);
  channel = null;
  connection = null;
};

export default publishOrderEvent;
