import { gql } from '@apollo/client';

export const SIGN_UP = gql`
  mutation signUp($input: CreateCustomerInput!) {
    signUp(input: $input) {
      id
      token
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation passwordReset($password: String!, $session: String!) {
    passwordReset(password: $password, session: $session)
  }
`;

export const SIGN_IN = gql`
  mutation signIn($password: String!, $phone: String!) {
    signIn(password: $password, phone: $phone) {
      id
      token
    }
  }
`;
