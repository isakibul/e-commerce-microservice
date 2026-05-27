import amqp from "amqplib";
import {
  ORDER_DLX,
  ORDER_EXCHANGE,
  ORDER_RETRY_EXCHANGE,
  QUEUE_MAX_RETRIES,
  QUEUE_RETRY_DELAY_MS,
  QUEUE_URL,
} from "@/config";
import { clearCart } from "@/services";
import { z } from "zod";

const ClearCartEventSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  cartSessionId: z.string().min(1),
  finalized: z.boolean().default(true),
});

type QueueHandler = (message: string) => Promise<void>;

const retryHeader = "x-retry-count";

const setupQueue = async (
  channel: amqp.Channel,
  queue: string,
  routingKey: string,
) => {
  await channel.assertExchange(ORDER_EXCHANGE, "direct", { durable: true });
  await channel.assertExchange(ORDER_RETRY_EXCHANGE, "direct", {
    durable: true,
  });
  await channel.assertExchange(ORDER_DLX, "direct", { durable: true });

  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, ORDER_EXCHANGE, routingKey);

  await channel.assertQueue(`${queue}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": QUEUE_RETRY_DELAY_MS,
      "x-dead-letter-exchange": ORDER_EXCHANGE,
      "x-dead-letter-routing-key": routingKey,
    },
  });
  await channel.bindQueue(`${queue}.retry`, ORDER_RETRY_EXCHANGE, routingKey);

  await channel.assertQueue(`${queue}.dlq`, { durable: true });
  await channel.bindQueue(`${queue}.dlq`, ORDER_DLX, routingKey);
};

const sendToRetryOrDlq = async (
  channel: amqp.ConfirmChannel,
  msg: amqp.ConsumeMessage,
  routingKey: string,
) => {
  const retryCount = Number(msg.properties.headers?.[retryHeader] || 0);
  const headers = {
    ...msg.properties.headers,
    [retryHeader]: retryCount + 1,
  };

  if (retryCount >= QUEUE_MAX_RETRIES) {
    channel.publish(ORDER_DLX, routingKey, msg.content, {
      contentType: msg.properties.contentType,
      deliveryMode: 2,
      headers,
      messageId: msg.properties.messageId,
      timestamp: Math.floor(Date.now() / 1000),
    });
    await channel.waitForConfirms();
    return;
  }

  channel.publish(ORDER_RETRY_EXCHANGE, routingKey, msg.content, {
    contentType: msg.properties.contentType,
    deliveryMode: 2,
    headers,
    messageId: msg.properties.messageId,
    timestamp: Math.floor(Date.now() / 1000),
  });
  await channel.waitForConfirms();
};

const receiveFromQueue = async (
  queue: string,
  routingKey: string,
  callback: QueueHandler,
) => {
  const connection = await amqp.connect(QUEUE_URL);
  const channel = await connection.createConfirmChannel();

  connection.on("error", (error) => {
    console.error("RabbitMQ connection error", error);
  });
  connection.on("close", () => {
    console.error("RabbitMQ connection closed");
  });

  await setupQueue(channel, queue, routingKey);
  channel.prefetch(10);

  await channel.consume(queue, async (msg) => {
    if (!msg) {
      return;
    }

    try {
      await callback(msg.content.toString());
      channel.ack(msg);
    } catch (error) {
      console.error(`Failed to process RabbitMQ message: ${routingKey}`, error);
      try {
        await sendToRetryOrDlq(channel, msg, routingKey);
        channel.ack(msg);
      } catch (retryError) {
        console.error("Failed to publish retry/DLQ message", retryError);
        channel.nack(msg, false, true);
      }
    }
  });
};

receiveFromQueue(
  "cart.clear.requested",
  "cart.clear.requested",
  async (msg) => {
    const parsedMessage = ClearCartEventSchema.parse(JSON.parse(msg));

    await clearCart(parsedMessage.cartSessionId, {
      releaseInventory: !parsedMessage.finalized,
    });

    console.log(`Cart cleared for order ${parsedMessage.orderId}`);
  },
).catch((error) => {
  console.error("Failed to start cart RabbitMQ consumer", error);
});
