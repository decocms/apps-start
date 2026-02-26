import { getShopifyClient } from "../client";

const CART_FRAGMENT = `
fragment CartFields on Cart {
  id
  checkoutUrl
  totalQuantity
  lines(first: 100) {
    nodes {
      id
      quantity
      merchandise {
        ...on ProductVariant {
          id
          title
          image { url altText }
          product { title handle onlineStoreUrl }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
        }
      }
    }
  }
  cost {
    totalAmount { amount currencyCode }
    subtotalAmount { amount currencyCode }
  }
  discountCodes { applicable code }
}
`;

const GET_CART = `query GetCart($id: ID!) { cart(id: $id) { ...CartFields } } ${CART_FRAGMENT}`;
const CREATE_CART = `mutation CreateCart { payload: cartCreate { cart { id } } }`;

export interface CartItem {
  id: string;
  quantity: number;
  title: string;
  variantTitle: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  image?: string;
  imageAlt?: string;
  productHandle: string;
  merchandiseId: string;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  items: CartItem[];
  total: number;
  subtotal: number;
  currency: string;
  discountCodes: string[];
}

function transformCart(raw: any): Cart {
  const lines = raw?.lines?.nodes ?? [];
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity || 0,
    items: lines.map((line: any) => ({
      id: line.id,
      quantity: line.quantity,
      title: line.merchandise?.product?.title || "",
      variantTitle: line.merchandise?.title || "",
      price: Number(line.merchandise?.price?.amount || 0),
      compareAtPrice: line.merchandise?.compareAtPrice
        ? Number(line.merchandise.compareAtPrice.amount)
        : undefined,
      currency: line.merchandise?.price?.currencyCode || "USD",
      image: line.merchandise?.image?.url,
      imageAlt: line.merchandise?.image?.altText,
      productHandle: line.merchandise?.product?.handle || "",
      merchandiseId: line.merchandise?.id || "",
    })),
    total: Number(raw.cost?.totalAmount?.amount || 0),
    subtotal: Number(raw.cost?.subtotalAmount?.amount || 0),
    currency: raw.cost?.totalAmount?.currencyCode || "USD",
    discountCodes: (raw.discountCodes || [])
      .filter((d: any) => d.applicable)
      .map((d: any) => d.code),
  };
}

export async function getCart(cartId: string): Promise<Cart | null> {
  if (!cartId) return null;
  const client = getShopifyClient();
  try {
    const data = await client.query<any>(GET_CART, { id: cartId });
    if (!data?.cart) return null;
    return transformCart(data.cart);
  } catch (error) {
    console.error("[Shopify] getCart error:", error);
    return null;
  }
}

export async function createCart(): Promise<string | null> {
  const client = getShopifyClient();
  try {
    const data = await client.query<any>(CREATE_CART, {});
    return data?.payload?.cart?.id ?? null;
  } catch (error) {
    console.error("[Shopify] createCart error:", error);
    return null;
  }
}

export type { Cart as ShopifyCart, CartItem as ShopifyCartItem };
