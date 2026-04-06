import { gql } from '@apollo/client';

export const FORM_FIELDS = gql`
  fragment Formfields on Form {
    id
    name
    structure
    type
  }
`;
