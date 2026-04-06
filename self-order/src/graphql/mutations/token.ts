import { gql } from '@apollo/client';

export const CURRENT_TOKEN = gql`
  mutation getToken($code: String, $type: ChannelType!, $token: String, $systemType: SystemType) {
    getToken(code: $code, type: $type, token: $token, systemType: $systemType) {
      token
      id
    }
  }
`;
