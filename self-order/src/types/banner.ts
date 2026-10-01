export interface IBannerAction {
  id: string;
  text: string;
  url: string;
  icon: string;
  type: BannerActionType;
}

export interface IBanner {
  id: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  system: string;
  type: BannerType;
  image: string;
  actions: IBannerAction[];
}

export enum BannerActionType {
  L = 'L', //Link
}

export enum BannerType {
  T = 'T', //Top
  M = 'M', //Mid
  F = 'F', //Footer
  E = 'E', //End
  P = 'P', //Popup
  A = 'A', //After
  PF = 'PF', //Popup full image
  PQ = 'PQ', //Popup QR Menu
}
