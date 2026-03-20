/**
 * VTEX Checkout API actions.
 * Pure async functions using vtexFetch. Require configureVtex() to have been called.
 *
 * Ported from deco-cx/apps vtex/actions/cart/*.ts
 * @see https://developers.vtex.com/docs/api-reference/checkout-api
 */

import type { VtexFetchResult } from "../client";
import { getVtexConfig, vtexFetch, vtexFetchWithCookies } from "../client";
import type { OrderForm } from "../types";

export const DEFAULT_EXPECTED_SECTIONS = [
	"items",
	"totalizers",
	"clientProfileData",
	"shippingData",
	"paymentData",
	"sellers",
	"messages",
	"marketingData",
	"clientPreferencesData",
	"storePreferencesData",
	"giftRegistryData",
	"ratesAndBenefitsData",
	"openTextField",
	"commercialConditionData",
	"customData",
];

function scParam(): string {
	const sc = getVtexConfig().salesChannel;
	return sc ? `sc=${sc}` : "";
}

function appendSc(params: URLSearchParams): URLSearchParams {
	const sc = getVtexConfig().salesChannel;
	if (sc) params.set("sc", sc);
	return params;
}

function forceHttpsOnAssets(orderForm: OrderForm): OrderForm {
	if (!orderForm?.items) return orderForm;
	return {
		...orderForm,
		items: orderForm.items.map((item: any) => ({
			...item,
			imageUrl: item.imageUrl?.replace(/^http:/, "https:"),
		})),
	};
}

// ---------------------------------------------------------------------------
// Cart (OrderForm) — core CRUD
// ---------------------------------------------------------------------------

