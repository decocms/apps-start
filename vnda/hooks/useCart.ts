// deno-lint-ignore-file no-explicit-any
import type { AnalyticsItem } from "../../commerce/types";
import type { Manifest } from "../manifest.gen";
import { invoke } from "../runtime";
import { Context, state as storeState } from "./context";

const { cart, loading } = storeState;

type Item = NonNullable<Context["cart"]["orderForm"]>["items"][number];

export const itemToAnalyticsItem = (
  item: Item & { quantity: number },
  index: number,
): AnalyticsItem => {
  return {
    item_id: item.variant_sku,
    item_group_id: item.id,
    quantity: item.quantity,
    price: item.price,
    index,
    discount: Math.abs(item.variant_price - item.price),
    item_name: item.product_name,
    item_variant: item.variant_name,
  };
};

type EnqueuableActions<
  K extends keyof Manifest["actions"],
> = Manifest["actions"][K]["default"] extends
  (...args: any[]) => Promise<Context["cart"]> ? K : never;

const enqueue = <
  K extends keyof Manifest["actions"],
>(key: EnqueuableActions<K>) =>
(props: Parameters<Manifest["actions"][K]["default"]>[0]) =>
  storeState.enqueue((signal) =>
    invoke({ cart: { key, props } } as any, { signal }) as any
  );

const state = {
  cart,
  loading,
  update: enqueue("vnda/actions/cart/updateCart.ts"),
  addItem: enqueue("vnda/actions/cart/addItem.ts"),
  updateItem: enqueue("vnda/actions/cart/updateItem.ts"),
  simulate: invoke.vnda.actions.cart.simulation,
};

export const useCart = () => state;
