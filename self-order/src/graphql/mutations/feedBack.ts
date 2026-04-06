import { gql } from '@apollo/client';

export const CREATE_FEEDBACK = gql`
  mutation createFeedback($id: ID!, $input: FeedbackInput!) {
    createFeedback(id: $id, input: $input) {
      id
    }
  }
`;
