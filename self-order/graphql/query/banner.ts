import { gql } from '@apollo/client';
import { BANNER_FIELDS } from '../fragment';

export const GET_BANNERS = gql`
  query getBanners {
    getBanners {
      ...BannerFields
    }
  }
  ${BANNER_FIELDS}
`;
