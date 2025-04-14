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
