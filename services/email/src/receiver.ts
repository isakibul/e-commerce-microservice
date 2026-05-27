import { EMAIL_EXCHANGE, ORDER_EXCHANGE } from "@/config";
import { receiveFromQueue } from "@/lib/rabbitmq";
import {
  AuthEmailEventSchema,
  OrderConfirmationEventSchema,
} from "@/schemas";
import { sendEmailFromEvent } from "@/services/email.service";

receiveFromQueue(
  "email.order_confirmation.requested",
  "email.order_confirmation.requested",
  ORDER_EXCHANGE,
  async (msg) => {
    const parsedMessage = OrderConfirmationEventSchema.parse(JSON.parse(msg));
    await sendEmailFromEvent(parsedMessage);
    console.log(`Order confirmation email sent for order ${parsedMessage.orderId}`);
  },
).catch((error) => {
  console.error("Failed to start email RabbitMQ consumer", error);
});

receiveFromQueue(
  "email.verification.requested",
  "email.verification.requested",
  EMAIL_EXCHANGE,
  async (msg) => {
    const parsedMessage = AuthEmailEventSchema.parse(JSON.parse(msg));
    await sendEmailFromEvent(parsedMessage);
    console.log(`Verification email sent for user ${parsedMessage.userId}`);
  },
).catch((error) => {
  console.error("Failed to start verification email RabbitMQ consumer", error);
});

receiveFromQueue(
  "email.verification_success.requested",
  "email.verification_success.requested",
  EMAIL_EXCHANGE,
  async (msg) => {
    const parsedMessage = AuthEmailEventSchema.parse(JSON.parse(msg));
    await sendEmailFromEvent(parsedMessage);
    console.log(`Verification success email sent for user ${parsedMessage.userId}`);
  },
).catch((error) => {
  console.error(
    "Failed to start verification success email RabbitMQ consumer",
    error,
  );
});
