import type { ResendConfig } from "./types";

let _config: ResendConfig | null = null;

/**
 * Configure the Resend client. Call once in your site's setup.ts.
 *
 * ```ts
 * import { configureResend } from "@decocms/apps/resend/client";
 *
 * configureResend({
 *   apiKey: process.env.RESEND_API_KEY!,
 *   emailFrom: "Contact <hello@example.com>",
 *   emailTo: ["team@example.com"],
 *   subject: "Contact form submission",
 * });
 * ```
 */
export function configureResend(config: ResendConfig) {
	_config = config;
}

export function getResendConfig(): ResendConfig {
	if (!_config) {
		throw new Error(
			"Resend not configured. Call configureResend() in setup.ts before using Resend actions.",
		);
	}
	return _config;
}
