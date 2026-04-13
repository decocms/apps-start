/**
 * Website app singleton configuration.
 *
 * Follows the same pattern as vtex/client.ts and resend/client.ts.
 */

import type { WebsiteConfig } from "./types";

let _config: WebsiteConfig | null = null;

export function configureWebsite(config: WebsiteConfig): void {
	_config = config;
}

export function getWebsiteConfig(): WebsiteConfig {
	if (!_config) {
		throw new Error("Website app not configured. Call configureWebsite() first.");
	}
	return _config;
}
