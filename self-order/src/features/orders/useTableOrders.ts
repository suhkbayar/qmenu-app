import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useQuery, useSubscription } from '@apollo/client';
import { TYPE } from '@/src/constants';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { ON_UPDATED_ORDER } from '@/src/graphql/subscriptions';
import { getPayload } from '@/src/providers/auth';
import { IOrder, IOrderItem } from '@/src/types';
import { orderProgress } from './orderStatus';

const FINISHED = ['DELIVERED', 'COMPLETED'];

/** Still owes something: not paid (e.g. the guest chose to pay at the cashier), not cancelled. */
export const isUnpaid = (order: IOrder) =>
  order.paymentState !== 'PAID' && !order.cancelledAt && (order.debtAmount ?? 0) > 0;

/** Another table's order that sent us a gift: listed for the gifted dishes only, and never ours to pay. */
export const isReceivedGift = (order: IOrder, ownTableId?: string) =>
  !!ownTableId && !!order.table?.id && order.table.id !== ownTableId;

// The states the server still takes a new round in (ADDABLE_ORDER_STATES in customer-service)
const ADDABLE = ['NEW', 'ACCEPTED', 'PREPARING', 'PREPARED', 'DELIVERED'];

/**
 * The order a new round goes onto: this table's eat-in order, still open and not paid yet. Once it's
 * paid its eBarimt is issued, and items added after that would never be on one, so a new order starts.
 */
export const findOpenOrder = (orders: IOrder[], ownTableId?: string) =>
  orders.find(
    (order) =>
      !isReceivedGift(order, ownTableId) &&
      order.type === TYPE.DINIG &&
      ADDABLE.includes(order.state) &&
      !order.cancelledAt &&
      order.paymentState !== 'PAID' &&
      !order.vatBillId,
  );

/** An order's items (returned ones left out) in the order they were added, oldest first. */
export const itemsByTime = (items: IOrderItem[]) => {
  const addedAt = (item: IOrderItem) => new Date(item.createdAt ?? 0).getTime();
  return items.filter((item) => item.state !== 'RETURN').sort((a, b) => addedAt(a) - addedAt(b));
};

/**
 * This table's recent orders. Fetched when the menu opens and refetched after ordering or paying,
 * and when the server reports a change (useOrderUpdates). No polling, so 600 tablets don't keep
 * hitting the server. `cacheOnly` reads what's already loaded without asking the server (the
 * screensaver, which comes and goes all the time).
 */
export const useTableOrders = ({ cacheOnly = false }: { cacheOnly?: boolean } = {}) => {
  const { data, loading, refetch } = useQuery(GET_TABLET_ORDERS, {
    variables: { limit: 10 },
    fetchPolicy: cacheOnly ? 'cache-only' : 'cache-and-network',
  });
  const ownTableId = useSessionStore((s) => s.participant?.table?.id);
  const orders: IOrder[] = data?.getTabletOrders ?? [];
  // Gifts from other tables are listed, but don't count towards our badge or bill
  const ours = orders.filter((order) => !isReceivedGift(order, ownTableId));
  const unpaid = ours.filter(isUnpaid);
  // The guests at the table now: what's still being made, or still to pay (a gift to us is never ours
  // to pay). Earlier guests' orders, delivered and paid, aren't theirs to see here.
  const isCurrent = (order: IOrder) =>
    !order.cancelledAt &&
    (!FINISHED.includes(order.state) || (!isReceivedGift(order, ownTableId) && isUnpaid(order)));
  const active = ours.filter(isCurrent);
  // Of our orders not at the table yet, the one furthest behind: what the guests are waiting for
  const coming = active
    .filter((order) => orderProgress(order.state) < 3)
    .sort((a, b) => orderProgress(a.state) - orderProgress(b.state))[0];

  return {
    /** Today's orders at this table, earlier guests' included: the order history */
    orders,
    /** The current guests' orders, gifts to them included: the Захиалсан tab */
    current: orders.filter(isCurrent),
    ownTableId,
    loading,
    refetch,
    /** What's left to pay across this table's own orders */
    due: unpaid.reduce((sum, order) => sum + (order.debtAmount ?? 0), 0),
    /** The order Pay opens: the oldest unpaid one (newest come first), then the next */
    toPay: unpaid.at(-1),
    /** Where the order still on its way is (its state), for the order bar; none once all is served */
    comingState: coming?.state,
    /** Items on our orders still in the kitchen or not yet paid: the order bar shows while there are any */
    activeItems: active.reduce(
      (sum, order) => sum + order.items.reduce((n, item) => (item.state === 'RETURN' ? n : n + item.quantity), 0),
      0,
    ),
  };
};

/**
 * Refreshes this table's orders when the server reports a change to one of them (staff accepted it,
 * closed it, took payment at the till), so the open order and the badge don't outlive the bill. Used
 * once, by the menu screen.
 */
export const useOrderUpdates = () => {
  const apollo = useApolloClient();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getPayload().then((payload) => setCustomerId(payload?.sub ?? null));
    return () => clearTimeout(timer.current);
  }, []);

  useSubscription(ON_UPDATED_ORDER, {
    variables: { customer: customerId },
    skip: !customerId,
    onData() {
      // A burst of changes (accepted, printed, paid) refetches once
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        apollo.refetchQueries({ include: [GET_TABLET_ORDERS] }).catch(() => {});
      }, 1000);
    },
  });
};
