/**
 * Core types for the Deco app system on TanStack Start.
 *
 * Each app (vtex, shopify, resend, etc.) exports a `configure` function
 * from its `mod.ts` that returns an `AppDefinition`.
 *
 * The framework's `autoconfigApps()` calls these generically.
 */

export type AppHandler = (props: any, request: Request) => Promise<any>;

export interface AppManifest {
	name: string;
	/** Module namespace imports keyed by manifest path (e.g. "vtex/loaders/catalog"). */
	loaders: Record<string, Record<string, unknown>>;
	/** Module namespace imports keyed by manifest path (e.g. "vtex/actions/checkout"). */
	actions: Record<string, Record<string, unknown>>;
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
}

export type ResolveSecretFn = (
	value: unknown,
	envKey: string,
) => Promise<string | null>;

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
