import { gql } from '@apollo/client';

export const TABLE_FIELDS = gql`
  fragment TableFields on Table {
    id
    code
    name
    description
    min
    max
    active
    battery
    charging
    shape {
      type
      x
      y
      width
      height
      radius
      rotation
    }
  }
`;
