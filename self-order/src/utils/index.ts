import { TableState } from '@/src/constants';
import { IMenuProduct, IOrderItem } from '@/src/types';
import { isEmpty } from 'lodash';
import { Dimensions } from 'react-native';
import moment from 'moment';

export function responsive<T>(mobile: T, tablet?: T): T {
  return Dimensions.get('screen').width < 500 ? mobile : tablet || mobile;
}

export const getTableColor = (state: TableState) => {
  switch (state) {
    case TableState.CALLED:
      return '#ed254e';
    case TableState.FREE:
      return '#8693a2';
    case TableState.NEW:
      return '#38618c';
    case TableState.UNPAID:
      return '#f4a011';
    case TableState.PAID:
      return '#3ab44b';
    default:
      return '#8693a2';
  }
};

export const moneyFormat = (value: number) =>
  new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(value).replace('MNT', '');

export const getHours = (milliseconds: number) => Math.floor(milliseconds / 1000 / 60 / 60);
export const getMinutes = (milliseconds: number) => Math.floor(milliseconds / 1000 / 60) % 60;

export function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}

export const moneyNormalFormat = new Intl.NumberFormat();
export const money = (currency: string) => new Intl.NumberFormat('mn-MN', { style: 'currency', currency });

export const optionCalc = (options: any) => {
  if (isEmpty(options)) return [];
  return options.map((option: any) => option.price).reduce((acc: any, a: any) => acc + a, 0);
};

export const parseConfig = (value: string): any | null => {
  try {
    return value === undefined ? null : JSON.parse(value);
  } catch (error) {
    return value;
  }
};

export function generateUUID() {
  var d = new Date().getTime();
  var d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const isConfigurable = (product: IMenuProduct): boolean => {
  if (!product.variants) return false;
  if (product.variants.length > 1) return true;
  for (const item of product.variants) {
    if (item.options?.length > 0) return true;
  }
  return false;
};

export const calculateOrderItem = (item: IOrderItem) => {
  if (!item) return 0;
  let optionPrices = isEmpty(item.options) ? [] : item.options?.map((option) => option.price);
  const itemTotal = Math.abs((optionPrices?.reduce((a: any, b: any) => a + b, 0) || 0) + item.price) * item.quantity;
  return itemTotal.toLocaleString();
};

export const isCurrentlyOpen = (timetable?: any): boolean => {
  if (!timetable) return true;
  const now = moment();
  const day = now.format('ddd').toLowerCase();
  const isDayActive = timetable?.[day];
  const open = timetable?.[`${day}Open`];
  const close = timetable?.[`${day}Close`];
  if (!isDayActive) return false;
  if (!open || !close) return false;
  const todayStr = now.format('YYYY-MM-DD');
  const openTime = moment(`${todayStr} ${open}`, 'YYYY-MM-DD HH:mm');
  let closeTime = moment(`${todayStr} ${close}`, 'YYYY-MM-DD HH:mm');
  if (closeTime.isBefore(openTime)) closeTime.add(1, 'day');
  return now.isBetween(openTime, closeTime);
};
