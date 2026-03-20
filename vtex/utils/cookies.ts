interface Cookie {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: Date;
	maxAge?: number;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: "Strict" | "Lax" | "None";
}

function getSetCookies(headers: Headers): Cookie[] {
	const cookies: Cookie[] = [];
	headers.forEach((value, key) => {
		if (key.toLowerCase() !== "set-cookie") return;
		const parts = value.split(";").map((p) => p.trim());
		const [nameValue, ...attrs] = parts;
		const eqIdx = nameValue.indexOf("=");
		if (eqIdx < 0) return;
		const cookie: Cookie = {
			name: nameValue.slice(0, eqIdx),
			value: nameValue.slice(eqIdx + 1),
		};
		for (const attr of attrs) {
			const [k, v] = attr.split("=").map((s) => s.trim());
			const lower = k.toLowerCase();
			if (lower === "domain") cookie.domain = v;
			else if (lower === "path") cookie.path = v;
			else if (lower === "secure") cookie.secure = true;
			else if (lower === "httponly") cookie.httpOnly = true;
			else if (lower === "samesite") cookie.sameSite = v as Cookie["sameSite"];
		}
		cookies.push(cookie);
	});
	return cookies;
}

function setCookie(headers: Headers, cookie: Cookie): void {
	let str = `${cookie.name}=${cookie.value}`;
	if (cookie.domain) str += `; Domain=${cookie.domain}`;
	if (cookie.path) str += `; Path=${cookie.path}`;
	if (cookie.secure) str += "; Secure";
	if (cookie.httpOnly) str += "; HttpOnly";
	if (cookie.sameSite) str += `; SameSite=${cookie.sameSite}`;
	if (cookie.maxAge != null) str += `; Max-Age=${cookie.maxAge}`;
	if (cookie.expires) str += `; Expires=${cookie.expires.toUTCString()}`;
	headers.append("Set-Cookie", str);
}

export const stringify = (cookies: Record<string, string>) =>
	Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
		.join("; ");

export const proxySetCookie = (from: Headers, to: Headers, toDomain?: URL | string) => {
	const newDomain = toDomain && new URL(toDomain);

	for (const cookie of getSetCookies(from)) {
		const newCookie = newDomain
			? {
					...cookie,
					domain: newDomain.hostname,
				}
			: cookie;

		setCookie(to, newCookie);
	}
};

export const CHECKOUT_DATA_ACCESS_COOKIE = "CheckoutDataAccess";
export const VTEX_CHKO_AUTH = "Vtex_CHKO_Auth";
