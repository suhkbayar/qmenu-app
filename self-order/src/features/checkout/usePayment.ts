import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { launchCardScanner } from '@/modules/card-scanner';
import { LOYALTY_TYPE, PAYMENT_TYPE } from '@/src/constants';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { ADD_ORDER_LOYALTY } from '@/src/graphql/mutations/loyalty';
import { GET_PAY_ORDER, VALIDATE_TRANSACTION } from '@/src/graphql/mutations/order';
import { GET_ORDER } from '@/src/graphql/queries';
import { ON_UPDATED_ORDER } from '@/src/graphql/subscriptions';
import { IOrder, ITransaction } from '@/src/types';
import { useNotify } from '@/src/ui/useNotify';

// The order still not here after this long counts as failed; until then the dialog shows loading
const LOAD_GIVE_UP_MS = 45_000;
// After a temporary failure (no connection, no answer), the order is asked for again this often
const LOAD_RETRY_MS = 5_000;
// While the bank QR is up, the order is also checked this often, in case the "paid" message is missed
const PAID_CHECK_MS = 5_000;

/**
 * Ways to pay, each shown only when the branch has it set up. Paying at the cashier needs nothing
 * here: an order sent to be paid later is already in the kitchen, and the guest asks for the bill.
 */
export type PaymentMethod = 'MPY' | 'MCS' | 'Toki' | 'MST' | 'QPay';

/**
 * The checkout dialog's steps: choose receipt and method → scan a QR / tap a card → done. U-Point
 * points and coupons are steps of their own, back to choosing a method once used.
 */
export type CheckoutStep = 'pay' | 'qr' | 'card' | 'upoint' | 'coupon' | 'done';

/** The eBarimt receipt: personal ('1'), or for a registered taxpayer ('3') with its register number. */
export type Receipt = { vatType: '1' | '3'; register?: string };

/** What payOrder answers: the order as it is now, and the payment just made */
export type PayResult = { order?: IOrder; transaction?: ITransaction };

/** What's left to pay: the whole total, or what remains once part is paid (with U-Point, say). */
export const amountDue = (order: IOrder) =>
  Number(order.paidAmount) > 0 ? Number(order.debtAmount) : Number(order.grandTotal);

/**
 * Paying one order inside the checkout dialog. `preview` is the order as the tablet already has it,
 * shown until the server's copy arrives; paying waits for that copy.
 */
