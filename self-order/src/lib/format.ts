import { CURRENCY } from '@/src/constants';

/** 12000 → "12,000₮" */
export const formatMoney = (amount: number) => `${Math.round(amount).toLocaleString('en-US')}${CURRENCY}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO date → "19:42" */
export const formatTime = (date: string | Date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** ISO date → "2026-10-02 19:42" */
export const formatDateTime = (date: string | Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${formatTime(d)}`;
};
