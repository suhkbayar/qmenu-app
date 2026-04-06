import { gql } from '@apollo/client';

export const GET_SONG_CATEGORIES = gql`
  {
    getSongCategories {
      code
      id
      name
      vendor
    }
  }
`;

export const GET_SONGS = gql`
  query getSongs($category: Int!) {
    getSongs(category: $category) {
      id
      name
      code
      artist
    }
  }
`;

export const SEARCH_SONGS = gql`
  query searchSongs($category: Int!, $query: String!) {
    searchSongs(category: $category, query: $query) {
      id
      name
      code
      artist
    }
  }
`;
