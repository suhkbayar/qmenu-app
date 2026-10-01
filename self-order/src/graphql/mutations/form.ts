import { gql } from '@apollo/client';

export const FILL_FORM = gql`
  mutation fillForm($id: ID!, $value: String!) {
    fillForm(id: $id, value: $value)
  }
`;
