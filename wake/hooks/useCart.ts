// deno-lint-ignore-file no-explicit-any
import type { AnalyticsItem } from "../../commerce/types";
import type { Manifest } from "../manifest.gen";
import { invoke } from "../runtime";
import { CheckoutFragment } from "../utils/graphql/storefront.graphql.gen";
import { Context, state as storeState } from "./context";

const { cart, loading } = storeState;

export const itemToAnalyticsItem = (
  item: NonNullable<NonNullable<CheckoutFragment["products"]>[number]> & {
    coupon?: string;
  },
  index: number,
): AnalyticsItem => {
  return {
    item_id: item.productVariantId,
    item_group_id: item.productId,
    quantity: item.quantity,
    coupon: item.coupon,
    price: item.price,
    index,
    discount: item.price - item.ajustedPrice,
    item_name: item.name!,
    item_variant: item.productVariantId,
    item_brand: item.brand ?? "",
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
  addItem: enqueue("wake/actions/cart/addItem.ts"),
  addKit: enqueue("wake/actions/cart/addKit.ts"),
  removeKit: enqueue("wake/actions/cart/removeKit.ts"),
  addItems: enqueue("wake/actions/cart/addItems.ts"),
  updateItem: enqueue("wake/actions/cart/updateItemQuantity.ts"),
  addCoupon: enqueue("wake/actions/cart/addCoupon.ts"),
  removeCoupon: enqueue("wake/actions/cart/removeCoupon.ts"),
  partnerAssociate: enqueue("wake/actions/cart/partnerAssociate.ts"),
  partnerDisassociate: enqueue("wake/actions/cart/partnerDisassociate.ts"),
};

export const useCart = () => state;
