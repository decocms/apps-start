/**
 * VTEX Authentication Actions
 *
 * Ported from deco-cx/apps vtex/actions/authentication/*.ts
 * @see https://github.com/deco-cx/apps/tree/main/vtex/actions/authentication
 */

import type { VtexFetchResult } from "../client";
import {
	getVtexConfig,
	vtexFetchWithCookies,
} from "../client";
import { VTEX_AUTH_COOKIE } from "../utils/vtexId";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthProvider {
	providerName: string;
	className: string;
	expectedContext: unknown[];
}

export interface StartAuthentication {
	authenticationToken: string | null;
	oauthProviders: AuthProvider[];
	showClassicAuthentication: boolean;
	showAccessKeyAuthentication: boolean;
	showPasskeyAuthentication: boolean;
	authCookie: string | null;
	isAuthenticated: boolean;
	selectedProvider: string | null;
	samlProviders: unknown[];
}

export interface AuthResponse {
	authStatus: string | "WrongCredentials" | "BlockedUser" | "Success";
	promptMFA: boolean;
	clientToken: string | null;
	authCookie: { Name: string; Value: string } | null;
	accountAuthCookie: { Name: string; Value: string } | null;
	expiresIn: number;
	userId: string | null;
	phoneNumber: string | null;
	scope: string | null;
}

export interface RefreshTokenResponse {
	status: string;
	userId: string;
	refreshAfter: string;
}

/**
 * Cookies to set after a successful login.
 * Caller (server function) should use these to set cookies on the response.
 */
