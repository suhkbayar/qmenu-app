import { gql } from '@apollo/client';
import { BRANCH_FIELDS } from '../fragments/branch';
import {
  MENU_CATEGORY_FIELDS,
  MENU_FIELDS,
  MENU_OPTION_FIELDS,
  MENU_PRODUCT_FIELDS,
  MENU_VARIANT_FIELDS,
} from '../fragments/menu';
import { CHANNEL_CONFIG_FIELDS, TIMETABLE_FIELDS } from '../fragments';

export const GET_BRANCHES = gql`
  {
    getParticipants {
      id
      branch {
        ...BranchFields
      }
    }
  }
  ${BRANCH_FIELDS}
`;

export const GET_BRANCH = gql`
  query getParticipant($id: ID!) {
    getParticipant(id: $id) {
      id
      advancePayment
      services
      vat
      waiter
      orderable
      channel
      configs {
        ...ChannelConfigFields
      }
      branch {
        ...BranchFields
      }
      table {
        id
        name
        code
      }
      payments {
        type
        id
        name
      }
      menu {
        ...MenuFields
        categories {
          ...MenuCategoryFields
          products {
            ...MenuProductFields
            variants {
              ...MenuVariantFields
              options {
                ...MenuOptionFields
              }
            }
          }
          children {
            ...MenuCategoryFields
            products {
              ...MenuProductFields
              variants {
                ...MenuVariantFields
                options {
                  ...MenuOptionFields
                }
              }
            }
          }
          timetable {
            ...TimeTableFields
          }
        }
      }
    }
  }
  ${TIMETABLE_FIELDS}
  ${CHANNEL_CONFIG_FIELDS}
  ${MENU_CATEGORY_FIELDS}
  ${MENU_OPTION_FIELDS}
  ${MENU_PRODUCT_FIELDS}
  ${MENU_VARIANT_FIELDS}
  ${MENU_FIELDS}
  ${BRANCH_FIELDS}
`;
