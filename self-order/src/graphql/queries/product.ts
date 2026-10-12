import { gql } from '@apollo/client';
import { MENU_OPTION_FIELDS, MENU_PRODUCT_FIELDS, MENU_VARIANT_FIELDS } from '../fragments';

/** What goes with the given products: the restaurant's own pairings, set up by tag in the admin. */
export const GET_CROSS_SELLS = gql`
  query GetCrossSells($menuId: ID!, $ids: [ID!]!) {
    getCrossSells(menuId: $menuId, ids: $ids) {
      ...MenuProductFields
      variants {
        ...MenuVariantFields
        options {
          ...MenuOptionFields
        }
      }
    }
  }

  ${MENU_PRODUCT_FIELDS}
  ${MENU_OPTION_FIELDS}
  ${MENU_VARIANT_FIELDS}
`;
