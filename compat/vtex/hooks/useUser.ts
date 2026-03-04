export function useUser() {
  return {
    user: { value: null as { email?: string; name?: string } | null },
    loading: { value: false },
  };
}
