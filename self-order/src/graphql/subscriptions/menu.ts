import { gql } from '@apollo/client';

export const ON_UPDATED_MENU = gql`
  subscription onUpdatedMenu($branch: ID!) {
    onUpdatedMenu(branch: $branch) {
      branch
      menuId
      type
      action
      state
      ids
    }
  }
`;
