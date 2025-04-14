import { gql } from '@apollo/client';

export const MENU_FIELDS = gql`
  fragment MenuFields on Menu {
    id
    name
    description
  }
`;

export const MENU_CATEGORY_FIELDS = gql`
  fragment MenuCategoryFields on MenuCategory {
    id
    icon
    color
    name
    sort
    color
    active
  }
`;

export const MENU_PRODUCT_FIELDS = gql`
  fragment MenuProductFields on MenuProduct {
    id
    name
    description
    bonus
    specification
    type
    image
    state
    productId
    withNote
    adultsOnly
    sort
  }
`;

export const PRODUCT_FIELDS = gql`
  fragment ProductFields on Product {
    createdAt
    id
    image
    adultsOnly
    description
    images
    keywords
    kitchen
    name
    price
    specification
    type
    updatedAt
    upload
    uploads
    withNote
  }
`;

export const VARIANT_FIELDS = gql`
  fragment VariantFields on Variant {
    active
    barCode
    code
    createdAt
    id
    name
    price
    unitType
    unitValue
    updatedAt
  }
`;

export const MENU_VARIANT_FIELDS = gql`
  fragment MenuVariantFields on MenuVariant {
    id
    name
    price
    state
    salePrice
    discount
    unitType
    unitValue
    servings
    calorie
  }
`;

export const MENU_OPTION_FIELDS = gql`
  fragment MenuOptionFields on MenuOption {
    id
    name
    price
    type
    values
    mandatory
    state
  }
`;
