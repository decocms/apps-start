/**
 * VTEX Intelligent Search analytics event — mirrors deco-cx/apps
 * `vtex/actions/analytics/sendEvent.ts` adapted for apps-start.
 *
 * The original used `ctx.bag` to retrieve IS cookies and a typed `sp` client.
 * In apps-start, we read the IS cookies directly from the request headers and
 * dispatch via the shared `intelligentSearch()` helper which respects the
 * configured account/environment.
 *
 * @see https://developers.vtex.com/docs/api-reference/intelligent-search-api#post-/event-api/v1/-account-/event
 */

import { getVtexConfig } from "../../client";
import { ANONYMOUS_COOKIE, SESSION_COOKIE } from "../../utils/intelligentSearch";

export type Props =
	| {
			type: "session.ping";
			url: string;
	  }
	| {
			type: "page.cart";
			products: { productId: string; quantity: number }[];
	  }
	| {
			type: "page.empty_cart";
			// Empty array would serialize as an invalid JSON schema, so accept anything.
			products: unknown;
	  }
	| {
			type: "page.confirmation";
			order: string;
			products: { productId: string; quantity: number; price: number }[];
	  }
	| {
			type: "search.click";
			position: number;
			text: string;
			productId: string;
			url: string;
	  }
	| {
			type: "search.query";
			url: string;
			text: string;
			misspelled: boolean;
			match: number;
			operator: string;
			locale: string;
	  };

const readCookie = (cookieHeader: string, name: string): string | undefined => {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
	return match?.[1];
};

/**
 * @title Send Analytics Event
 * @description POST a VTEX Intelligent Search analytics event for the current session.
 */
const action = async (
	props: Props,
	req: Request,
	// `_ctx` is accepted (and ignored) for signature parity with sites that
	// pass their own context object as the third argument.
	_ctx?: unknown,
): Promise<null> => {
	const { account } = getVtexConfig();
	const cookieHeader = req.headers.get("cookie") ?? "";
	const session = readCookie(cookieHeader, SESSION_COOKIE);
	const anonymous = readCookie(cookieHeader, ANONYMOUS_COOKIE);

	if (!session || !anonymous) {
		throw new Error("Missing IS Cookies");
	}

	const url = `https://sp.vtex.com/event-api/v1/${account}/event`;
	await fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			...props,
			session,
			anonymous,
			agent: req.headers.get("user-agent") || "deco-sites/apps",
		}),
	});

	return null;
};

export default action;
