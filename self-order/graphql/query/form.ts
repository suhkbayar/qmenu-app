import { gql } from '@apollo/client';
import { FORM_FIELDS } from '../fragment/form';

export const GET_FORM = gql`
  query getFormStructures {
    getFormStructures {
      ...Formfields
    }
  }
  ${FORM_FIELDS}
`;
