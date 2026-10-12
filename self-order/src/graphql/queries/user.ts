import { gql } from '@apollo/client';

export const ME = gql`
  {
    me {
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
