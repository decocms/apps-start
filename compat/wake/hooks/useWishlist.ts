export function useWishlist() {
  return {
    loading: { value: false },
    addItem: async (_props: any) => {},
    removeItem: async (_props: any) => {},
    getItem: (_props: any) => undefined as any,
  };
}
