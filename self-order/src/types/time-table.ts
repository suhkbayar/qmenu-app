export interface ITimeTable {
  fri: boolean;
  friClose: string;
  friOpen: string;
  mon: boolean;
  monClose: string;
  monOpen: string;
  sat: boolean;
  satClose: string;
  satOpen: string;
  sun: boolean;
  sunClose: string;
  sunOpen: string;
  thu: boolean;
  thuClose: string;
  thuOpen: string;
  tue: boolean;
  tueClose: string;
  tueOpen: string;
  wed: boolean;
  wedClose: string;
  wedOpen: string;
}

export interface IOpenOrClose {
  key: string;
  name: string;
  count: number;
  field: string;
}

export interface IFilterRestaurantTypes {
  key: string;
  field: string;
  count: number;
}

export interface IFilterDeliveryType {
  key: string;
  name: string;
  field: string;
  count: number;
}
