export function useCart() {
  return {
    cart: { value: null },
    loading: { value: false },
    addItems: async () => {},
    updateItems: async () => {},
    removeItem: async () => {},
  };
}