export async function getOrCreateCart(
	orderFormId?: string,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const sc = scParam();
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;

	if (orderFormId) {
		const result = await vtexFetchWithCookies<OrderForm>(
			`/api/checkout/pub/orderForm/${orderFormId}${sc ? `?${sc}` : ""}`,
			{ headers },
		);
		result.data = forceHttpsOnAssets(result.data);
		return result;
	}
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm${sc ? `?${sc}` : ""}`,
		{
			method: "POST",
			body: JSON.stringify({
				expectedOrderFormSections: DEFAULT_EXPECTED_SECTIONS,
			}),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function addItemsToCart(
	orderFormId: string,
	orderItems: Array<{
		id: string;
		seller: string;
		quantity: number;
		index?: number;
		price?: number;
	}>,
	allowedOutdatedData: string[] = ["paymentData"],
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const params = appendSc(new URLSearchParams());
	for (const d of allowedOutdatedData) params.append("allowedOutdatedData", d);
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items?${params}`,
		{ method: "POST", body: JSON.stringify({ orderItems }), headers },
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function updateCartItems(
	orderFormId: string,
	orderItems: Array<{ index: number; quantity: number }>,
	opts?: {
		allowedOutdatedData?: string[];
		noSplitItem?: boolean;
		cookieHeader?: string;
	},
): Promise<VtexFetchResult<OrderForm>> {
	const params = appendSc(new URLSearchParams());
	for (const d of opts?.allowedOutdatedData ?? ["paymentData"]) {
		params.append("allowedOutdatedData", d);
	}
	const headers: Record<string, string> = {};
	if (opts?.cookieHeader) headers.cookie = opts.cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items/update?${params}`,
		{
			method: "POST",
			body: JSON.stringify({
				orderItems,
				noSplitItem: Boolean(opts?.noSplitItem),
			}),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function removeAllItems(
	orderFormId: string,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const sc = scParam();
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items/removeAll${sc ? `?${sc}` : ""}`,
		{ method: "POST", body: JSON.stringify({}), headers },
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function addCouponToCart(
	orderFormId: string,
	text: string,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const sc = scParam();
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/coupons${sc ? `?${sc}` : ""}`,
		{ method: "POST", body: JSON.stringify({ text }), headers },
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
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
	country?: string,
	RnbBehavior: 0 | 1 = 1,
	cookieHeader?: string,
) {
	const config = getVtexConfig();
	const params = appendSc(new URLSearchParams({ RnbBehavior: String(RnbBehavior) }));
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	return vtexFetch<any>(`/api/checkout/pub/orderForms/simulation?${params}`, {
		method: "POST",
		body: JSON.stringify({
			items,
			postalCode,
			country: country ?? config.country ?? "BRA",
		}),
		headers,
	});
}

// ---------------------------------------------------------------------------
// Cart — offerings (services attached to items)
// ---------------------------------------------------------------------------

export async function addOffering(
	orderFormId: string,
	itemIndex: number,
	offeringId: string | number,
	expectedOrderFormSections: string[] = DEFAULT_EXPECTED_SECTIONS,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/offerings`,
		{
			method: "POST",
			body: JSON.stringify({
				expectedOrderFormSections,
				id: offeringId,
				info: null,
			}),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function removeOffering(
	orderFormId: string,
	itemIndex: number,
	offeringId: string | number,
	expectedOrderFormSections: string[] = DEFAULT_EXPECTED_SECTIONS,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/offerings/${offeringId}/remove`,
		{
			method: "POST",
			body: JSON.stringify({ expectedOrderFormSections }),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

// ---------------------------------------------------------------------------
// Cart — attachments
// ---------------------------------------------------------------------------

export async function updateOrderFormAttachment(
	orderFormId: string,
	attachment: string,
	body: Record<string, unknown>,
	expectedOrderFormSections: string[] = DEFAULT_EXPECTED_SECTIONS,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	if (!orderFormId) throw new Error("Order form ID is required");
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/attachments/${attachment}`,
		{
			method: "POST",
			body: JSON.stringify({ expectedOrderFormSections, ...body }),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function updateItemAttachment(
	orderFormId: string,
	itemIndex: number,
	attachment: string,
	content: Record<string, unknown>,
	opts?: {
		noSplitItem?: boolean;
		expectedOrderFormSections?: string[];
		cookieHeader?: string;
	},
): Promise<VtexFetchResult<OrderForm>> {
	const sections = opts?.expectedOrderFormSections ?? DEFAULT_EXPECTED_SECTIONS;
	const headers: Record<string, string> = {};
	if (opts?.cookieHeader) headers.cookie = opts.cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/attachments/${attachment}`,
		{
			method: "POST",
			body: JSON.stringify({
				content,
				noSplitItem: opts?.noSplitItem ?? true,
				expectedOrderFormSections: sections,
			}),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function removeItemAttachment(
	orderFormId: string,
	itemIndex: number,
	attachment: string,
	content: Record<string, unknown>,
	opts?: {
		noSplitItem?: boolean;
		expectedOrderFormSections?: string[];
		cookieHeader?: string;
	},
): Promise<VtexFetchResult<OrderForm>> {
	const sections = opts?.expectedOrderFormSections ?? DEFAULT_EXPECTED_SECTIONS;
	const headers: Record<string, string> = {};
	if (opts?.cookieHeader) headers.cookie = opts.cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/items/${itemIndex}/attachments/${attachment}`,
		{
			method: "DELETE",
			body: JSON.stringify({
				content,
				noSplitItem: opts?.noSplitItem ?? true,
				expectedOrderFormSections: sections,
			}),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
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
	expectedOrderFormSections: string[] = DEFAULT_EXPECTED_SECTIONS,
	cookieHeader?: string,
): Promise<VtexFetchResult<OrderForm>> {
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/selectable-gifts/${giftId}`,
		{
			method: "POST",
			body: JSON.stringify({
				expectedOrderFormSections,
				selectedGifts,
				id: giftId,
			}),
			headers,
		},
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

// ---------------------------------------------------------------------------
// Cart — installments
// ---------------------------------------------------------------------------

export async function getInstallments(
	orderFormId: string,
	paymentSystem: number,
	cookieHeader?: string,
) {
	const params = new URLSearchParams({ paymentSystem: String(paymentSystem) });
	appendSc(params);
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	return vtexFetch<any>(`/api/checkout/pub/orderForm/${orderFormId}/installments?${params}`, {
		headers,
	});
}

// ---------------------------------------------------------------------------
// Cart — profile & messages
// ---------------------------------------------------------------------------

export async function updateOrderFormProfile(
	orderFormId: string,
	fields: Record<string, unknown>,
	opts?: { ignoreProfileData?: boolean; cookieHeader?: string },
): Promise<VtexFetchResult<OrderForm>> {
	const body = opts?.ignoreProfileData ? { ...fields, ignoreProfileData: true } : fields;
	const headers: Record<string, string> = {};
	if (opts?.cookieHeader) headers.cookie = opts.cookieHeader;
	const result = await vtexFetchWithCookies<OrderForm>(
		`/api/checkout/pub/orderForm/${orderFormId}/profile`,
		{ method: "PATCH", body: JSON.stringify(body), headers },
	);
	result.data = forceHttpsOnAssets(result.data);
	return result;
}

export async function changeToAnonymousUser(orderFormId: string): Promise<OrderForm> {
	return vtexFetch<OrderForm>(`/api/checkout/changeToAnonymousUser/${orderFormId}`);
}

export async function clearOrderFormMessages(
	orderFormId: string,
	cookieHeader?: string,
): Promise<OrderForm> {
	const headers: Record<string, string> = {};
	if (cookieHeader) headers.cookie = cookieHeader;
	return vtexFetch<OrderForm>(`/api/checkout/pub/orderForm/${orderFormId}/messages/clear`, {
		method: "POST",
		body: JSON.stringify({}),
		headers,
	});
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

export async function getSellersByRegion(
	postalCode: string,
	salesChannel?: string,
): Promise<RegionResult | null> {
	const params = new URLSearchParams({ country: "BRA", postalCode });
	const sc = salesChannel ?? getVtexConfig().salesChannel;
	if (sc) params.set("sc", sc);
	const resp = await vtexFetch<RegionResult[]>(`/api/checkout/pub/regions/?${params}`);
	return resp[0]?.sellers?.length > 0 ? resp[0] : null;
}

export async function setShippingPostalCode(
	orderFormId: string,
	postalCode: string,
	country = "BRA",
	cookieHeader?: string,
): Promise<boolean> {
	try {
		const headers: Record<string, string> = {};
		if (cookieHeader) headers.cookie = cookieHeader;
		await vtexFetch<any>(`/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`, {
			method: "POST",
			body: JSON.stringify({
				selectedAddresses: [{ postalCode, country }],
			}),
			headers,
		});
		return true;
	} catch {
		return false;
	}
}
