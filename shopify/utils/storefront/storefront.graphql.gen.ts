/**
 * Shopify Storefront API GraphQL type stubs.
 * These replace the auto-generated types from the original deco-cx/apps.
 * Types are simplified but maintain the interface contract.
 */

// Cart types
export type CartFragment = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: {
    nodes: Array<{
      id: string;
      quantity: number;
      merchandise: {
        __typename?: string;
        id: string;
        title: string;
        image?: { url: string; altText?: string | null } | null;
        product: { title: string; handle: string; onlineStoreUrl?: string | null };
        price: { amount: string; currencyCode: string };
        compareAtPrice?: { amount: string; currencyCode: string } | null;
      };
      discountAllocations?: Array<{
        __typename?: string;
        code?: string;
      }>;
    }>;
  };
  cost: {
    totalAmount: { amount: string; currencyCode: string };
    subtotalAmount: { amount: string; currencyCode: string };
  };
  discountCodes?: Array<{ applicable: boolean; code: string }>;
};

// Mutation types
export type AddItemToCartMutation = { cart?: CartFragment | null };
export type AddItemToCartMutationVariables = { cartId: string; lines: any };
export type UpdateItemsMutation = { cart?: CartFragment | null };
export type UpdateItemsMutationVariables = { cartId: string; lines: any };
export type AddCouponMutation = { cart?: CartFragment | null };
export type AddCouponMutationVariables = { cartId: string; discountCodes: string[] };

// Product types
export type ProductFragment = any;
export type ProductVariantFragment = any;
export type GetProductQuery = { product?: any };
export type GetProductQueryVariables = { handle?: string; identifiers?: any[] };
export type ProductRecommendationsQuery = { productRecommendations?: any[] };
export type ProductRecommendationsQueryVariables = { productId: string };

// Search/Collection types
export type InputMaybe<T> = T | null | undefined;
export type ProductCollectionSortKeys = string;
export type SearchSortKeys = string;
export type ProductFilter = any;

// Customer types
export type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  acceptsMarketing?: boolean;
  defaultAddress?: any;
  addresses?: { nodes: any[] };
  orders?: { nodes: any[] };
};

export type CustomerAccessTokenCreateInput = {
  email: string;
  password: string;
};

export type CustomerAccessTokenCreateWithMultipassPayload = {
  customerAccessToken?: { accessToken: string; expiresAt: string } | null;
  customerUserErrors?: Array<{ message: string; code?: string }>;
};

export type CustomerCreateInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  acceptsMarketing?: boolean;
};

export type CustomerCreatePayload = {
  customer?: Customer | null;
  customerUserErrors?: Array<{ message: string; code?: string }>;
};

// Shop types
export type Shop = {
  name: string;
  description?: string;
  shipsToCountries?: string[];
  refundPolicy?: { body: string; title: string; url: string };
  privacyPolicy?: { body: string; title: string; url: string };
  termsOfService?: { body: string; title: string; url: string };
  metafields?: Array<{ key: string; value: string; namespace: string } | null>;
};

export type ShopMetafieldsArgs = {
  identifiers: Array<{ namespace: string; key: string }>;
};

// Order/Admin types
export type CountryCode = string;
export type Maybe<T> = T | null;
