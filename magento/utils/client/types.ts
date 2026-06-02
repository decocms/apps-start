/**
 * Magento REST API response shapes — the subset of types from
 * `deco-cx/apps/magento/utils/client/types.ts` that the port has
 * reached so far. Extended as more loaders/actions land.
 *
 * Keep field names **exactly** as Magento returns them (snake_case
 * mostly, occasional camelCase from carbono-customer). Consumer sites
 * already render against these shapes — any rename is a breaking
 * change at the storefront, not just the API boundary.
 */

// ---------------------------------------------------------------------------
// Customer / user section payloads
// ---------------------------------------------------------------------------

/**
 * `customer` slice of `/customer/section/load?sections=customer,…`.
 * Magento returns this on every authenticated section call.
 */
export interface Customer {
	data_id: number;
	fullname?: string;
	firstname?: string;
}

/**
 * `carbono-customer` slice. Granado-specific overlay that mirrors the
 * `customer` slice plus a website/store id pair and a normalized email.
 * Other magento sites that don't run the Carbono module will get this
 * absent; loaders/user.ts checks for it before mapping to a Person.
 */
export interface CarbonoCustomer {
	websiteId?: string;
	email?: string;
	customerId?: string;
	data_id: number;
}

/**
 * `cart` slice of the customer section bundle — minimal projection of
 * the cart that the minicart island renders before the full cart loader
 * has resolved. Not the same as the full Cart payload from
 * `/V1/carts/:cartId` (which lives in MagentoCart in types.ts).
 */
export interface CartUser {
	summary_count: number;
	subtotalAmount: number | null;
	subtotal: string;
	possible_onepage_checkout: boolean;
	items: [];
	isGuestCheckoutAllowed: boolean;
	website_id: string;
	storeId: string;
	adyen_payment_methods: unknown[];
	extra_actions: string;
	cart_empty_message: string;
	subtotal_incl_tax: string;
	subtotal_excl_tax: string;
	mpFSBCartTotal: unknown | null;
	data_id: number;
	minicart_improvements: MinicartImprovements;
}

export interface MinicartImprovements {
	coupon_code: string | null;
	country_id: string;
	api_base_url: string;
	is_logged_in: boolean;
	quote_id: string;
	base_url: string;
}

/**
 * Bundle shape returned by
 * `GET /:site/customer/section/load?sections=customer,carbono-customer,wishlist,…`.
 * Keys are optional because the caller picks which sections to request.
 */
export interface CustomerSectionLoad {
	customer?: Customer;
	"carbono-customer"?: CarbonoCustomer;
	cart?: CartUser;
	wishlist?: Wishlist;
}

// ---------------------------------------------------------------------------
// Wishlist payloads
// ---------------------------------------------------------------------------

export interface Wishlist {
	counter: string;
	items: WishlistItem[];
	counter_number: number;
	data_id: number;
}

export interface WishlistItem {
	image: WishlistItemImage;
	product_sku: string;
	product_id: string;
	product_url: string;
	product_name: string;
	product_price: string;
	product_is_saleable_and_visible: boolean;
	product_has_required_options: boolean;
	add_to_cart_params: string;
	delete_item_params: string;
}

export interface WishlistItemImage {
	template: string;
	src: string;
	width: number;
	height: number;
	alt: string;
}
