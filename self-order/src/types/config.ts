export interface IConfig {
  menuTheme?: string;
  hideImage?: boolean;
  loginRequired?: boolean;
  textColor?: string;
  backgroundColor?: string;
  buttonText?: string;
  cardBackgroundColor?: string;
  navbarBackgroundColor?: string;
  noCheckout?: boolean;
  hidePrice?: boolean;
  giftOrder?: boolean;
  sitTogether?: boolean;
  bannerSound?: boolean;
  /** With advance payment on, the guest may still send the order unpaid and pay at the cashier */
  cashierPayment?: boolean;
}
