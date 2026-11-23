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
import { IOrder, ITransaction, IUpointBalance, IUpointCoupon } from '@/src/types';
import { useNotify } from '@/src/ui/useNotify';

// The order still not here after this long counts as failed; until then the dialog shows loading
const LOAD_GIVE_UP_MS = 45_000;
// After a temporary failure (no connection, no answer), the order is asked for again this often
const LOAD_RETRY_MS = 5_000;
// While the bank QR is up, the order is also checked this often, in case the "paid" message is missed
const PAID_CHECK_MS = 5_000;
// Points pay for at most half of what's left after the coupons (U-Point's rule; the server's too)
const SPEND_RATE = 0.5;

/**
 * Ways to pay, each shown only when the branch has it set up. Paying at the cashier needs nothing
 * here: an order sent to be paid later is already in the kitchen, and the guest asks for the bill.
 */
export type PaymentMethod = 'MPY' | 'MCS' | 'Toki' | 'MST' | 'QPay';

/**
 * The checkout dialog's steps: choose receipt and method → scan a QR / tap a card → done. Before
 * paying, the guest can sign in to U-Point; by QR or card that leads to the discounts beside the
 * payment ('spend'), by phone straight back to paying (points are only collected).
 */
export type CheckoutStep = 'pay' | 'upoint' | 'spend' | 'qr' | 'card' | 'done';

/** How the guest signed in to U-Point. By phone, points can only be collected (U-Point's rule). */
export type UpointVia = 'qr' | 'card' | 'phone';

/** One payment either spends the guest's points or collects new ones, never both */
export type UpointMode = 'collect' | 'spend';

/** The eBarimt receipt: personal ('1'), or for a registered taxpayer ('3') with its register number. */
export type Receipt = { vatType: '1' | '3'; register?: string };

/** What payOrder answers: the order as it is now, and the payment just made */
export type PayResult = { order?: IOrder; transaction?: ITransaction };

/** What's left to pay: the whole total, or what remains once part is paid (with U-Point, say). */
export const amountDue = (order: IOrder) =>
  Number(order.paidAmount) > 0 ? Number(order.debtAmount) : Number(order.grandTotal);

