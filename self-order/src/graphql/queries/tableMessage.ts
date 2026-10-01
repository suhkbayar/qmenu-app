import { gql } from '@apollo/client';
import { TABLE_FIELDS } from '../fragments';

export const GET_ACTIVE_TABLES = gql`
  query getActiveTables {
    getActiveTables {
      ...TableFields
      section {
        id
        name
      }
    }
  }
  ${TABLE_FIELDS}
`;
