export const PAYMENT_TYPE = {
  QPay: 'QPay',
  QPay2: 'QPay2',
  MonPay: 'MonPay',
  SocialPay: 'SocialPay',
  Toki: 'Toki',
  Cash: 'Cash',
  Kart: 'Card',
  Upoint: 'Upoint',
  UPT: 'UPT', //Upoint
  CTE: 'CTE',
  MNQ: 'MNQ',
  UNP: 'UNP',
  GLP: 'GLP',
  MCD: 'MCD',
  XCP: 'XCP',
  MBP: 'MBP',
  MCS: 'MCS', //Card Scanner
  MPY: 'MPY',
  MST: 'MST', //Most Money
};

export const TYPE = {
  DINIG: 'Dining',
  PRE_ORDER: 'PreOrder',
  TAKE_AWAY: 'TakeAway',
  DELIVERY: 'Delivery',
  MOVE: 'Moved',
};

export enum MenuItemState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISABLED = 'DISABLED',
  SOLD_OUT = 'SOLD_OUT',
}

export const qmenuConfigs = [
  {
    name: 'menuTheme',
    value: 'MENU_THEME',
  },
  {
    name: 'hideImage',
    value: 'HIDE_IMAGE',
  },
  {
    name: 'loginRequired',
    value: 'LOGIN_REQUIRED',
  },
  {
    name: 'backgroundColor',
    value: 'BACKGROUND_COLOR',
  },
  {
    name: 'textColor',
    value: 'TEXT_COLOR',
  },
  {
    name: 'buttonText',
    value: 'BUTTON_TEXT',
  },
  {
    name: 'cardBackgroundColor',
    value: 'CARD_BACKGROUND_COLOR',
  },
  {
    name: 'navbarBackgroundColor',
    value: 'NAVBAR_BACKGROUND_COLOR',
  },
  {
    name: 'noCheckout',
    value: 'NO_CHECKOUT',
  },
  {
    name: 'hidePrice',
    value: 'HIDE_PRICE',
  },
  {
    name: 'giftOrder',
    value: 'GIFT_ORDER',
  },
  {
    name: 'sitTogether',
    value: 'SIT_TOGETHER',
  },
];

export const CURRENCY = '₮';

export type StickerTone = 'OPENER' | 'REPLY';

/** A message one table sends another. The id goes to the server; its picture is in social/Sticker. */
export type TableMessageSticker = {
  id: string;
  emoji: string;
  labelKey: string;
  tone: StickerTone;
};

export const TABLE_MESSAGE_STICKERS: TableMessageSticker[] = [
  { id: 'ACQUAINT', emoji: '\u{1F60A}', labelKey: 'sticker_acquaint', tone: 'OPENER' },
  { id: 'FORYOU', emoji: '\u{1F37E}', labelKey: 'sticker_foryou', tone: 'OPENER' },
  { id: 'SMILE', emoji: '\u{1F609}', labelKey: 'sticker_smile', tone: 'OPENER' },
  { id: 'PARTY', emoji: '\u{1F389}', labelKey: 'sticker_party', tone: 'OPENER' },
  { id: 'BIRTHDAY', emoji: '\u{1F382}', labelKey: 'sticker_birthday', tone: 'OPENER' },

  { id: 'THANKS', emoji: '\u{1F970}', labelKey: 'sticker_thanks', tone: 'REPLY' },
  { id: 'LETSMEET', emoji: '\u{1F604}', labelKey: 'sticker_lets_meet', tone: 'REPLY' },
];