/** What the order's paid transactions of one type add up to */
const paidOf = (order: IOrder | undefined, type: string) =>
  (order?.transactions ?? [])
    .filter((tx) => tx.type === type && tx.state === 'PAID')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

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
  // Paying is under way: coupons and points being applied, or the method's payment being started
  const [paying, setPaying] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // The guest's U-Point account, once signed in, and what they chose to do with it. Nothing is
  // applied until they pay: a coupon used is used for good.
  const [upoint, setUpoint] = useState<{ account: IUpointBalance; via: UpointVia } | null>(null);
  const [mode, setMode] = useState<UpointMode>('collect');
  const [coupons, setCoupons] = useState<IUpointCoupon[]>([]);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  // Coupons already used on this order (paid), so a retry after a failure doesn't use them again
  const [appliedCoupons, setAppliedCoupons] = useState<string[]>([]);
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
      setPaying(false);
      if (!result?.payOrder) return;
      const tx: ITransaction = result.payOrder.transaction;
      setTransaction(tx);
      setStep(tx?.type === PAYMENT_TYPE.MCS ? 'card' : 'qr');
    },
    onError(err) {
      setPendingMethod(null);
      setPaying(false);
      warn(err.message);
    },
  });

  // Coupons and points, each awaited in turn before the method's payment
  const [payReward] = useMutation(GET_PAY_ORDER);
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
  const upointSpent = paidOf(order, PAYMENT_TYPE.UPT) > 0;

  /**
   * The amounts shown while the guest chooses: coupons first, then points on half of what's left
   * (all of them if that's less). Coupons and points already paid on the order count too.
   */
  const discounts = useMemo(() => {
    const total = Number(order?.grandTotal ?? 0);
    const due = order ? amountDue(order) : 0;
    const couponsPaid = paidOf(order, PAYMENT_TYPE.UPC);
    const pointsPaid = paidOf(order, PAYMENT_TYPE.UPT);
    const couponsNew = Math.min(
      due,
      coupons
        .filter((coupon) => selectedCoupons.includes(coupon.code) && !appliedCoupons.includes(coupon.code))
        .reduce((sum, coupon) => sum + Number(coupon.amount), 0),
    );
    const spending = !!upoint && upoint.via !== 'phone' && mode === 'spend' && pointsPaid === 0;
    const pointsNew = spending
      ? Math.max(
          0,
          Math.floor(
            Math.min(Number(upoint.account.balance), (total - couponsPaid - couponsNew) * SPEND_RATE, due - couponsNew),
          ),
        )
      : 0;
    return {
      total,
      coupons: couponsPaid + couponsNew,
      points: pointsPaid + pointsNew,
      pointsNew,
      toPay: Math.max(0, due - couponsNew - pointsNew),
    };
  }, [order, coupons, selectedCoupons, appliedCoupons, upoint, mode]);

  /** The eBarimt fields of every payOrder call; a branch without VAT sends 0 */
  const vatInput = (receipt: Receipt) => ({
    register: receipt.vatType === '3' ? receipt.register : undefined,
    vatType: participant?.vat ? receipt.vatType : 0,
  });

  /** The payOrder input for one payment (the method's, a coupon's or the points') */
  const payInput = (paymentId: string, receipt: Receipt) => ({
    order: orderId,
    ...vatInput(receipt),
    confirm: false,
    payment: paymentId,
  });

  /**
   * U-Point's part of paying, in its order: points to collect put on the order (first, while it's still
   * open), the chosen coupons, then the points spent. Answers the last payment made, to tell whether
   * that paid it all.
   */
  const applyUpoint = async (receipt: Receipt): Promise<PayResult | null> => {
    if (!upoint) return null;
    let last: PayResult | null = null;
    const spending = upoint.via !== 'phone' && mode === 'spend';

    if (!spending && !collectSaved.current) {
      await addOrderLoyalty({ variables: { id: orderId, input: { type: LOYALTY_TYPE.Upoint } } });
      collectSaved.current = true;
    }

    const pending = coupons.filter(
      (coupon) => selectedCoupons.includes(coupon.code) && !appliedCoupons.includes(coupon.code),
    );
    for (const coupon of pending) {
      if (!rewards.coupon) break;
      const { data: result } = await payReward({
        variables: {
          input: { ...payInput(rewards.coupon, receipt), code: coupon.code, phone: upoint.account.phone },
        },
      });
      setAppliedCoupons((codes) => [...codes, coupon.code]);
      last = result?.payOrder ?? last;
    }

    // The server works out the points the same way, from what's left after the coupons
    if (spending && discounts.pointsNew > 0 && !upointSpent && rewards.upoint) {
      const { data: result } = await payReward({
        variables: { input: { ...payInput(rewards.upoint, receipt), code: upoint.account.code } },
      });
      last = result?.payOrder ?? last;
    }
    return last;
  };

  /**
   * Paying: U-Point first (if signed in), then the method for what's left. No method is needed when
   * the coupons and points cover it all.
   */
  const pay = async (picked: PaymentMethod | null, paymentId: string | null, receipt: Receipt) => {
    setMethod(picked);
    setPendingMethod(picked);
    setPaying(true);

    let last: PayResult | null = null;
    try {
      last = await applyUpoint(receipt);
    } catch (err) {
      setPendingMethod(null);
      setPaying(false);
      // Part may have gone through (a coupon): the server's copy shows what's left
      refetch().catch(() => {});
      return warn((err as Error).message);
    }

    // Paid in full by U-Point: validating issues the receipt and leads to done
    if (last?.order?.paymentState === 'PAID' && last.transaction?.id) {
      setPendingMethod(null);
      setPaying(false);
      validateTransaction({ variables: { id: last.transaction.id } });
      return;
    }
    // The QR and card steps show what's left after the discounts
    if (last) refetch().catch(() => {});

    if (!paymentId) {
      setPendingMethod(null);
      setPaying(false);
      return warn(t('mainPage.choosePaymentMethod'));
    }
    payOnline({ variables: { input: payInput(paymentId, receipt) } });
  };

  /** Signed in to U-Point: by phone back to paying (collecting), by QR or card on to the discounts. */
  const signedIn = (account: IUpointBalance, via: UpointVia) => {
    setUpoint({ account, via });
    setMode('collect');
    // Coupons were checked for the previous account, if any
    setCoupons((list) => list.filter((coupon) => appliedCoupons.includes(coupon.code)));
    setSelectedCoupons((codes) => codes.filter((code) => appliedCoupons.includes(code)));
    setStep(via === 'phone' ? 'pay' : 'spend');
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
    pay,
    pendingMethod,
    paying,
    transaction,
    /** "Check payment": ask the server whether the payment went through */
    checkPaid: () => transaction?.id && validateTransaction({ variables: { id: transaction.id } }),
    checking,
    /** What's left to pay */
    amountDue: order ? amountDue(order) : 0,
    rewards,
    upointSpent,
    /** The guest's U-Point account and how they signed in, once they have */
    upoint,
    signedIn,
    /** The U-Point tile: sign in, or back to the discounts when already signed in by QR or card */
    openUpoint: () => setStep(upoint && upoint.via !== 'phone' ? 'spend' : 'upoint'),
    mode,
    setMode,
    coupons,
    selectedCoupons,
    appliedCoupons,
    /** A coupon checked by its code: added to the list and chosen */
    addCoupon: (coupon: IUpointCoupon) => {
      setCoupons((list) => [...list.filter((c) => c.code !== coupon.code), coupon]);
      setSelectedCoupons((codes) => (codes.includes(coupon.code) ? codes : [...codes, coupon.code]));
    },
    /** Use a coupon, or not; one already used on the order stays */
    toggleCoupon: (code: string) => {
      if (appliedCoupons.includes(code)) return;
      setSelectedCoupons((codes) => (codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code]));
    },
    discounts,
  };
};
