import { gql } from '@apollo/client';

export const CHANNEL_CONFIG_FIELDS = gql`
  fragment ChannelConfigFields on ChannelConfig {
    id
    name
    value
  }
`;
