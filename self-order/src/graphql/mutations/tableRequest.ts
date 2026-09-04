import { gql } from '@apollo/client';
import { TABLE_EVENT_FIELDS } from '../fragments/tableMessage';

export const SEND_TABLE_REQUEST = gql`
  mutation sendTableRequest($input: TableRequestInput!) {
    sendTableRequest(input: $input) {
      ...TableEventFields
    }
  }
  ${TABLE_EVENT_FIELDS}
`;
