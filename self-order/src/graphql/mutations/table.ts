import { gql } from '@apollo/client';
import { TABLE_FIELDS } from '../fragments';

export const UPDATE_BATTERY = gql`
  mutation updateBattery($id: ID!, $battery: Int!, $charging: Boolean, $appVersion: String) {
    updateBattery(id: $id, battery: $battery, charging: $charging, appVersion: $appVersion) {
      ...TableFields
    }
  }
  ${TABLE_FIELDS}
`;
