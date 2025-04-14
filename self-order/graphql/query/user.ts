import { gql } from '@apollo/client';
import { PRODUCT_FIELDS, VARIANT_FIELDS } from '../fragment';

export const ME = gql`
  {
    me {
      birthday
      createdAt
      email
      firstName
      gender
      id
      lastName
      phone
      name
      updatedAt
      verified
      contacts {
        createdAt
        name
        updatedAt
        id
        description
      }
      accounts {
        id
        type
        data
        verified
        code
      }
    }
  }
`;

export const GET_CUSTOMER_PRODUCTS = gql`
  {
    getCustomerProducts {
      id
      spentOrder
      state
      code
      transaction
      expiredAt
      issuedOrder
      issuedType
      product {
        ...ProductFields
        variants {
          ...VariantFields
        }
      }
    }
  }
  ${PRODUCT_FIELDS}
  ${VARIANT_FIELDS}
`;
