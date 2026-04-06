import { gql } from '@apollo/client';
import { FORM_FIELDS } from '../fragments/form';

export const GET_FORM = gql`
  query getFormStructures {
    getFormStructures {
      ...Formfields
    }
  }
  ${FORM_FIELDS}
`;
