/**
 * Resend app module — standard autoconfig contract.
 *
 * Each Deco app exports:
 * - `configure(blockData, resolveSecret)` — set up the client from CMS block data
 * - `handlers` — record of invoke handler keys → handler functions
 *
 * The framework's `autoconfigApps()` calls these generically — no hardcoded
 * app knowledge needed in the framework.
 */

import { configureResend } from "./client";
import { sendEmail } from "./actions/send";

export interface AppModContract {
	configure: (
		blockData: any,
		resolveSecret: (value: unknown, envKey: string) => Promise<string | null>,
	) => Promise<boolean>;
	handlers: Record<string, (props: any, request: Request) => Promise<any>>;
}

/**
 * Configure Resend from CMS block data.
 * Returns true if configured successfully, false if missing credentials.
 */
export async function configure(
	block: any,
	resolveSecret: (value: unknown, envKey: string) => Promise<string | null>,
): Promise<boolean> {
	const apiKey = await resolveSecret(block.apiKey, "RESEND_API_KEY");
	if (!apiKey) return false;

	configureResend({
		apiKey,
		emailFrom: block.emailFrom
			? `${block.emailFrom.name || "Contact"} <${block.emailFrom.domain || "onboarding@resend.dev"}>`
			: undefined,
		emailTo: block.emailTo,
		subject: block.subject,
	});

	return true;
}

/**
 * Invoke handlers registered under /deco/invoke/{key}.
 * Both with and without .ts suffix for compatibility.
 */
export const handlers: Record<string, (props: any, request: Request) => Promise<any>> = {
	"resend/actions/emails/send": (props) => sendEmail(props),
	"resend/actions/emails/send.ts": (props) => sendEmail(props),
};
