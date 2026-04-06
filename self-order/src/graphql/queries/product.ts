import { gql } from '@apollo/client';
import { MENU_OPTION_FIELDS, MENU_PRODUCT_FIELDS, MENU_VARIANT_FIELDS } from '../fragments';
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

export const GET_CATEGORY_PRODUCTS = gql`
  query getCategoryProducts($categoryId: ID!, $limit: Int, $offset: Int) {
    getCategoryProducts(categoryId: $categoryId, limit: $limit, offset: $offset) {
      categoryId
      products {
        ...MenuProductFields
        variants {
          ...MenuVariantFields
          options {
            ...MenuOptionFields
          }
        }
      }
      total
      hasMore
    }
  }
  ${MENU_PRODUCT_FIELDS}
  ${MENU_VARIANT_FIELDS}
  ${MENU_OPTION_FIELDS}
`;
