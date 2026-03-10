/**
 * VTEX Checkout API actions.
 * Pure async functions using vtexFetch. Require configureVtex() to have been called.
 *
 * Ported from deco-cx/apps vtex/actions/cart/*.ts
 * @see https://developers.vtex.com/docs/api-reference/checkout-api
 */
import { vtexFetch, getVtexConfig } from "../client";
import type { OrderForm } from "../types";

function scParam(): string {
  const sc = getVtexConfig().salesChannel;
  return sc ? `sc=${sc}` : "";
}

function appendSc(params: URLSearchParams): URLSearchParams {
  const sc = getVtexConfig().salesChannel;
  if (sc) params.set("sc", sc);
  return params;
}

// ---------------------------------------------------------------------------
// Cart (OrderForm) — core CRUD
// ---------------------------------------------------------------------------

export async function getOrCreateCart(orderFormId?: string): Promise<OrderForm> {
  const sc = scParam();
  if (orderFormId) {
    return vtexFetch<OrderForm>(`/api/checkout/pub/orderForm/${orderFormId}${sc ? `?${sc}` : ""}`);
  }
  return vtexFetch<OrderForm>(`/api/checkout/pub/orderForm${sc ? `?${sc}` : ""}`, {
    method: "POST",
    body: JSON.stringify({ expectedOrderFormSections: ["items"] }),
  });
}

export async function addItemsToCart(
  orderFormId: string,
  orderItems: Array<{ id: string; seller: string; quantity: number; index?: number; price?: number }>,
  allowedOutdatedData: string[] = ["paymentData"],
): Promise<OrderForm> {
  const params = appendSc(new URLSearchParams());
  for (const d of allowedOutdatedData) params.append("allowedOutdatedData", d);
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items?${params}`,
    { method: "POST", body: JSON.stringify({ orderItems }) },
  );
}

export async function updateCartItems(
  orderFormId: string,
  orderItems: Array<{ index: number; quantity: number }>,
  opts?: { allowedOutdatedData?: string[]; noSplitItem?: boolean },
): Promise<OrderForm> {
  const params = appendSc(new URLSearchParams());
  for (const d of (opts?.allowedOutdatedData ?? ["paymentData"])) {
    params.append("allowedOutdatedData", d);
  }
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/update?${params}`,
    {
      method: "POST",
      body: JSON.stringify({
        orderItems,
        noSplitItem: Boolean(opts?.noSplitItem),
      }),
    },
  );
}

/** Removes all items from the cart. */
export async function removeAllItems(orderFormId: string): Promise<OrderForm> {
  const sc = scParam();
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/removeAll${sc ? `?${sc}` : ""}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function addCouponToCart(orderFormId: string, text: string): Promise<OrderForm> {
  const sc = scParam();
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/coupons${sc ? `?${sc}` : ""}`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
}

// ---------------------------------------------------------------------------
// Cart — simulation
// ---------------------------------------------------------------------------

export interface SimulationItem {
  id: number | string;
  quantity: number;
  seller: string;
}

export async function simulateCart(
  items: SimulationItem[],
  postalCode: string,
  country = "BRA",
  RnbBehavior: 0 | 1 = 0,
) {
  const params = appendSc(new URLSearchParams({ RnbBehavior: String(RnbBehavior) }));
  return vtexFetch<any>(
    `/api/checkout/pub/orderForms/simulation?${params}`,
    {
      method: "POST",
      body: JSON.stringify({ items, postalCode, country }),
    },
  );
}

// ---------------------------------------------------------------------------
// Cart — offerings (services attached to items)
// ---------------------------------------------------------------------------

export async function addOffering(
  orderFormId: string,
  itemIndex: number,
  offeringId: string,
  offeringInfo?: string | null,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/offerings`,
    {
      method: "POST",
      body: JSON.stringify({ id: offeringId, offeringInfo }),
    },
  );
}

export async function removeOffering(
  orderFormId: string,
  itemIndex: number,
  offeringId: string,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/offerings/${offeringId}/remove`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

// ---------------------------------------------------------------------------
// Cart — attachments
// ---------------------------------------------------------------------------

export async function updateOrderFormAttachment(
  orderFormId: string,
  attachment: string,
  body: Record<string, unknown>,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/attachments/${attachment}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function updateItemAttachment(
  orderFormId: string,
  itemIndex: number,
  attachment: string,
  content: Record<string, unknown>,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/attachments/${attachment}`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export async function removeItemAttachment(
  orderFormId: string,
  itemIndex: number,
  attachment: string,
  content: Record<string, unknown>,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/attachments/${attachment}`,
    { method: "DELETE", body: JSON.stringify({ content }) },
  );
}

// ---------------------------------------------------------------------------
// Cart — price override
// ---------------------------------------------------------------------------

export async function updateItemPrice(
  orderFormId: string,
  itemIndex: number,
  price: number,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/price`,
    { method: "PUT", body: JSON.stringify({ price }) },
  );
}

// ---------------------------------------------------------------------------
// Cart — selectable gifts
// ---------------------------------------------------------------------------

export async function updateSelectableGifts(
  orderFormId: string,
  giftId: string,
  selectedGifts: Array<{ id: string; seller: string; quantity: number }>,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/selectable-gifts/${giftId}`,
    {
      method: "POST",
      body: JSON.stringify({
        selectedGifts,
        expectedOrderFormSections: ["items"],
      }),
    },
  );
}

// ---------------------------------------------------------------------------
// Cart — installments
// ---------------------------------------------------------------------------

export async function getInstallments(orderFormId: string, paymentSystem: number) {
  return vtexFetch<any>(
    `/api/checkout/pub/orderForm/${orderFormId}/installments?paymentSystem=${paymentSystem}`,
  );
}

// ---------------------------------------------------------------------------
// Cart — profile & messages
// ---------------------------------------------------------------------------

export async function updateOrderFormProfile(
  orderFormId: string,
  fields: Record<string, unknown>,
): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/profile`,
    { method: "PATCH", body: JSON.stringify(fields) },
  );
}

export async function changeToAnonymousUser(orderFormId: string): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/changeToAnonymousUser/${orderFormId}`,
  );
}

export async function clearOrderFormMessages(orderFormId: string): Promise<OrderForm> {
  return vtexFetch<OrderForm>(
    `/api/checkout/pub/orderForm/${orderFormId}/messages/clear`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

// ---------------------------------------------------------------------------
// Shipping / Regions
// ---------------------------------------------------------------------------

export interface Seller {
  id: string;
  name: string;
}

export interface RegionResult {
  id: string;
  sellers: Seller[];
}

export async function getSellersByRegion(postalCode: string, salesChannel?: string): Promise<RegionResult | null> {
  const params = new URLSearchParams({ country: "BRA", postalCode });
  const sc = salesChannel ?? getVtexConfig().salesChannel;
  if (sc) params.set("sc", sc);
  const resp = await vtexFetch<RegionResult[]>(
    `/api/checkout/pub/regions/?${params}`,
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
