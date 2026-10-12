import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation updateProfile($input: ProfileInput!) {
    updateProfile(input: $input) {
      birthday
      createdAt
      email
      firstName
      gender
      id
      lastName
      phone
      name
      updatedAt
      verified
      contacts {
        createdAt
        name
        updatedAt
        id
        description
      }
      accounts {
        id
        type
        data
        verified
        code
      }
    }
  }
`;
