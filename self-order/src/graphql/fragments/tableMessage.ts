import { gql } from '@apollo/client';

export const TABLE_EVENT_FIELDS = gql`
  fragment TableEventFields on TableEvent {
    id
    kind
    branch
    table
    fromTableId
    fromTableName
    stickerId
    itemsSummary
    accepted
    anonymous
  }
`;
