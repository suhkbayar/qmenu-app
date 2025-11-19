import { gql } from '@apollo/client';
import { TABLE_FIELDS } from '../fragment';

export const UPDATE_BATTERY = gql`
  mutation updateBattery($id: ID!, $battery: Int!, $charging: Boolean) {
    updateBattery(id: $id, battery: $battery, charging: $charging) {
      ...TableFields
    }
  }
  ${TABLE_FIELDS}
`;
