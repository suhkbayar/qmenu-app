import { gql } from '@apollo/client';
import { TABLE_EVENT_FIELDS } from '../fragments/tableMessage';

export const SEND_TABLE_MESSAGE = gql`
  mutation sendTableMessage($input: TableMessageInput!) {
    sendTableMessage(input: $input) {
      ...TableEventFields
    }
  }
  ${TABLE_EVENT_FIELDS}
`;
