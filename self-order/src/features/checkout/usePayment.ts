import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { useToast } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { launchCardScanner } from '@/modules/card-scanner';
import { PAYMENT_TYPE } from '@/src/constants';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_PAY_ORDER, VALIDATE_TRANSACTION } from '@/src/graphql/mutations/order';
import { GET_ORDER } from '@/src/graphql/queries';
import { ON_UPDATED_ORDER } from '@/src/graphql/subscriptions';
import { IOrder, ITransaction } from '@/src/types';

// The order not here by then counts as failed (the retries on a bad connection can take longer)
const LOAD_TIMEOUT_MS = 15_000;
// While the bank QR is up, the order is also checked this often, in case the "paid" message is missed
const PAID_CHECK_MS = 5_000;

/**
 * Ways to pay, each shown only when the branch has it set up. Paying at the cashier needs nothing
 * here: an order sent to be paid later is already in the kitchen, and the guest asks for the bill.
 */
export type PaymentMethod = 'MPY' | 'MCS' | 'Toki' | 'MST' | 'QPay';

/** The checkout dialog's steps: choose receipt and method → scan a QR / tap a card → done. */
export type CheckoutStep = 'pay' | 'qr' | 'card' | 'done';

/** The eBarimt receipt: personal ('1'), or for a registered taxpayer ('3') with its register number. */
export type Receipt = { vatType: '1' | '3'; register?: string };

/** Paying one order inside the checkout dialog. */
export const usePayment = (orderId: string, payLater: boolean) => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const participant = useSessionStore((s) => s.participant);

  const [step, setStep] = useState<CheckoutStep>(payLater ? 'done' : 'pay');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [transaction, setTransaction] = useState<ITransaction>();
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const warn = useCallback((label: string) => toast.show({ variant: 'warning', label }), [toast]);
  const fail = useCallback((label: string) => toast.show({ variant: 'danger', label }), [toast]);

  // Never cached: the amount, payment state and receipt must be the server's latest
  const { data, previousData, loading, error, refetch } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });
  // A later reload that fails (e.g. for the receipt, after paying) keeps the order already shown
  const order: IOrder | undefined = data?.getOrder ?? previousData?.getOrder;

  // Never an endless spinner: no order in time is a failure the guest can retry or leave
  useEffect(() => {
    if (order) return;
    const id = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [order, attempt]);

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

    // Charge the amount the guest sees on screen (after discounts, taxes and charges)
    launchCardScanner(order.grandTotal.toString())
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
    const find = (...types: string[]) => participant?.payments.find((p) => types.includes(p.type));
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

  /** The eBarimt fields of every payOrder call; a branch without VAT sends 0 */
  const vatInput = (receipt: Receipt) => ({
    register: receipt.vatType === '3' ? receipt.register : undefined,
    vatType: participant?.vat ? receipt.vatType : 0,
  });

  /** A payment method was tapped: the payment starts right away. */
  const select = (picked: PaymentMethod, paymentId: string, receipt: Receipt) => {
    setMethod(picked);
    setPendingMethod(picked);
    payOnline({ variables: { input: { order: orderId, ...vatInput(receipt), confirm: false, payment: paymentId } } });
  };

  return {
    order,
    loading: loading && !order,
    /** The order couldn't be opened: no connection, or the server wouldn't give it to this tablet */
    failed: !order && ((!!error && !loading) || timedOut),
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
  };
};
