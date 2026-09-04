import { gql } from '@apollo/client';

export const MARK_GIFT_SEEN = gql`
  mutation markGiftSeen($id: ID!) {
    markGiftSeen(id: $id)
  }
`;
