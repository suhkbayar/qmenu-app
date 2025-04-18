import { ICustomerOrder } from '@/types';

export const TIME_FORMAT = 'HH:mm';
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
export const TOKEN = 'TOKEN';
export const CALLBACK = 'CALLBACK';
export const SEAT_DURATION = 30;

export enum SessionType {
  M = 'M', // Merchant Phone
}

export enum SystemType {
  C = 'C', //Customer
  M = 'M', //Merchant
  A = 'A', //Administrator
  S = 'S', //System
  T = 'T', //Toki
  B = 'B', //Buyer
  P = 'P', //Partner
}

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
};

export const TYPE = {
  DINIG: 'Dining',
  PRE_ORDER: 'PreOrder',
  TAKE_AWAY: 'TakeAway',
  DELIVERY: 'Delivery',
  MOVE: 'Moved',
};

export enum PaymentType {
  Cash = 'Cash',
  Card = 'Card',
  QPay = 'QPay',
  QPay2 = 'QPay2',
  MonPay = 'MonPay',
  SocialPay = 'SocialPay',
  Toki = 'Toki',
  Account = 'Account',
  Invoice = 'Invoice',
  Upoint = 'Upoint', //UPT

  UPT = 'UPT', //U-Point
  CSH = 'CSH', //Cash
  CRD = 'CRD', //Card
  GLP = 'GLP', //GLMTPOS
  QPY = 'QPY', //QPay
  QP2 = 'QP2', //QPay v2
  MNP = 'MNP', //MonPay
  MNQ = 'MNQ', //MonPay QR
  SLP = 'SLP', //SocialPay
  TKI = 'TKI', //Toki
  TKL = 'TKL', //Toki lunch
  TKP = 'TKP', //Toki promo
  CUP = 'CUP', //Coupon
  VCR = 'VCR', //Voucher
  GFT = 'GFT', //Gift Card
  LOY = 'LOY', //Loyalty
  CTE = 'CTE', //Canteen employee
  MBK = 'MBK', //M-Bank
  UNP = 'UNP', //UnionPay
  UBE = 'UBE', //UBEats
  HRC = 'HRC', //Horeca
}

export enum WidgetType {
  LINE = 'LineChart',
  AREA = 'AreaChart',
  BAR = 'BarChart',
  PIE = 'PieChart',
  DATA_TABLE = 'DataTable',
  NUMBER = 'Number',
  PERCENT = 'Percent',
  STATISTIC = 'Statistic',
}

export const PATTERN_ONLY_NUMBER = /^[0-9]*$/;

export enum BranchType {
  Restaurant = 'Restaurant',
  Canteen = 'Canteen',
  Pub = 'Pub',
  Caffee = 'Caffee',
  Club = 'Club',
  CoffeeShop = 'CoffeeShop',
  Karaoke = 'Karaoke',
  Hotel = 'Hotel',
  Resort = 'Resort',
  Supplier = 'Supplier',
  Other = 'Other',
}

export enum ChannelType {
  P = 'P', //Point of Sale
  Q = 'Q', //QR Menu
  W = 'W', //Web
  K = 'K', //Kiosk
  T = 'T', //Toki
  F = 'F', //Facebook
  G = 'G', //Google
  C = 'C', //FB Chat
  M = 'M', //Monpay
  I = 'I', //API
  U = 'U', //UbEats
  MB = 'MB', //MBank
  MR = 'MR', //Marketplace
  QM = 'QM', //Qmenu
}

export enum LoyaltyState {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
}

export enum OrderItemState {
  DRAFT = 'DRAFT',
  NEW = 'NEW',
  ACCEPTED = 'ACCEPTED',
  COOKING = 'COOKING',
  READY = 'READY',
  PICKEDUP = 'PICKEDUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RETURN = 'RETURN',
  PREPARING = 'PREPARING',
  PREPARED = 'PREPARED',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  MOVED = 'MOVED',
  MERGED = 'MERGED',
  REMOVED = 'REMOVED',
}

export const ACTIVE_STATES = [
  OrderItemState.DRAFT,
  OrderItemState.NEW,
  OrderItemState.ACCEPTED,
  OrderItemState.PREPARING,
  OrderItemState.PREPARED,
  OrderItemState.DELIVERING,
  OrderItemState.DELIVERED,
];

export enum OrderType {
  Dining = 'Dining',
  PreOrder = 'PreOrder',
  TakeAway = 'TakeAway',
  Delivery = 'Delivery',
  TableOrder = 'TableOrder',
  Lunch = 'Lunch',
}

export enum OrderState {
  DRAFT = 'DRAFT',
  NEW = 'NEW',
  BOOKED = 'BOOKED',
  MOVED = 'MOVED', //
  RETURNED = 'RETURNED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  PROCESSING = 'PROCESSING', //
  READY = 'READY', //
  PREPARED = 'PREPARED',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  PICKEDUP = 'PICKEDUP', //
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  MERGED = 'MERGED',
  CORRECTION = 'CORRECTION',
  REMOVED = 'REMOVED',
  DECLINED = 'DECLINED',
}

export enum BranchConfig {
  NOTIFICATION_KITCHEN = 'NOTIFICATION_KITCHEN',
  SEAT_DURATION_CONFIG = 'SEAT_DURATION_CONFIG',
}

