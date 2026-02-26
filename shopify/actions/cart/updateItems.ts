import { getShopifyClient } from "../../client";

const CART_FRAGMENT = `
fragment CartFields on Cart {
  id checkoutUrl totalQuantity
  lines(first: 100) { nodes { id quantity merchandise { ...on ProductVariant { id title image { url altText } product { title handle } price { amount currencyCode } compareAtPrice { amount currencyCode } } } } }
  cost { totalAmount { amount currencyCode } subtotalAmount { amount currencyCode } }
  discountCodes { applicable code }
}
`;

const UPDATE_ITEMS = `mutation UpdateItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  payload: cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ...CartFields } }
} ${CART_FRAGMENT}`;

export interface UpdateItemsProps {
  cartId: string;
  lines: Array<{
    id: string;
    quantity: number;
  }>;
}

export default async function updateItems({ cartId, lines }: UpdateItemsProps) {
  const client = getShopifyClient();
  const data = await client.query<any>(UPDATE_ITEMS, { cartId, lines });
  return data?.payload?.cart ?? null;
}
