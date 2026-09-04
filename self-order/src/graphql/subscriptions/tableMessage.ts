import { gql } from '@apollo/client';
import { TABLE_EVENT_FIELDS } from '../fragments/tableMessage';

export const ON_TABLE_EVENT = gql`
  subscription onTableEvent($branch: ID!, $table: ID!) {
    onTableEvent(branch: $branch, table: $table) {
      ...TableEventFields
    }
  }
  ${TABLE_EVENT_FIELDS}
`;
