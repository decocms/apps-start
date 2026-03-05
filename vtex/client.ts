/**
 * VTEX API Client for TanStack Start.
 * Uses VTEX's public REST APIs (Intelligent Search + Catalog + Checkout).
 */

export interface VtexConfig {
  account: string;
  publicUrl?: string;
  salesChannel?: string;
  locale?: string;
  appKey?: string;
  appToken?: string;
}

let _config: VtexConfig | null = null;

export function configureVtex(config: VtexConfig) {
  _config = config;
  console.log(`[VTEX] Configured: ${config.account}.vtexcommercestable.com.br`);
}

export function getVtexConfig(): VtexConfig {
  if (!_config) throw new Error("VTEX not configured. Call configureVtex() first.");
  return _config;
}

function baseUrl(): string {
  const c = getVtexConfig();
  return `https://${c.account}.vtexcommercestable.com.br`;
}

function isUrl(): string {
  const c = getVtexConfig();
  return `https://${c.account}.vtexcommercestable.com.br/api/io/_v/api/intelligent-search`;
}

function authHeaders(): Record<string, string> {
  const c = getVtexConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (c.appKey && c.appToken) {
    headers["X-VTEX-API-AppKey"] = c.appKey;
    headers["X-VTEX-API-AppToken"] = c.appToken;
  }
  return headers;
}

export async function vtexFetchResponse(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`VTEX API error: ${response.status} ${response.statusText} - ${url}`);
  }
  return response;
}

export async function vtexFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await vtexFetchResponse(path, init);
  return response.json();
}

export async function intelligentSearch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${isUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const c = getVtexConfig();
  if (c.salesChannel) url.searchParams.set("sc", c.salesChannel);

  const response = await fetch(url.toString(), { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`VTEX IS error: ${response.status} - ${url}`);
  }
  return response.json();
}

/**
 * Execute a GraphQL query against the VTEX IO Runtime (myvtex.com).
 * Used for private profile/session/wishlist/payment queries that the
 * original Deco loaders called via `ctx.io.query(...)`.
 */
export async function vtexIOGraphQL<T>(
  body: {
    query: string;
    variables?: Record<string, unknown> | null;
    operationName?: string;
  },
  headers?: Record<string, string>,
): Promise<T> {
  const { account } = getVtexConfig();
  const res = await vtexFetch<{ data: T; errors?: Array<{ message: string }> }>(
    `https://${account}.myvtex.com/_v/private/graphql/v1`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  if (res.errors?.length) {
    throw new Error(`VTEX IO GraphQL error: ${res.errors.map((e) => e.message).join(", ")}`);
  }
  return res.data;
}

export function initVtexFromBlocks(blocks: Record<string, any>) {
  const vtexBlock = blocks["vtex"] || blocks["deco-vtex"];
  if (!vtexBlock) {
    console.warn("[VTEX] No vtex.json block found.");
    return;
  }
  configureVtex({
    account: vtexBlock.account,
    publicUrl: vtexBlock.publicUrl,
    salesChannel: vtexBlock.salesChannel || "1",
    appKey: vtexBlock.appKey,
    appToken: vtexBlock.appToken,
  });
}