export interface LoginCookies {
	authCookieName: string;
	authCookieValue: string;
	accountAuthCookieName?: string;
	accountAuthCookieValue?: string;
	expiresInSeconds: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORM_HEADERS = {
	"Content-Type": "application/x-www-form-urlencoded",
	Accept: "application/json",
};

/**
 * Extract login cookies from an AuthResponse.
 * Returns null if auth failed.
 */
export function extractLoginCookies(
	response: AuthResponse,
): LoginCookies | null {
	if (response.authStatus !== "Success" || !response.authCookie) {
		return null;
	}
	return {
		authCookieName: response.authCookie.Name,
		authCookieValue: response.authCookie.Value,
		accountAuthCookieName: response.accountAuthCookie?.Name,
		accountAuthCookieValue: response.accountAuthCookie?.Value,
		expiresInSeconds: response.expiresIn,
	};
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function startAuthentication(options?: {
	callbackUrl?: string;
	returnUrl?: string;
	locale?: string;
	appStart?: boolean;
}): Promise<VtexFetchResult<StartAuthentication>> {
	const config = getVtexConfig();
	const {
		callbackUrl = "/",
		returnUrl = "/",
		locale = config.locale ?? "pt-BR",
		appStart = true,
	} = options ?? {};

	const params = new URLSearchParams({
		locale,
		scope: config.account,
		appStart: String(appStart),
		callbackUrl,
		returnUrl,
	});

	return vtexFetchWithCookies<StartAuthentication>(
		`/api/vtexid/pub/authentication/start?${params}`,
	);
}

/**
 * Classic email + password sign-in.
 * Calls startAuthentication internally if no authenticationToken provided.
 */
export async function classicSignIn(
	email: string,
	password: string,
	authenticationToken?: string,
): Promise<VtexFetchResult<AuthResponse>> {
	let token = authenticationToken;
	let startCookies: string[] = [];
	if (!token) {
		const startResult = await startAuthentication();
		token = startResult.data.authenticationToken ?? undefined;
		startCookies = startResult.setCookies;
		if (!token)
			throw new Error(
				"Failed to obtain authentication token from startAuthentication",
			);
	}

	const body = new URLSearchParams({
		email,
		password,
		authenticationToken: token,
	});
	const result = await vtexFetchWithCookies<AuthResponse>(
		"/api/vtexid/pub/authentication/classic/validate",
		{ method: "POST", body, headers: FORM_HEADERS },
	);
	result.setCookies = [...startCookies, ...result.setCookies];
	return result;
}

/**
 * Passwordless sign-in via email access key.
 * Reads VtexSessionToken from cookie if not provided directly.
 */
export async function accessKeySignIn(
	email: string,
	accessKey: string,
	authenticationToken: string,
): Promise<VtexFetchResult<AuthResponse>> {
	const body = new URLSearchParams({
		login: email,
		accessKey,
		authenticationToken,
	});

	return vtexFetchWithCookies<AuthResponse>(
		"/api/vtexid/pub/authentication/accesskey/validate",
		{ method: "POST", body, headers: FORM_HEADERS },
	);
}

/**
 * Logout — returns list of cookie names that must be cleared (Max-Age=0).
 * Also calls deleteSession if a sessionId cookie is available.
 */
export function logout(): { cookiesToClear: string[] } {
	const { account } = getVtexConfig();
	return {
		cookiesToClear: [
			VTEX_AUTH_COOKIE,
			`${VTEX_AUTH_COOKIE}_${account}`,
			"vid_rt",
			`vid_rt_${account}`,
		],
	};
}

/**
 * Refreshes the VTEX auth token using existing session cookies.
 */
export async function refreshToken(
	cookieHeader: string,
	fingerprint?: string,
): Promise<VtexFetchResult<RefreshTokenResponse>> {
	return vtexFetchWithCookies<RefreshTokenResponse>(
		"/api/vtexid/refreshtoken/webstore",
		{
			method: "POST",
			body: JSON.stringify({ fingerprint }),
			headers: { cookie: cookieHeader },
		},
	);
}

/**
 * Sets a new password using an email access key (password-recovery flow).
 */
export async function recoveryPassword(
	email: string,
	newPassword: string,
	accessKey: string,
	authenticationToken: string,
	locale?: string,
): Promise<VtexFetchResult<AuthResponse>> {
	const config = getVtexConfig();

	const params = new URLSearchParams({
		scope: config.account,
		locale: locale ?? config.locale ?? "pt-BR",
	});

	const body = new URLSearchParams({
		login: email,
		accessKey,
		newPassword,
		authenticationToken,
	});

	return vtexFetchWithCookies<AuthResponse>(
		`/api/vtexid/pub/authentication/classic/setpassword?${params}`,
		{ method: "POST", body, headers: FORM_HEADERS },
	);
}

/**
 * Resets password for an already-authenticated user.
 * Calls startAuthentication internally if no authenticationToken provided.
 */
export async function resetPassword(
	email: string,
	currentPassword: string,
	newPassword: string,
	authenticationToken?: string,
	locale?: string,
): Promise<VtexFetchResult<AuthResponse>> {
	const config = getVtexConfig();

	let token = authenticationToken;
	let startCookies: string[] = [];
	if (!token) {
		const startResult = await startAuthentication({ locale });
		token = startResult.data.authenticationToken ?? undefined;
		startCookies = startResult.setCookies;
		if (!token)
			throw new Error(
				"Failed to obtain authentication token from startAuthentication",
			);
	}

	const params = new URLSearchParams({
		scope: config.account,
		locale: locale ?? config.locale ?? "pt-BR",
	});

	const body = new URLSearchParams({
		login: email,
		currentPassword,
		newPassword,
		authenticationToken: token,
	});

	const result = await vtexFetchWithCookies<AuthResponse>(
		`/api/vtexid/pub/authentication/classic/setpassword?${params}`,
		{ method: "POST", body, headers: FORM_HEADERS },
	);
	result.setCookies = [...startCookies, ...result.setCookies];
	return result;
}

/**
 * Sends an access-key verification email.
 * Calls startAuthentication internally if no authenticationToken provided.
 * Returns { success, authenticationToken, setCookies }.
 */
export async function sendEmailVerification(
	email: string,
	authenticationToken?: string,
	locale?: string,
	parentAppId?: string,
): Promise<{
	success: boolean;
	authenticationToken: string | null;
	setCookies: string[];
}> {
	try {
		let token = authenticationToken;
		let startCookies: string[] = [];

		if (!token) {
			const startResult = await startAuthentication({ locale });
			token = startResult.data.authenticationToken ?? undefined;
			startCookies = startResult.setCookies;
			if (!token) throw new Error("Failed to obtain authentication token");
		}

		const body = new URLSearchParams({ authenticationToken: token, email });
		if (locale) body.append("locale", locale);
		if (parentAppId) body.append("parentAppId", parentAppId);

		const result = await vtexFetchWithCookies<Record<string, string>>(
			"/api/vtexid/pub/authentication/accesskey/send?deliveryMethod=email",
			{ method: "POST", body, headers: FORM_HEADERS },
		);

		if (result.data?.authStatus === "InvalidToken") {
			throw new Error("Authentication token is invalid");
		}

		return {
			success: true,
			authenticationToken: token,
			setCookies: [...startCookies, ...result.setCookies],
		};
	} catch (error) {
		console.error("[sendEmailVerification]", error);
		return { success: false, authenticationToken: null, setCookies: [] };
	}
}
