/**
 * VTEX Checkout API actions.
 * All functions use vtexFetch and require configureVtex() to have been called.
 */
import { vtexFetch } from "../client";

// ---------------------------------------------------------------------------
// Cart (OrderForm)
// ---------------------------------------------------------------------------

export async function getOrCreateCart(orderFormId?: string) {
  if (orderFormId) {
    return vtexFetch<any>(`/api/checkout/pub/orderForm/${orderFormId}`);
  }
  return vtexFetch<any>("/api/checkout/pub/orderForm", {
    method: "POST",
    body: JSON.stringify({ expectedOrderFormSections: ["items"] }),
  });
}

export async function addItemsToCart(
  orderFormId: string,
  orderItems: Array<{ id: string; seller: string; quantity: number }>,
) {
  return vtexFetch<any>(
    `/api/checkout/pub/orderForm/${orderFormId}/items`,
    { method: "POST", body: JSON.stringify({ orderItems }) },
  );
}

export async function updateCartItems(
  orderFormId: string,
  orderItems: Array<{ index: number; quantity: number }>,
) {
  return vtexFetch<any>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/update`,
    { method: "POST", body: JSON.stringify({ orderItems }) },
  );
}

export async function addCouponToCart(orderFormId: string, text: string) {
  return vtexFetch<any>(
    `/api/checkout/pub/orderForm/${orderFormId}/coupons`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

export interface Seller {
  id: string;
  name: string;
}

export interface RegionResult {
  id: string;
  sellers: Seller[];
}

export async function getSellersByRegion(postalCode: string): Promise<RegionResult | null> {
  const resp = await vtexFetch<RegionResult[]>(
    `/api/checkout/pub/regions/?country=BRA&postalCode=${postalCode}`,
  );
  return resp[0]?.sellers?.length > 0 ? resp[0] : null;
}

export async function setShippingPostalCode(
  orderFormId: string,
  postalCode: string,
  country = "BRA",
): Promise<boolean> {
  try {
    await vtexFetch<any>(
      `/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`,
      {
        method: "POST",
        body: JSON.stringify({
          selectedAddresses: [{ postalCode, country }],
        }),
      },
    );
    return true;
  } catch {
    return false;
  }
}