export const usePayment = (orderId: string, preview?: IOrder | null) => {
  const { t } = useTranslation('language');
  const notify = useNotify();
  const participant = useSessionStore((s) => s.participant);

  const [step, setStep] = useState<CheckoutStep>('pay');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [transaction, setTransaction] = useState<ITransaction>();
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The guest chose to collect U-Point points; they go on the order when it's paid, once
  const [collect, setCollect] = useState(false);
  const collectSaved = useRef(false);

  const warn = useCallback((label: string) => notify('warning', label), [notify]);
  const fail = useCallback((label: string) => notify('danger', label), [notify]);

  // Never cached: the amount, payment state and receipt must be the server's latest
  const { data, previousData, loading, error, refetch } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });
  // A later reload that fails (e.g. for the receipt, after paying) keeps the order already shown
  const latest: IOrder | undefined = data?.getOrder ?? previousData?.getOrder;
  // Until the server's copy is here, the tablet's own: the dialog opens on it instead of a spinner
  const order = latest ?? preview ?? undefined;

  // The server answered with an error (e.g. it won't give this tablet the order): asking again won't help
  const refused = !latest && !!error?.graphQLErrors?.length;

  // Temporary trouble (a dropped connection, a slow answer) is retried quietly while the dialog shows
  // loading, so the guest isn't shown an error for a hiccup
  useEffect(() => {
    if (latest || refused || !error) return;
    const id = setTimeout(() => refetch().catch(() => {}), LOAD_RETRY_MS);
    return () => clearTimeout(id);
  }, [latest, refused, error, refetch]);

  // But never an endless wait: still nothing after a while is a failure the guest can retry or leave
  useEffect(() => {
    if (latest) return;
    const id = setTimeout(() => setTimedOut(true), LOAD_GIVE_UP_MS);
    return () => clearTimeout(id);
  }, [latest, attempt]);

  const retry = useCallback(() => {
    setTimedOut(false);
    setAttempt((n) => n + 1);
    refetch().catch(() => {});
  }, [refetch]);

  const done = useCallback(() => {
    setStep('done');
    // Reload for the receipt (eBarimt) the server just issued
    refetch().catch(() => {});
  }, [refetch]);

  // Opened for an order that's already paid, or found paid by the check below: on to done
  useEffect(() => {
    if (order?.paymentState === 'PAID' && step !== 'done') done();
  }, [order?.paymentState]);

  // The "paid" message can be missed (a dropped connection), so the QR step also checks the order itself
  useEffect(() => {
    if (step !== 'qr') return;
    const id = setInterval(() => refetch().catch(() => {}), PAID_CHECK_MS);
    return () => clearInterval(id);
  }, [step, refetch]);

  // The server pushes the order as soon as the bank confirms, so the guest doesn't have to press
  // anything. It goes to the order's customer, which isn't this tablet's guest for an order placed
  // before the tablet signed in again.
  useSubscription(ON_UPDATED_ORDER, {
    variables: { customer: order?.customerId },
    skip: !order?.customerId,
    onData({ data: event }) {
      const updated = event?.data?.onUpdatedOrder?.order;
      if (updated?.id === orderId && updated.paymentState === 'PAID') done();
    },
  });

  const [validateTransaction, { loading: checking }] = useMutation(VALIDATE_TRANSACTION, {
    onCompleted(result) {
      const updated = result.validateTransaction;
      if (updated.paymentState === 'PAID') return done();
      const failed = updated.transactions?.find((tx: ITransaction) => tx.id === transaction?.id);
      setStep((current) => (current === 'card' ? 'pay' : current));
      warn(failed?.comment || t('mainPage.NotPaidDescription'));
    },
    onError(err) {
      setStep((current) => (current === 'card' ? 'pay' : current));
      fail(err.message);
    },
  });

  const [payOnline] = useMutation(GET_PAY_ORDER, {
    onCompleted(result) {
      setPendingMethod(null);
      if (!result?.payOrder) return;
      const tx: ITransaction = result.payOrder.transaction;
      setTransaction(tx);
      setStep(tx?.type === PAYMENT_TYPE.MCS ? 'card' : 'qr');
    },
    onError(err) {
      setPendingMethod(null);
      warn(err.message);
    },
  });

  const [addOrderLoyalty] = useMutation(ADD_ORDER_LOYALTY);

  // Card payments: hand the amount to the card reader app, then report its result to the server
  useEffect(() => {
    if (step !== 'card' || !transaction?.id || !order) return;
    const transactionId = transaction.id;
    let cancelled = false;

    const report = (payment_status: boolean, response_body: unknown) =>
      validateTransaction({
        variables: {
          id: transactionId,
          data: JSON.stringify({ timestamp: new Date().toISOString(), response: { payment_status, response_body } }),
        },
      });

    // Charge what the server put on the payment: what's left to pay, after discounts, taxes, charges
    // and any part already paid with U-Point
    launchCardScanner(String(Number(transaction.amount) || amountDue(order)))
      .then((result) => {
        if (!cancelled) report(result.payment_status, result.response_body || {});
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStep('pay');
        if (err.message === 'CANCELLED') return warn(t('mainPage.PaymentCancelled'));
        report(false, { message: err.message || 'Error' });
        fail(err.message || t('mainPage.CardScannerError'));
      });

    return () => {
      cancelled = true;
    };
  }, [step, transaction, order]);

  const methods = useMemo(() => {
    // A branch with no payments set up has none in its list, or no list at all
    const find = (...types: string[]) => participant?.payments?.find((p) => types.includes(p.type));
    // Shown in this order: М Банк, Toki, QR Pay (Most), QPay, then card
    const online: [PaymentMethod, string[]][] = [
      ['MPY', [PAYMENT_TYPE.MPY]],
      ['Toki', [PAYMENT_TYPE.Toki]],
      ['MST', [PAYMENT_TYPE.MST]],
      ['QPay', [PAYMENT_TYPE.QPay, PAYMENT_TYPE.QPay2]],
      ['MCS', [PAYMENT_TYPE.MCS]],
    ];
    return online
      .map(([method, types]) => ({ method, paymentId: find(...types)?.id }))
      .filter((m): m is { method: PaymentMethod; paymentId: string } => !!m.paymentId);
  }, [participant]);

  /** U-Point points and U-Point coupons, each when the branch has it set up */
  const rewards = useMemo(
    () => ({
      upoint: participant?.payments?.find((p) => p.type === PAYMENT_TYPE.UPT)?.id,
      coupon: participant?.payments?.find((p) => p.type === PAYMENT_TYPE.UPC)?.id,
    }),
    [participant],
  );

  // Points can be spent once per order
  const upointSpent = !!order?.transactions?.some(
    (tx) => tx.type === PAYMENT_TYPE.UPT && tx.state === 'PAID',
  );

  /** The eBarimt fields of every payOrder call; a branch without VAT sends 0 */
  const vatInput = (receipt: Receipt) => ({
    register: receipt.vatType === '3' ? receipt.register : undefined,
    vatType: participant?.vat ? receipt.vatType : 0,
  });

  /** A payment method was tapped: the payment starts right away. */
  const select = async (picked: PaymentMethod, paymentId: string, receipt: Receipt) => {
    setMethod(picked);
    setPendingMethod(picked);
    // U-Point points to collect go on the order before it's paid
    if (collect && !collectSaved.current) {
      try {
        await addOrderLoyalty({ variables: { id: orderId, input: { type: LOYALTY_TYPE.Upoint } } });
        collectSaved.current = true;
      } catch (err) {
        setPendingMethod(null);
        return warn((err as Error).message);
      }
    }
    payOnline({ variables: { input: { order: orderId, ...vatInput(receipt), confirm: false, payment: paymentId } } });
  };

  /** The payOrder input for paying with U-Point points or a coupon (the step adds the code) */
  const rewardInput = (paymentId: string, receipt: Receipt) => ({
    order: orderId,
    ...vatInput(receipt),
    confirm: false,
    payment: paymentId,
  });

  /**
   * Points or a coupon were used. Paid in full: validating issues the receipt and leads to done.
   * Otherwise back to the methods, with what's left to pay.
   */
  const rewardPaid = (result?: PayResult) => {
    // Spent instead of collected
    if (result?.transaction?.type === PAYMENT_TYPE.UPT) setCollect(false);
    if (result?.order?.paymentState === 'PAID' && result.transaction?.id) {
      validateTransaction({ variables: { id: result.transaction.id } });
      return;
    }
    setStep('pay');
    refetch().catch(() => {});
  };

  return {
    orderId,
    order,
    loading: loading && !order,
    /** The server's latest copy is here: the amount to charge is the server's, so paying can start */
    upToDate: !!latest,
    /**
     * The order couldn't be opened: the server wouldn't give it to this tablet, or there was still no
     * answer after a long wait. Anything shorter shows as loading.
     */
    failed: !latest && ((refused && !loading) || timedOut),
    retry,
    step,
    method,
    back: () => setStep('pay'),
    methods,
    select,
    pendingMethod,
    transaction,
    /** "Check payment": ask the server whether the payment went through */
    checkPaid: () => transaction?.id && validateTransaction({ variables: { id: transaction.id } }),
    checking,
    /** What's left to pay */
    amountDue: order ? amountDue(order) : 0,
    rewards,
    upointSpent,
    /** The guest will collect U-Point points with this order */
    collect,
    /** Open the U-Point or the coupon step */
    openReward: (reward: 'upoint' | 'coupon') => setStep(reward),
    /** Collect U-Point points instead of spending them, and pick a method */
    collectPoints: () => {
      setCollect(true);
      setStep('pay');
    },
    rewardInput,
    rewardPaid,
  };
};
