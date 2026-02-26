import { getShopifyClient } from "../../client";

const CART_FRAGMENT = `
fragment CartFields on Cart {
  id checkoutUrl totalQuantity
  lines(first: 100) { nodes { id quantity merchandise { ...on ProductVariant { id title image { url altText } product { title handle } price { amount currencyCode } compareAtPrice { amount currencyCode } } } } }
  cost { totalAmount { amount currencyCode } subtotalAmount { amount currencyCode } }
  discountCodes { applicable code }
}
`;

const ADD_ITEM = `mutation AddItemToCart($cartId: ID!, $lines: [CartLineInput!]!) {
  payload: cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } }
} ${CART_FRAGMENT}`;

export interface AddItemProps {
  cartId: string;
  lines: Array<{
    merchandiseId: string;
    quantity?: number;
    attributes?: Array<{ key: string; value: string }>;
  }>;
}

export default async function addItems({ cartId, lines }: AddItemProps) {
  const client = getShopifyClient();
  const data = await client.query<any>(ADD_ITEM, { cartId, lines });
  return data?.payload?.cart ?? null;
}
