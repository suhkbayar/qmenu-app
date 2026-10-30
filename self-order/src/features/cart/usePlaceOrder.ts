import { useCallback, useEffect, useRef, useState } from 'react';
import { ApolloError, useApolloClient, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { TYPE } from '@/src/constants';
import { useCheckout } from '@/src/features/checkout/checkoutStore';
import { findOpenOrder } from '@/src/features/orders/useTableOrders';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { ADD_ORDER_ITEMS, CREATE_ORDER, GET_PAY_ORDER } from '@/src/graphql/mutations/order';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { findClosedItems } from '@/src/lib/menu';
import { IOrder } from '@/src/types';
import { useNotify } from '@/src/ui/useNotify';
import { useCartStore } from './cartStore';
import { useOrderSheet } from './orderSheetStore';

/**
 * Sends the cart. Branches that take payment first (advancePayment): the order is created and the
 * checkout opens. Everywhere else the guest pays at the end, like a tab at the till: Order sends the
 * cart straight to the kitchen, as a new round on the table's open order when there is one, and the
 * bill is paid from the order panel. The cart empties once it's sent, so pressing Order again can't
 * send it twice.
 */
export const usePlaceOrder = () => {
  const { t } = useTranslation('language');
  const notify = useNotify();
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
  const [addingRound, setAddingRound] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // With no confirmation step, a second tap before the button shows it's sending mustn't send the
  // cart twice: taps are ignored from the first one until sending is over
  const busy = useRef(false);
  const canTakeAway = participant?.services?.includes(TYPE.TAKE_AWAY) ?? false;
  const payLater = !participant?.advancePayment;

  const showError = useCallback((label: string) => notify('danger', label), [notify]);

  // Gift orders switched off for this branch: drop gift state left in the cart
  useEffect(() => {
    if (giftEnabled) return;
    const state = useCartStore.getState();
    if (state.giftTarget || state.items.some((i) => i.giftToTableId)) clearGift();
  }, [giftEnabled, items, clearGift]);

  /**
   * In the kitchen, to be paid later: no page of its own (that's for after paying, with the receipt).
   * The orders are reloaded first, so in the order panel the dishes go straight from the new ones at
   * the top to the order below, as the new ones clear.
   */
  const sent = useCallback(async () => {
    setFinishing(true);
    await apollo.refetchQueries({ include: [GET_TABLET_ORDERS] }).catch(() => {});
    setFinishing(false);
    clearCart();
    notify('success', t('mainPage.orderSent'));
  }, [apollo, clearCart, notify, t]);

  // A new order goes to the kitchen unpaid. The receipt is personal until the guest picks another when paying.
  const [sendUnpaid, { loading: sending }] = useMutation(GET_PAY_ORDER, {
    onCompleted(data) {
      if (data?.payOrder) sent();
    },
    onError(err) {
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
        // Paid first: checkout opens over the sheet, which then shows the order under Захиалсан
        useOrderSheet.getState().show();
        useCheckout.getState().open(orderId, { order: data.createOrder });
        clearCart();
      }
    },
    onError(err) {
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

    try {
      await addOrderItems({ variables: { participant: participant?.id, id: open.id, items: lines } });
    } catch (err) {
      // No answer at all: the round may have gone through, so don't risk sending it twice
      const answered = err instanceof ApolloError && (err.graphQLErrors.length > 0 || 'statusCode' in (err.networkError ?? {}));
      if (!answered) throw err;
      return false;
    }
    await sent();
    return true;
  };

  /** Sends the order. */
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

  /** The "Order" button: drops dishes that just became unavailable, then sends, no confirmation. */
  const placeOrder = useCallback(() => {
    if (!items.length || !participant || busy.current) return;

    const closed = findClosedItems(items, participant.menu?.categories);
    if (closed.length) {
      removeItems(closed.map((i) => i.uuid));
      showError(t('mainPage.closedItemsRemoved', { items: closed.map((i) => i.name).join(', ') }));
      return;
    }

    busy.current = true;
    submit();
  }, [items, participant, removeItems, showError, submit, t]);

  const loading = creating || sending || addingRound || finishing;
  useEffect(() => {
    if (!loading) busy.current = false;
  }, [loading]);

  return {
    placeOrder,
    loading,
    serviceType,
    setServiceType,
    canTakeAway,
  };
};
