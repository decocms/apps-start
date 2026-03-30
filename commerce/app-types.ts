/**
 * Core types for the Deco app system on TanStack Start.
 *
 * Each app (vtex, shopify, resend, etc.) exports a `configure` function
 * from its `mod.ts` that returns an `AppDefinition`.
 *
 * The framework's `autoconfigApps()` calls these generically.
 */

import type { ComponentType } from "react";

export type AppHandler = (props: any, request: Request) => Promise<any>;

export interface SectionModule {
	default: ComponentType<any>;
	loader?: (...args: any[]) => Promise<any> | any;
	LoadingFallback?: ComponentType;
	ErrorFallback?: ComponentType<{ error: Error }>;
}

export interface AppManifest {
	name: string;
	/** Module namespace imports keyed by manifest path (e.g. "vtex/loaders/catalog"). */
	loaders: Record<string, Record<string, unknown>>;
	/** Module namespace imports keyed by manifest path (e.g. "vtex/actions/checkout"). */
	actions: Record<string, Record<string, unknown>>;
	/** Lazy-loaded section components keyed by manifest path (e.g. "vtex/sections/Analytics/Vtex"). */
	sections?: Record<string, () => Promise<SectionModule>>;
}

export interface AppMiddleware {
	(request: Request, next: () => Promise<Response>): Promise<Response>;
}

export interface AppDefinition<TState = unknown> {
	name: string;
	manifest: AppManifest;
	state: TState;
	middleware?: AppMiddleware;
	dependencies?: AppDefinition[];
	resolvables?: Record<string, { __resolveType: string; [key: string]: unknown }>;
}

export type ResolveSecretFn = (
	value: unknown,
	envKey: string,
) => Promise<string | null>;

export interface AppPreview {
	Component: ComponentType<any>;
	props: Record<string, unknown>;
}

/**
 * Standard contract for Deco apps with auto-configuration.
 *
 * Each app exports `configure` from its `mod.ts`.
 * Apps that need invoke handlers (e.g. resend) also export a `handlers` map.
 * The framework discovers and calls these generically.
 */
export interface AppModContract<TState = unknown> {
	configure: (
		blockData: any,
		resolveSecret: ResolveSecretFn,
	) => Promise<AppDefinition<TState> | null>;
	handlers?: Record<string, AppHandler>;
}
