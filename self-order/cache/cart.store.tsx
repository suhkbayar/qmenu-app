import create from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import { IParticipant } from '../types/participant';
import { ICustomerOrder, IOrderItem } from '../types/order';
import { IMenuVariant } from '../types/menu';
import { isEmpty } from 'lodash';
import { IConfig } from '../types';
import { generateUUID, parseConfig } from '../utils';
import { IUser } from '@/types/user';
import { qmenuConfigs } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage: StateStorage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

interface ICallStore {
  order: ICustomerOrder | null;
  config: IConfig | null;
  user: IUser | null;
  setUser: (user: IUser) => void;
  participant: IParticipant | null;
  calculate: () => void;
  removeOrderItem: (uuid: string) => void;
  addOrderItemComment: (item: IOrderItem, comment: string) => void;
  addOrderItem: (item: IOrderItem) => void;
  addOrderItemOptional: (item: IOrderItem) => void;
  add: (variant: IMenuVariant, productId?: string) => void;
  remove: (variant: IMenuVariant) => void;
  load: (order: ICustomerOrder) => void;
  setParticipant: (participant: IParticipant) => void;
}

export const useCallStore = create<ICallStore>(
  persist(
    (set, get) => ({
      order: null,
      user: null,
      config: null,
      participant: null,
      calculate: () => {
        const order = get().order;
        let totalAmount = 0;
        let totalQuantity = 0;
        if (!order) return;
        for (let item of order?.items) {
          let optionPrices = isEmpty(item.options) ? [] : item.options?.map((option) => option.price);
          if (item.state !== 'RETURN') {
            const itemTotal =
              Math.abs((optionPrices?.reduce((a: any, b: any) => a + b, 0) || 0) + item.price) * item.quantity;
            totalAmount += itemTotal;
            totalQuantity += item.quantity;
          }
        }

        set((state) => ({
          order: {
            ...state.order!,
            items: state.order!.items, // ensure items is present
            totalAmount,
            grandTotal: totalAmount,
            totalQuantity,
          },
        }));
      },
      setUser: (user) => {
        set({ user: user });
      },
      addOrderItem: (orderItem) => {
        const currentOrder = get().order;
        if (!currentOrder) return;

        const index = currentOrder.items.findIndex((item) => item.state === 'DRAFT' && item.id === orderItem.id);

        if (index > -1) {
          set((state) => ({
            order: {
              ...state.order!,
              items: state.order!.items.map((item) =>
                item.state === 'DRAFT' && item.id === orderItem.id ? { ...item, quantity: item.quantity + 1 } : item,
              ),
              totalAmount: state.order!.totalAmount ?? 0,
              grandTotal: state.order!.grandTotal ?? 0,
              totalQuantity: state.order!.totalQuantity ?? 0,
              state: state.order!.state ?? 'DRAFT',
            },
          }));
        } else {
          set((state) => ({
            order: {
              ...state.order!,
              items: [...state.order!.items, orderItem],
              totalAmount: state.order!.totalAmount ?? 0,
              grandTotal: state.order!.grandTotal ?? 0,
              totalQuantity: state.order!.totalQuantity ?? 0,
              state: state.order!.state ?? 'DRAFT',
            },
          }));
        }

        get().calculate();
      },

      addOrderItemComment: (item, comment) => {
        const currentOrder = get().order;
        if (!currentOrder) return;

        const index = currentOrder.items.findIndex((orderItem) => orderItem.id === item.id);

        if (index > -1) {
          set((state) => ({
            order: {
              ...state.order!,
              items: state.order!.items.map((orderItem, i) => (i === index ? { ...orderItem, comment } : orderItem)),
              totalAmount: state.order!.totalAmount ?? 0,
              grandTotal: state.order!.grandTotal ?? 0,
              totalQuantity: state.order!.totalQuantity ?? 0,
              state: state.order!.state ?? 'DRAFT',
            },
          }));
        }

        get().calculate();
      },

      addOrderItemOptional: (orderItem) => {
        const order = get().order;
        if (!order) return;

        set((state) => ({
          order: {
            ...state.order!,
            items: [...state.order!.items, orderItem],
            totalAmount: state.order!.totalAmount ?? 0,
            grandTotal: state.order!.grandTotal ?? 0,
            totalQuantity: state.order!.totalQuantity ?? 0,
            state: state.order!.state ?? 'DRAFT',
          },
        }));

        get().calculate();
      },
      load: (order) => set({ order }),
      add: (variant: IMenuVariant, productId?: string) => {
        const order = get().order;
        if (!order || order.state === 'COMPLETED') return;

        const index = order.items.findIndex((item) => item.state === 'DRAFT' && item.id === variant.id);

        if (index > -1) {
          // Increment quantity
          set((state) => ({
            order: {
              ...state.order!,
              items: state.order!.items.map((item) =>
                item.state === 'DRAFT' && item.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item,
              ),
              totalAmount: state.order!.totalAmount ?? 0,
              grandTotal: state.order!.grandTotal ?? 0,
              totalQuantity: state.order!.totalQuantity ?? 0,
              state: state.order!.state ?? 'DRAFT',
            },
          }));
        } else {
          // Add new item
          const item: IOrderItem = {
            id: variant.id,
            uuid: generateUUID(),
            productId: productId ?? '',
            name: variant.name,
            reason: '',
            state: 'DRAFT',
            quantity: 1,
            options: isEmpty(variant.options) ? [] : variant.options,
            price: variant.salePrice,
            discount: 0,
            image: '',
          };

          set((state) => ({
            order: {
              ...state.order!,
              items: [...state.order!.items, item],
              totalAmount: state.order!.totalAmount ?? 0,
              grandTotal: state.order!.grandTotal ?? 0,
              totalQuantity: state.order!.totalQuantity ?? 0,
              state: state.order!.state ?? 'DRAFT',
            },
          }));
        }

        get().calculate();
      },
      removeOrderItem: (uuid: string) => {
        const order = get().order;
        if (!order) return;

        const updatedItems = order.items.filter((item) => item.uuid !== uuid);

        set((state) => ({
          order: {
            ...state.order!,
            items: updatedItems,
            totalAmount: state.order!.totalAmount ?? 0,
            grandTotal: state.order!.grandTotal ?? 0,
            totalQuantity: state.order!.totalQuantity ?? 0,
            state: state.order!.state ?? 'DRAFT',
          },
        }));

        get().calculate();
      },
      remove: (variant: IMenuVariant) => {
        const order = get().order;
        if (!order) return;

        const updatedItems = order.items
          .map((item) => {
            if (item.productId === variant.productId) {
              return { ...item, quantity: item.quantity - 1 };
            }
            return item;
          })
          .filter((item) => item.quantity > 0);

        set((state) => ({
          order: {
            ...state.order!,
            items: updatedItems,
            totalAmount: state.order!.totalAmount ?? 0,
            grandTotal: state.order!.grandTotal ?? 0,
            totalQuantity: state.order!.totalQuantity ?? 0,
            state: state.order!.state ?? 'DRAFT',
          },
        }));

        get().calculate();
      },
      setParticipant: (participant) => {
        const mappedConfigs: Record<string, any> = (participant.configs || []).reduce((acc, config) => {
          const matchedQMenuConfig = qmenuConfigs.find((qconfig) => qconfig.value === config.name);
          if (matchedQMenuConfig) {
            acc[matchedQMenuConfig.name] = parseConfig(config.value);
          }
          return acc;
        }, {} as Record<string, any>);

        set({ config: { ...mappedConfigs } });
        set({ participant });
      },
    }),
    {
      name: 'call-storage-array',
      getStorage: () => storage,
    },
  ),
);
