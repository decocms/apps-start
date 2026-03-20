/**
 * SEO JSON-LD structured data components.
 *
 * Generates JSON-LD script tags for Product (PDP), ProductList (PLP),
 * and BreadcrumbList schemas. Compatible with Google's Rich Results
 * requirements.
 *
 * @example
 * ```tsx
 * import { ProductJsonLd, PLPJsonLd, BreadcrumbJsonLd } from "@decocms/apps/commerce/components/JsonLd";
 *
 * // In a PDP route
 * <ProductJsonLd product={product} />
 *
 * // In a PLP route
 * <PLPJsonLd page={productListingPage} />
 *
 * // Anywhere with breadcrumbs
 * <BreadcrumbJsonLd breadcrumb={breadcrumbList} />
 * ```
 */

import type {
	AggregateOffer,
	AggregateRating,
	BreadcrumbList,
	ListItem,
	Offer,
	Product,
	ProductListingPage,
	UnitPriceSpecification,
} from "../types/commerce";

// -------------------------------------------------------------------------
// JSON-LD script renderer
// -------------------------------------------------------------------------

function JsonLdScript({ data }: { data: unknown }) {
	return (
		<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
	);
}

// -------------------------------------------------------------------------
// Product (PDP)
// -------------------------------------------------------------------------

export interface ProductJsonLdProps {
	product: Product;
	/** Override the canonical URL. Defaults to product.url. */
	url?: string;
}

function getBestOffer(offers: Offer[] | AggregateOffer | undefined): {
	price?: number;
	priceCurrency?: string;
	availability?: string;
	seller?: string;
	priceValidUntil?: string;
} {
	if (!offers) return {};

	if ("@type" in offers && offers["@type"] === "AggregateOffer") {
		const agg = offers as AggregateOffer;
		return {
			price: agg.lowPrice,
			priceCurrency: agg.priceCurrency,
		};
	}

	if (Array.isArray(offers) && offers.length > 0) {
		const best = offers.reduce((a, b) => {
			const ap = a.price ?? Infinity;
			const bp = b.price ?? Infinity;
			return ap <= bp ? a : b;
		});
		return {
			price: best.price,
			priceCurrency: best.priceCurrency,
			availability: best.availability,
			seller: best.seller,
			priceValidUntil: best.priceValidUntil,
		};
	}

	return {};
}

function _getListPrice(priceSpec: UnitPriceSpecification[] | undefined): number | undefined {
	if (!priceSpec) return undefined;
	const list = priceSpec.find(
		(p) =>
			p.priceType === "https://schema.org/ListPrice" || p.priceType === "https://schema.org/SRP",
	);
	return list?.price;
}

export function ProductJsonLd({ product, url }: ProductJsonLdProps) {
	const offer = getBestOffer(product.offers as Offer[] | AggregateOffer | undefined);
	const images = product.image?.map((img) => img.url).filter(Boolean) ?? [];
	const rating = product.aggregateRating as AggregateRating | undefined;

	const data: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: product.name,
		description: product.description,
		image: images.length === 1 ? images[0] : images,
		url: url ?? product.url,
		sku: product.sku,
		productID: product.productID,
		brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
		gtin: product.gtin,
	};

	if (offer.price != null) {
		data.offers = {
			"@type": "Offer",
			price: offer.price,
			priceCurrency: offer.priceCurrency ?? "BRL",
			availability: offer.availability ?? "https://schema.org/InStock",
			seller: offer.seller ? { "@type": "Organization", name: offer.seller } : undefined,
			priceValidUntil: offer.priceValidUntil,
			url: url ?? product.url,
		};
	}

	if (rating?.ratingValue) {
		data.aggregateRating = {
			"@type": "AggregateRating",
			ratingValue: rating.ratingValue,
			reviewCount: rating.reviewCount ?? rating.ratingCount ?? 0,
			bestRating: rating.bestRating ?? 5,
			worstRating: rating.worstRating ?? 1,
		};
	}

	return <JsonLdScript data={data} />;
}

// -------------------------------------------------------------------------
// Product Listing Page (PLP)
// -------------------------------------------------------------------------

export interface PLPJsonLdProps {
	page: ProductListingPage;
	/** Override the canonical URL. */
	url?: string;
}

export function PLPJsonLd({ page, url }: PLPJsonLdProps) {
	const items = (page.products ?? []).map((product, index) => {
		const offer = getBestOffer(product.offers as Offer[] | AggregateOffer | undefined);
		return {
			"@type": "ListItem" as const,
			position: index + 1,
			item: {
				"@type": "Product" as const,
				name: product.name,
				url: product.url,
				image: product.image?.[0]?.url,
				offers:
					offer.price != null
						? {
								"@type": "Offer" as const,
								price: offer.price,
								priceCurrency: offer.priceCurrency ?? "BRL",
								availability: offer.availability ?? "https://schema.org/InStock",
							}
						: undefined,
			},
		};
	});

	const data = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		url: url ?? page.seo?.canonical,
		name: page.seo?.title,
		description: page.seo?.description,
		numberOfItems: page.products?.length ?? 0,
		itemListElement: items,
	};

	return <JsonLdScript data={data} />;
}

// -------------------------------------------------------------------------
// Breadcrumb
// -------------------------------------------------------------------------

export interface BreadcrumbJsonLdProps {
	breadcrumb: BreadcrumbList;
}

export function BreadcrumbJsonLd({ breadcrumb }: BreadcrumbJsonLdProps) {
	const items = (breadcrumb.itemListElement ?? []).map((item, index) => {
		const listItem = item as ListItem;
		return {
			"@type": "ListItem" as const,
			position: listItem.position ?? index + 1,
			name: listItem.name,
			item: listItem.item ?? listItem.url,
		};
	});

	const data = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items,
		numberOfItems: items.length,
	};

	return <JsonLdScript data={data} />;
}

// -------------------------------------------------------------------------
// Generic SEO Meta
// -------------------------------------------------------------------------

export interface SeoMetaProps {
	title?: string;
	description?: string;
	canonical?: string;
	image?: string;
	noIndex?: boolean;
	type?: "website" | "article" | "product";
	siteName?: string;
}

/**
 * Generates Open Graph and Twitter Card meta tags.
 *
 * Use this in combination with TanStack Router's `meta()` route option,
 * or render directly in the component tree (tags will be hoisted to <head>
 * by React's built-in behavior with TanStack Start).
 */
export function seoMetaTags(props: SeoMetaProps): Array<Record<string, string>> {
	const tags: Array<Record<string, string>> = [];

	if (props.title) {
		tags.push({ title: props.title });
		tags.push({ property: "og:title", content: props.title });
		tags.push({ name: "twitter:title", content: props.title });
	}

	if (props.description) {
		tags.push({ name: "description", content: props.description });
		tags.push({ property: "og:description", content: props.description });
		tags.push({ name: "twitter:description", content: props.description });
	}

	if (props.canonical) {
		tags.push({ property: "og:url", content: props.canonical });
	}

	if (props.image) {
		tags.push({ property: "og:image", content: props.image });
		tags.push({ name: "twitter:image", content: props.image });
		tags.push({ name: "twitter:card", content: "summary_large_image" });
	}

	if (props.type) {
		tags.push({ property: "og:type", content: props.type });
	}

	if (props.siteName) {
		tags.push({ property: "og:site_name", content: props.siteName });
	}

	if (props.noIndex) {
		tags.push({ name: "robots", content: "noindex, nofollow" });
	}

	return tags;
}
