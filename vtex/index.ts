/**
 * VTEX app entry point for @decocms/apps.
 * Re-exports the client configuration and block initializer.
 */
export { configureVtex, getVtexConfig, vtexFetch, intelligentSearch, initVtexFromBlocks } from "./client";
export type { VtexConfig } from "./client";
