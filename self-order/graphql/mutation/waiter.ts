import { gql } from '@apollo/client';

export const WAITER_CALL = gql`
  mutation call($message: String) {
    call(message: $message) {
      branch
      table
    }
  }
`;
