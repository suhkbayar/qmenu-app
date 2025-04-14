import { gql } from '@apollo/client';

export const GET_VAT_PAYER = gql`
  query getVatPayer($register: String) {
    getVatPayer(register: $register) {
      found
      name
    }
  }
`;
