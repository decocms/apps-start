import type { MatchContext } from "../types";

/**
 * @title Cookie
 */
export interface Props {
	name: string;
	value: string;
}

function parseCookies(headers: Headers): Record<string, string> {
	const cookieHeader = headers.get("cookie") || "";
	const cookies: Record<string, string> = {};
	for (const pair of cookieHeader.split(";")) {
		const [key, ...rest] = pair.split("=");
		if (key) {
			cookies[key.trim()] = rest.join("=").trim();
		}
	}
	return cookies;
}

/**
 * @title Cookie
 * @description Target users that have a specific cookie
 * @icon cookie
 */
const MatchCookie = ({ name, value }: Props, { request }: MatchContext) => {
	const cookies = parseCookies(request.headers);
	return cookies[name] === value;
};

export default MatchCookie;
