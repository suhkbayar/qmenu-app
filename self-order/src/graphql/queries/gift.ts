import { gql } from '@apollo/client';

export const GET_PENDING_GIFTS = gql`
  query getPendingGifts {
    getPendingGifts {
      id
      fromTableId
      fromTableName
      stickerId
      anonymous
      itemsSummary
      deliveredAt
    }
  }
`;
