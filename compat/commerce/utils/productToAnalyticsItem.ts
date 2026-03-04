import type { Product } from "../../../commerce/types/commerce";

export interface AnalyticsItem {
  item_id?: string;
  item_name?: string;
  item_brand?: string;
  item_category?: string;
  price?: number;
  discount?: number;
  quantity: number;
  index?: number;
  item_url?: string;
  item_variant?: string;
}

export function mapProductToAnalyticsItem(opts: {
  product: Product;
  price?: number;
  listPrice?: number;
  quantity?: number;
  index?: number;
  breadcrumbList?: any;
}): AnalyticsItem {
  const { product, price, listPrice, quantity = 1, index } = opts;
  return {
    item_id: product.productID || product.sku,
    item_name: product.name,
    item_brand: product.brand?.name,
    item_category: product.category,
    price: price ?? 0,
    discount: listPrice && price ? listPrice - price : 0,
    quantity,
    index,
    item_url: product.url,
    item_variant: product.sku,
  };
}
