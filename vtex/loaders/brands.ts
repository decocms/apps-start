/**
 * VTEX brand loaders.
 * @see https://developers.vtex.com/docs/api-reference/catalog-api#get-/api/catalog_system/pub/brand/list
 */
import { vtexFetch } from "../client";

export interface VtexBrand {
  id: number;
  name: string;
  isActive: boolean;
  title: string;
  metaTagDescription: string;
  imageUrl: string | null;
}

/**
 * List all active brands from the VTEX catalog.
 */
export async function listBrands(): Promise<VtexBrand[]> {
  const brands = await vtexFetch<VtexBrand[]>(
    "/api/catalog_system/pub/brand/list",
  );
  return brands.filter((b) => b.isActive);
}

/**
 * Get a single brand by ID.
 */
export async function getBrandById(brandId: number): Promise<VtexBrand | null> {
  try {
    return await vtexFetch<VtexBrand>(
      `/api/catalog_system/pub/brand/${brandId}`,
    );
  } catch {
    return null;
  }
}
