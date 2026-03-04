/**
 * Stub for apps/vtex/hooks/useCart.ts
 * Consumer storefronts should override this with a real implementation
 * that calls the VTEX OrderForm API via server functions.
 */
export function useCart() {
  return {
    cart: { value: null as any },
    loading: { value: false },
    addItems: async (_params: any) => {},
    updateItems: async (_params: any) => {},
    removeItem: async (_index: number) => {},
    addCouponsToCart: async (_params: any) => {},
    simulate: async (_data: any) => ({ items: [] as any[] }),
    mapItemsToAnalyticsItems: (_orderForm: any) => [] as any[],
  };
}
