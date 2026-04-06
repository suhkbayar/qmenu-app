import { gql } from '@apollo/client';

export const BANNER_ACTION_FIELDS = gql`
  fragment BannerActionFields on BannerAction {
    id
    text
    url
    icon
    type
  }
`;

export const BANNER_FIELDS = gql`
  fragment BannerFields on Banner {
    id
    name
    startAt
    endAt
    system
    type
    image
    upload
    groups
    description
    actions {
      ...BannerActionFields
    }
  }
  ${BANNER_ACTION_FIELDS}
`;
