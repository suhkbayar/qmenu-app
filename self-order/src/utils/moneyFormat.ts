const mformat = (value: number) =>
  new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(value).replace('MNT', '');

export const moneyFormat = (text: number = 0): string => mformat(text);
