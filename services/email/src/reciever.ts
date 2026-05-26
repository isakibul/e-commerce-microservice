import amqp from "amqplib";
import { prisma } from "./prisma";
import redis from "./redis";
import {
  defaultSender,
  ORDER_DLX,
  ORDER_EXCHANGE,
  ORDER_RETRY_EXCHANGE,
  QUEUE_MAX_RETRIES,
  QUEUE_RETRY_DELAY_MS,
  QUEUE_URL,
  transporter,
} from "./config";
import { z } from "zod";

const OrderConfirmationEventSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  recipient: z.string().email(),
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(10000),
  source: z.string().trim().min(1).max(100),
  sender: z.string().email().optional(),
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
  "email.order_confirmation.requested",
  "email.order_confirmation.requested",
  async (msg) => {
    const parsedMessage = OrderConfirmationEventSchema.parse(JSON.parse(msg));
    const sentKey = `email-event:sent:${parsedMessage.eventId}`;
    const lockKey = `email-event:lock:${parsedMessage.eventId}`;

    if (await redis.get(sentKey)) {
      console.log(`Email event already processed: ${parsedMessage.eventId}`);
      return;
    }

    const lockAcquired = await redis.set(lockKey, "1", "EX", 300, "NX");
    if (!lockAcquired) {
      console.log(`Email event is already processing: ${parsedMessage.eventId}`);
      return;
    }

    try {
      const emailOptions = {
        from: parsedMessage.sender || defaultSender,
        to: parsedMessage.recipient,
        subject: parsedMessage.subject,
        text: parsedMessage.body,
      };

      const info = await transporter.sendMail(emailOptions);

      if (info.rejected.length) {
        throw new Error(`Email rejected: ${info.rejected.join(", ")}`);
      }

      await prisma.email.create({
        data: {
          sender: emailOptions.from,
          recipient: parsedMessage.recipient,
          subject: parsedMessage.subject,
          body: parsedMessage.body,
          source: parsedMessage.source,
          messageId: info.messageId,
          response: info.response,
          acceptedCount: info.accepted.length,
        },
      });

      await redis.set(sentKey, "1", "EX", 60 * 60 * 24 * 30);
      console.log(`Order confirmation email sent for order ${parsedMessage.orderId}`);
    } catch (error) {
      await redis.del(lockKey);
      throw error;
    }
  },
).catch((error) => {
  console.error("Failed to start email RabbitMQ consumer", error);
});
