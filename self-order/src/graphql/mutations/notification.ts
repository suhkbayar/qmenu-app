import { gql } from '@apollo/client';

export const READ_NOTIFICATION = gql`
  mutation readNotification($sk: String!) {
    readNotification(sk: $sk)
  }
`;
