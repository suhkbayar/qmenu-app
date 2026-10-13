import { useCallback, useEffect, useState } from 'react';
import { ApolloError, useApolloClient, useMutation } from '@apollo/client';
import { useToast } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { TYPE } from '@/src/constants';
import { useCheckout } from '@/src/features/checkout/checkoutStore';
import { findOpenOrder } from '@/src/features/orders/useTableOrders';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { ADD_ORDER_ITEMS, CREATE_ORDER, GET_PAY_ORDER } from '@/src/graphql/mutations/order';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { findClosedItems } from '@/src/lib/menu';
import { IOrder } from '@/src/types';
import { useCartStore } from './cartStore';
import { useOrderSheet } from './orderSheetStore';

/**
 * Sends the cart. Branches that take payment first (advancePayment): the order is created and the
 * checkout opens. Everywhere else the guest pays at the end, like a tab at the till: after a
 * confirmation the cart goes straight to the kitchen, as a new round on the table's open order when
 * there is one, and the bill is paid from My orders. The cart empties once it's sent, so pressing
 * Order again can't send it twice.
 */
export const usePlaceOrder = () => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const apollo = useApolloClient();
  const participant = useSessionStore((s) => s.participant);
  const giftEnabled = useSessionStore((s) => s.config?.giftOrder === true);
  const items = useCartStore((s) => s.items);
  const giftStickerId = useCartStore((s) => s.giftStickerId);
  const giftAnonymous = useCartStore((s) => s.giftAnonymous);
  const removeItems = useCartStore((s) => s.removeItems);
  const clearGift = useCartStore((s) => s.clearGift);
  const clearCart = useCartStore((s) => s.clear);

  const [serviceType, setServiceType] = useState<string>(TYPE.DINIG);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addingRound, setAddingRound] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const canTakeAway = participant?.services?.includes(TYPE.TAKE_AWAY) ?? false;
  const payLater = !participant?.advancePayment;

  const showError = useCallback((label: string) => toast.show({ variant: 'danger', label }), [toast]);

  // Gift orders switched off for this branch: drop gift state left in the cart
  useEffect(() => {
    if (giftEnabled) return;
    const state = useCartStore.getState();
    if (state.giftTarget || state.items.some((i) => i.giftToTableId)) clearGift();
  }, [giftEnabled, items, clearGift]);

  /**
   * In the kitchen, to be paid later: shows the "sent" screen, with the order panel left open behind
   * it on the table's order. The orders are reloaded first, so the panel goes straight from the cart
   * to the order with the new round in it.
   */
  const sent = useCallback(
    async (orderId: string) => {
      setFinishing(true);
      await apollo.refetchQueries({ include: [GET_TABLET_ORDERS] }).catch(() => {});
      setFinishing(false);
      setConfirmOpen(false);
      useOrderSheet.getState().show('ordered');
      // The order as just reloaded: the "sent" screen opens on it at once
      const orders = apollo.readQuery<{ getTabletOrders: IOrder[] }>({ query: GET_TABLET_ORDERS, variables: { limit: 10 } });
      const order = orders?.getTabletOrders?.find((o) => o.id === orderId);
      useCheckout.getState().open(orderId, { payLater: true, order });
      clearCart();
    },
    [apollo, clearCart],
  );

  // A new order goes to the kitchen unpaid. The receipt is personal until the guest picks another when paying.
  const [sendUnpaid, { loading: sending }] = useMutation(GET_PAY_ORDER, {
    onCompleted(data) {
      if (data?.payOrder) sent(data.payOrder.order.id);
    },
    onError(err) {
      setConfirmOpen(false);
      showError(err.message);
    },
  });

  const [createOrder, { loading: creating }] = useMutation(CREATE_ORDER, {
    onCompleted(data) {
      const orderId = data.createOrder.id;
      if (payLater) {
        sendUnpaid({
          variables: { input: { order: orderId, confirm: true, payment: '', vatType: participant?.vat ? 1 : 0 } },
        });
      } else {
        // Paid first: checkout opens over the sheet, which then shows the order on Захиалсан
        useOrderSheet.getState().show('ordered');
        useCheckout.getState().open(orderId, { order: data.createOrder });
        clearCart();
      }
    },
    onError(err) {
      setConfirmOpen(false);
      showError(err.message || t('mainPage.orderCreationFailed'));
    },
  });

  const [addOrderItems] = useMutation(ADD_ORDER_ITEMS);

  /**
   * Adds the cart to the table's open order. Returns false when there's no open order or the server
   * turned the round down (staff closed the order meanwhile), so a new order starts instead.
   */
  const addRound = async (lines: object[]) => {
    const { data } = await apollo.query({
      query: GET_TABLET_ORDERS,
      variables: { limit: 10 },
      fetchPolicy: 'network-only',
    });
    const open = findOpenOrder((data?.getTabletOrders ?? []) as IOrder[], participant?.table?.id);
    if (!open?.id) return false;

    let orderId: string;
    try {
      const result = await addOrderItems({ variables: { participant: participant?.id, id: open.id, items: lines } });
      orderId = result.data.addOrderItems.id;
    } catch (err) {
      // No answer at all: the round may have gone through, so don't risk sending it twice
      const answered = err instanceof ApolloError && (err.graphQLErrors.length > 0 || 'statusCode' in (err.networkError ?? {}));
      if (!answered) throw err;
      return false;
    }
    await sent(orderId);
    return true;
  };

  /** Sends the order now (after the confirmation, or straight away when paying first). */
  const submit = useCallback(async () => {
    const hasGift = giftEnabled && items.some((i) => i.giftToTableId);
    const lines = items.map(({ id, quantity, comment, options, giftToTableId }) => ({
      id,
      quantity,
      comment,
      options: options?.map(({ id, value }) => ({ id, value })) ?? [],
      ...(giftEnabled && giftToTableId
        ? { giftToTableId, giftStickerId: giftStickerId || undefined, giftAnonymous: giftAnonymous || undefined }
        : {}),
    }));

    // Rounds are eat-in and carry no gifts; a take-away or a gift is an order of its own
    if (payLater && serviceType === TYPE.DINIG && !hasGift) {
      setAddingRound(true);
      try {
        if (await addRound(lines)) return;
      } catch (err) {
        setConfirmOpen(false);
        return showError((err as Error).message || t('mainPage.orderCreationFailed'));
      } finally {
        setAddingRound(false);
      }
    }

    createOrder({
      variables: {
        participant: participant?.id,
        input: {
          type: serviceType,
          deliveryDate: '',
          contact: '',
          address: '',
          name: '',
          comment: '',
          guests: 1,
          items: lines,
        },
      },
    });
  }, [createOrder, participant, serviceType, items, giftEnabled, giftStickerId, giftAnonymous, payLater]);

  /** The "Order" button: drops dishes that just became unavailable, then confirms or submits. */
  const placeOrder = useCallback(() => {
    if (!items.length || !participant) return;

    const closed = findClosedItems(items, participant.menu?.categories);
    if (closed.length) {
      removeItems(closed.map((i) => i.uuid));
      showError(t('mainPage.closedItemsRemoved', { items: closed.map((i) => i.name).join(', ') }));
      return;
    }

    if (payLater) setConfirmOpen(true);
    else submit();
  }, [items, participant, payLater, removeItems, showError, submit, t]);

  return {
    placeOrder,
    submit,
    loading: creating || sending || addingRound || finishing,
    confirmOpen,
    setConfirmOpen,
    serviceType,
    setServiceType,
    canTakeAway,
  };
};
