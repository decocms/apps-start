/**
 * Pre-wired instrumented fetch factory for Shopify.
 *
 * Mirrors `vtex/utils/instrumentedFetch.ts`. Bundles:
 *
 *   1. `createInstrumentedFetch` from `@decocms/start` (spans,
 *      traceparent, URL redaction).
 *   2. `shopifyOperationRouter` as the URL fallback for non-GraphQL
 *      and unnamed-GraphQL calls.
 *   3. An `onComplete` that records `commerce_request_duration_ms`
 *      with `provider: "shopify"`.
 *
 * Sites do:
 *
 *   ```ts
 *   import { setShopifyFetch, createShopifyFetch } from "@decocms/apps/shopify";
 *   setShopifyFetch(createShopifyFetch());
 *   ```
 *
 * Per-call operation names come from `extractGraphqlOperationName`
 * (wired in `./graphql.ts`); the URL router fires only when the
 * extractor returns `undefined`.
 */

import {
	createInstrumentedFetch,
	type InstrumentedFetch,
} from "@decocms/start/sdk/instrumentedFetch";
import { getMeter } from "@decocms/start/sdk/observability";
import { shopifyOperationRouter } from "./operationRouter";

const HISTOGRAM_NAME = "commerce_request_duration_ms";

export interface CreateShopifyFetchOptions {
	baseFetch?: typeof fetch;
	disableHistogram?: boolean;
}

export function createShopifyFetch(options: CreateShopifyFetchOptions = {}): InstrumentedFetch {
	const { baseFetch, disableHistogram = false } = options;
	return createInstrumentedFetch({
		name: "shopify",
		baseFetch,
		resolveOperation: shopifyOperationRouter,
		onComplete: disableHistogram
			? undefined
			: ({ operation, status, durationMs, cached }) => {
					const meter = getMeter();
					meter?.histogramRecord?.(HISTOGRAM_NAME, durationMs, {
						provider: "shopify",
						operation,
						status_code: String(status),
						cached: cached ? "true" : "false",
					});
				},
	});
}
