export type AuthEmailEvent = {
  eventId: string;
  userId: string;
  email: string;
  name: string;
  code: string;
};

export type OrderConfirmationEvent = {
  eventId: string;
  orderId: string;
  userId: string;
  email: string;
  total: number;
};

export type CartClearedEvent = {
  eventId: string;
  orderId: string;
  cartSessionId: string;
};

