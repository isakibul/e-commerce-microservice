import { DEFAULT_EMAIL_SENDER } from "@/config";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { transporter } from "@/lib/mailer";
import { EmailCreateInput, EmailEvent } from "@/schemas";

type SendEmailOptions = EmailCreateInput & {
  senderOverrideAllowed?: boolean;
};

const SENT_EVENT_TTL_SECONDS = 60 * 60 * 24 * 30;
const EVENT_LOCK_TTL_SECONDS = 300;

const persistEmail = async (
  input: EmailCreateInput,
  sender: string,
  info: Awaited<ReturnType<typeof transporter.sendMail>>,
) => {
  await prisma.email.create({
    data: {
      sender,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      source: input.source,
      messageId: info.messageId,
      response: info.response,
      acceptedCount: info.accepted.length,
    },
  });
};

export const sendEmailMessage = async ({
  senderOverrideAllowed = false,
  ...input
}: SendEmailOptions) => {
  const from =
    input.sender && senderOverrideAllowed ? input.sender : DEFAULT_EMAIL_SENDER;

  const info = await transporter.sendMail({
    from,
    to: input.recipient,
    subject: input.subject,
    text: input.body,
  });

  if (info.rejected.length) {
    throw new Error(`Email rejected: ${info.rejected.join(", ")}`);
  }

  await persistEmail(input, from, info);

  return {
    messageId: info.messageId,
  };
};

export const sendEmailFromEvent = async (event: EmailEvent) => {
  const sentKey = `email-event:sent:${event.eventId}`;
  const lockKey = `email-event:lock:${event.eventId}`;

  if (await redis.get(sentKey)) {
    console.log(`Email event already processed: ${event.eventId}`);
    return;
  }

  const lockAcquired = await redis.set(
    lockKey,
    "1",
    "EX",
    EVENT_LOCK_TTL_SECONDS,
    "NX",
  );
  if (!lockAcquired) {
    console.log(`Email event is already processing: ${event.eventId}`);
    return;
  }

  try {
    await sendEmailMessage(event);
    await redis.set(sentKey, "1", "EX", SENT_EVENT_TTL_SECONDS);
  } catch (error) {
    await redis.del(lockKey);
    throw error;
  }
};

export const listEmails = async ({
  page,
  limit,
  recipient,
  source,
}: {
  page: number;
  limit: number;
  recipient?: string;
  source?: string;
}) => {
  const where = {
    ...(recipient ? { recipient } : {}),
    ...(source ? { source } : {}),
  };

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      orderBy: {
        sentAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.email.count({ where }),
  ]);

  return {
    emails,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
