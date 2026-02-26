import { state as storeState } from "./context";

const { user, loading } = storeState;

const state = { user, loading };

export const useUser = () => state;
