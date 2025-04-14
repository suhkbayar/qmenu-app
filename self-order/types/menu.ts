import { MenuItemState } from '@/constants';
import { BaseEntity } from './base';
import { ITimeTable } from './time-table';

export interface IMenu extends BaseEntity {
  description: string;
  categories: IMenuCategory[];
  type: string;
}

export interface IMenuCategory {
  id: string;
  icon: string;
  name: string;
  sort: number;
  color: string;
  active: boolean;
  children: any;
  products?: IMenuProduct[];
  timetable: ITimeTable;
}

export interface IMenuProduct extends BaseEntity {
  category?: any;
  subCategory?: any;
  description: string;
  type?: string;
  specification: string;
  image: string;
  variants?: IMenuVariant[];
  sort?: number;
  productId: string;
  withNote?: boolean;
  state: MenuItemState;
  bonus: string;
}

export interface IMenuVariant extends BaseEntity {
  price: number;
  uuid?: string;
  name: string;
  salePrice: number;
  discount: number;
  options: IMenuOption[];
  state: MenuItemState;
  calorie: number;
  servings: string[];
  productId: string;
}

export interface IMenuOption extends BaseEntity {
  id: string;
  name: string;
  type: string;
  price: number;
  values: any[];
  state: MenuItemState;
}