export enum PaymentState {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export enum TransactionState {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  RETURN = 'RETURN',
  CANCELLED = 'CANCELLED',
}

export enum TableState {
  FREE = 'FREE',
  NEW = 'NEW',
  CALLED = 'CALLED',
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export enum TaskState {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MenuItemState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SOLD_OUT = 'SOLD_OUT',
}

export const PATTERN_TERMINAL_CODE = /^[\d]{8}$/;
export const PATTERN_PIN_CODE = /^[\d]{4}$/;

export const PATTERN_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
export const PATTERN_COMPANY_REGISTER = /^[\d]{7}$/;
export const PATTERN_ACCOUNT_NUMBER = /^[\d]{20}$/;
export const PATTERN = /^[-]?[0-9]{6,20}?$/;

export const ORDER_ACTIVE_STATES = [
  OrderState.NEW,
  OrderState.ACCEPTED,
  OrderState.PREPARING,
  OrderState.PREPARED,
  OrderState.DELIVERING,
  OrderState.DELIVERED,
];

export const ORDER_INACTIVE_STATES = [
  OrderState.DRAFT,
  OrderState.CANCELLED,
  OrderState.RETURNED,
  OrderState.MOVED,
  OrderState.MERGED,
  OrderState.REMOVED,
];

export const ORDER_REMOVED_STATES = [OrderState.REMOVED, OrderState.MERGED, OrderState.DRAFT];

export const ORDER_COMPLETED_STATES = [OrderState.COMPLETED, ...ORDER_INACTIVE_STATES];

export const TABLE_ORDER_ACTIVE_STATES = [
  ...ORDER_ACTIVE_STATES.filter((e) => e !== OrderState.NEW),
  OrderState.BOOKED,
];

export enum RequestActionType {
  CSR = 'CSR', // CREATE_REPORT_REQUEST
}

export const INACTIVE_STATES = [
  OrderItemState.CANCELLED,
  OrderItemState.RETURN,
  OrderItemState.MOVED,
  OrderItemState.MERGED,
  OrderItemState.REMOVED,
];

export const ACCEPTED_STATES = [
  OrderItemState.ACCEPTED,
  OrderItemState.PREPARING,
  OrderItemState.PREPARED,
  OrderItemState.DELIVERING,
  OrderItemState.DELIVERED,
  OrderItemState.COMPLETED,
];

export const COMPLETED_STATES = [OrderItemState.COMPLETED, ...INACTIVE_STATES];

export const PaymentTypes = [
  { name: 'Бэлэн', value: PaymentType.Cash },
  { name: 'Карт', value: PaymentType.Card },
  { name: 'QPay', value: PaymentType.QPay },
  { name: 'Монпэй', value: PaymentType.MonPay },
  { name: 'Social Pay', value: PaymentType.SocialPay },
  { name: 'Toki', value: PaymentType.Toki },
  { name: 'Данс', value: PaymentType.Account },
  { name: 'QPay v2', value: PaymentType.QPay2 },
  { name: 'Нэхэмжлэл', value: PaymentType.Invoice },
  { name: 'U-Point', value: PaymentType.UPT },
  { name: 'Бэлэн', value: PaymentType.CSH },
  { name: 'Карт', value: PaymentType.CRD },
  { name: 'Голомт Пос', value: PaymentType.GLP },
  { name: 'QPay', value: PaymentType.QPY },
  { name: 'QPay v2', value: PaymentType.QP2 },
  { name: 'Монпэй', value: PaymentType.MNP },
  { name: 'MonPay QR', value: PaymentType.MNQ },
  { name: 'Social Pay', value: PaymentType.SLP },
  { name: 'Toki', value: PaymentType.TKI },
  { name: 'Toki Lunch', value: PaymentType.TKL },
  { name: 'Toki Promo', value: PaymentType.TKP },
  { name: 'Купон', value: PaymentType.CUP },
  { name: 'Ваучер', value: PaymentType.VCR },
  { name: 'Gift Card', value: PaymentType.GFT },
  { name: 'Loyalty', value: PaymentType.LOY },
  { name: 'Canteen employee', value: PaymentType.CTE },
  { name: 'M-Bank', value: PaymentType.MBK },
  { name: 'Union Pay', value: PaymentType.UNP },
  { name: 'UB Eats', value: PaymentType.UBE },
];

export const ChannelTypesArr = [
  { value: ChannelType.P, name: 'Касс' },
  { value: ChannelType.Q, name: 'QR menu' },
  { value: ChannelType.W, name: 'Web' },
  { value: ChannelType.K, name: 'Киоск' },
  { value: ChannelType.T, name: 'Токи' },
  { value: ChannelType.F, name: 'Facebook' },
  { value: ChannelType.G, name: 'Gastro' },
  { value: ChannelType.C, name: 'FB Chat' },
  { value: ChannelType.M, name: 'Monpay' },
  { value: ChannelType.U, name: 'UBEats' },
  { value: ChannelType.I, name: 'API' },
  { nvalue: ChannelType.MR, name: 'Market' },
  { nvalue: ChannelType.MB, name: 'M Bank' },
  { nvalue: ChannelType.QM, name: 'Qmenu' },
];

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
];

export const emptyOrder: ICustomerOrder = {
  items: [],
  totalAmount: 0,
  totalQuantity: 0,
  grandTotal: 0,
  state: '',
};

export const CURRENCY = '₮';

export const validPrefixes = [
  'А',
  'Б',
  'В',
  'Г',
  'Д',
  'Е',
  'Ё',
  'Ж',
  'З',
  'И',
  'Й',
  'К',
  'Л',
  'М',
  'Н',
  'О',
  'Ө',
  'Р',
  'С',
  'Т',
  'У',
  'Ү',
  'Ф',
  'Х',
  'Ц',
  'Ч',
  'Ш',
  'Ъ',
  'Ы',
  'Ь',
  'Э',
  'Ю',
  'Я',
];
