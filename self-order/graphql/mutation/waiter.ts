import { gql } from '@apollo/client';

export const WAITER_CALL = gql`
  mutation call {
    call {
      branch
      table
      tableName
    }
  }
`;
