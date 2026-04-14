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

export const ORDER_STATE_COLOR: Record<string, string> = {
  NEW: '#2563eb',
  ACCEPTED: '#2563eb',
  PREPARING: '#d97706',
  PREPARED: '#d97706',
  DELIVERING: '#d97706',
  DELIVERED: '#16a34a',
  COMPLETED: '#16a34a',
};

export const PAYMENT_STATE_COLOR: Record<string, string> = {
  PAID: '#16a34a',
  PARTIAL: '#d97706',
  UNPAID: '#dc2626',
};
