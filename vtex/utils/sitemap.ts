/**
 * VTEX Sitemap utility.
 *
 * Fetches product and category URLs from VTEX's sitemap API
 * and converts them to SitemapEntry format for composition
 * with the CMS sitemap generator.
 */

import { getVtexConfig, vtexFetchResponse, vtexHost } from "../client";

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Fetch sitemap entries from VTEX's sitemap API.
 *
 * VTEX exposes /sitemap.xml which contains links to sub-sitemaps
 * (products, categories, brands, etc.). This function fetches the
 * main sitemap index and extracts all <loc> entries from the
 * referenced sub-sitemaps.
 *
 * @param origin - The storefront origin (e.g., "https://www.mystore.com")
 * @param options.maxDepth - How many levels of sub-sitemaps to follow (default: 1)
 * @param options.rewriteHost - Whether to rewrite VTEX hostnames to the storefront origin (default: true)
 */
export async function getVtexSitemapEntries(
  origin: string,
  options?: {
    maxDepth?: number;
    rewriteHost?: boolean;
    includeBrands?: boolean;
    includeCategories?: boolean;
    includeProducts?: boolean;
  },
): Promise<SitemapEntry[]> {
  const config = getVtexConfig();
  const vtexSitemapHost = vtexHost("vtexcommercestable", config);
  const rewrite = options?.rewriteHost !== false;
  const includeProducts = options?.includeProducts !== false;
  const includeCategories = options?.includeCategories !== false;
  const includeBrands = options?.includeBrands !== false;

  try {
    const mainSitemapUrl = `https://${vtexSitemapHost}/sitemap.xml`;
    const mainResponse = await vtexFetchResponse(mainSitemapUrl);
    const mainXml = await mainResponse.text();

    const subSitemapUrls = extractLocs(mainXml);
    const entries: SitemapEntry[] = [];

    const filteredUrls = subSitemapUrls.filter((url) => {
      const lower = url.toLowerCase();
      if (!includeProducts && lower.includes("product")) return false;
      if (!includeCategories && lower.includes("categor")) return false;
      if (!includeBrands && lower.includes("brand")) return false;
      return true;
    });

    const maxDepth = options?.maxDepth ?? 1;
    if (maxDepth < 1) {
      return filteredUrls.map((url) => ({
        loc: rewrite ? rewriteUrl(url, vtexSitemapHost, origin) : url,
        changefreq: "daily" as const,
        priority: 0.5,
      }));
    }

    const settled = await Promise.allSettled(
      filteredUrls.map(async (subUrl) => {
        try {
          const resp = await vtexFetchResponse(subUrl);
          const xml = await resp.text();
          return extractLocs(xml);
        } catch {
          return [];
        }
      }),
    );

    const today = new Date().toISOString().split("T")[0];

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      for (const loc of result.value) {
        entries.push({
          loc: rewrite ? rewriteUrl(loc, vtexSitemapHost, origin) : loc,
          lastmod: today,
          changefreq: "daily",
          priority: 0.5,
        });
      }
    }

    return entries;
  } catch (error) {
    console.error("[VTEX Sitemap] Failed to fetch VTEX sitemap:", error);
    return [];
  }
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const regex = /<loc>\s*(.*?)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1]) locs.push(match[1].trim());
  }
  return locs;
}

function rewriteUrl(url: string, vtexSitemapHost: string, origin: string): string {
  try {
    const parsed = new URL(url);
    const originParsed = new URL(origin);
    const config = getVtexConfig();
    const domain = config.domain ?? "com.br";
    if (
      parsed.hostname === vtexSitemapHost ||
      parsed.hostname.endsWith(`.vtexcommercestable.${domain}`)
    ) {
      parsed.protocol = originParsed.protocol;
      parsed.hostname = originParsed.hostname;
      parsed.port = originParsed.port;
    }
    return parsed.toString();
  } catch {
    return url.replace(`https://${vtexSitemapHost}`, origin);
  }
}
