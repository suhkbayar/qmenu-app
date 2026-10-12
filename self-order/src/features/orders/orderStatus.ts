// An order's kitchen and payment states, as guests read them
export const ORDER_STATE_LABEL: Record<string, string> = {
  NEW: 'Шинэ',
  ACCEPTED: 'Хүлээн авсан',
  PREPARING: 'Бэлтгэж байна',
  PREPARED: 'Бэлэн болсон',
  DELIVERING: 'Хүргэж байна',
  DELIVERED: 'Хүргэгдсэн',
  COMPLETED: 'Дуусгасан',
};

export const PAYMENT_STATE_LABEL: Record<string, string> = {
  PAID: 'Төлсөн',
  PARTIAL: 'Хэсэгчлэн төлсөн',
  UNPAID: 'Төлөгдөөгүй',
};

// Chip colours for an order's kitchen state: waiting, in the kitchen, done
export const ORDER_STATE_TONE: Record<string, string> = {
  NEW: 'bg-surface-secondary text-foreground',
  ACCEPTED: 'bg-surface-secondary text-foreground',
  PREPARING: 'bg-pending-soft text-pending',
  PREPARED: 'bg-pending-soft text-pending',
  DELIVERING: 'bg-pending-soft text-pending',
  DELIVERED: 'bg-positive-soft text-positive',
  COMPLETED: 'bg-positive-soft text-positive',
};

// Chip colours for an order's payment state
export const PAYMENT_STATE_TONE: Record<string, string> = {
  PAID: 'bg-positive-soft text-positive',
  PARTIAL: 'bg-pending-soft text-pending',
  UNPAID: 'bg-danger/15 text-danger',
};

export const NEUTRAL_TONE = 'bg-surface-secondary text-foreground';

// How far along an order is: received, being made, at the table (3: all served)
const PROGRESS: Record<string, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 1,
  PREPARED: 2,
  DELIVERING: 2,
  DELIVERED: 3,
  COMPLETED: 3,
};

export const orderProgress = (state: string) => PROGRESS[state] ?? 0;
