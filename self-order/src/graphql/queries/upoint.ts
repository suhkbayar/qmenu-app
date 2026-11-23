import { gql } from '@apollo/client';

export const GET_BALANCE_UPOINT = gql`
  query getBalanceUpoint($input: BalanceInput!) {
    getBalanceUpoint(input: $input) {
      id
      phone
      code
      balance
    }
  }
`;

export const GET_UPOINT_QR = gql`
  query getUpointQr($input: UpointQrInput!) {
    getUpointQr(input: $input) {
      qr_string
    }
  }
`;

/** A coupon code checked for this order without using it: its amount, product and expiry. */
export const CHECK_UPOINT_COUPON = gql`
  query checkUpointCoupon($input: UpointCouponInput!) {
    checkUpointCoupon(input: $input) {
      code
      amount
      name
      expireDate
    }
  }
`;

export const CHECK_UPOINT_QR = gql`
  query checkUpointQr($input: UpointQrCheckInput!) {
    checkUpointQr(input: $input) {
      id
      phone
      code
      balance
    }
  }
`;
