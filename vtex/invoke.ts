/**
 * Typed invoke object for VTEX actions — same DX as deco-cx/deco.
 *
 * Client-side components call `invoke.vtex.actions.*({ data: ... })`.
 * Under the hood, each call is a `createServerFn` that executes
 * on the server with full VTEX credentials (appKey/appToken).
 *
 * @example
 * ```tsx
 * import { invoke } from "@decocms/apps/vtex/invoke";
 *
 * // Add to cart
 * const cart = await invoke.vtex.actions.addItemsToCart({
 *   data: { orderFormId: "abc", orderItems: [{ id: "1", seller: "1", quantity: 1 }] }
 * });
 *
 * // Subscribe to newsletter
 * await invoke.vtex.actions.subscribe({ data: { email: "user@example.com" } });
 *
 * // Notify me when back in stock
 * await invoke.vtex.actions.notifyMe({ data: { email: "u@e.com", skuId: "123" } });
 * ```
 */
import { createInvokeFn } from "@decocms/start/sdk/createInvoke";
import {
  getOrCreateCart,
  addItemsToCart,
  updateCartItems,
  addCouponToCart,
  simulateCart,
  getSellersByRegion,
  setShippingPostalCode,
  updateOrderFormAttachment,
  type SimulationItem,
} from "./actions/checkout";
import {
  createDocument,
  getDocument,
  patchDocument,
  searchDocuments,
  uploadAttachment,
  type UploadAttachmentOpts,
  type CreateDocumentResult,
} from "./actions/masterData";
import { createSession, editSession, type SessionData } from "./actions/session";
import { subscribe, type SubscribeProps } from "./actions/newsletter";
import { notifyMe, type NotifyMeProps } from "./actions/misc";
import type { OrderForm } from "./types";
import type { RegionResult } from "./actions/checkout";

// ---------------------------------------------------------------------------
// invoke.vtex.actions — typed server functions callable from client
// ---------------------------------------------------------------------------

export const invoke = {
  vtex: {
    actions: {
      // -- Cart (unwrap VtexFetchResult -> OrderForm) -----------------------

      getOrCreateCart: createInvokeFn(
        (input: { orderFormId?: string }) =>
          getOrCreateCart(input.orderFormId),
        { unwrap: true },
      ) as unknown as (ctx: { data: { orderFormId?: string } }) => Promise<OrderForm>,

      addItemsToCart: createInvokeFn(
        (input: {
          orderFormId: string;
          orderItems: Array<{
            id: string;
            seller: string;
            quantity: number;
          }>;
        }) => addItemsToCart(input.orderFormId, input.orderItems),
        { unwrap: true },
      ) as unknown as (ctx: {
        data: {
          orderFormId: string;
          orderItems: Array<{
            id: string;
            seller: string;
            quantity: number;
          }>;
        };
      }) => Promise<OrderForm>,

      updateCartItems: createInvokeFn(
        (input: {
          orderFormId: string;
          orderItems: Array<{ index: number; quantity: number }>;
        }) => updateCartItems(input.orderFormId, input.orderItems),
        { unwrap: true },
      ) as unknown as (ctx: {
        data: {
          orderFormId: string;
          orderItems: Array<{ index: number; quantity: number }>;
        };
      }) => Promise<OrderForm>,

      addCouponToCart: createInvokeFn(
        (input: { orderFormId: string; text: string }) =>
          addCouponToCart(input.orderFormId, input.text),
        { unwrap: true },
      ) as unknown as (ctx: {
        data: { orderFormId: string; text: string };
      }) => Promise<OrderForm>,

      simulateCart: createInvokeFn(
        (input: {
          items: SimulationItem[];
          postalCode: string;
          country?: string;
        }) => simulateCart(input.items, input.postalCode, input.country),
      ),

      // -- Shipping / Region ------------------------------------------------

      getSellersByRegion: createInvokeFn(
        (input: { postalCode: string; salesChannel?: string }) =>
          getSellersByRegion(input.postalCode, input.salesChannel),
      ) as (ctx: {
        data: { postalCode: string; salesChannel?: string };
      }) => Promise<RegionResult | null>,

      setShippingPostalCode: createInvokeFn(
        (input: {
          orderFormId: string;
          postalCode: string;
          country?: string;
        }) =>
          setShippingPostalCode(
            input.orderFormId,
            input.postalCode,
            input.country,
          ),
      ) as (ctx: {
        data: {
          orderFormId: string;
          postalCode: string;
          country?: string;
        };
      }) => Promise<boolean>,

      updateOrderFormAttachment: createInvokeFn(
        (input: {
          orderFormId: string;
          attachment: string;
          body: Record<string, unknown>;
        }) =>
          updateOrderFormAttachment(
            input.orderFormId,
            input.attachment,
            input.body,
          ),
        { unwrap: true },
      ) as unknown as (ctx: {
        data: {
          orderFormId: string;
          attachment: string;
          body: Record<string, unknown>;
        };
      }) => Promise<OrderForm>,

      // -- Session ----------------------------------------------------------

      createSession: createInvokeFn(
        (input: Record<string, any>) => createSession(input),
        { unwrap: true },
      ),

      editSession: createInvokeFn(
        (input: { public: Record<string, { value: string }> }) =>
          editSession(input.public),
        { unwrap: true },
      ) as unknown as (ctx: {
        data: { public: Record<string, { value: string }> };
      }) => Promise<SessionData>,

      // -- MasterData -------------------------------------------------------

      createDocument: createInvokeFn(
        (input: { entity: string; data: Record<string, any> }) =>
          createDocument(input.entity, input.data),
      ) as (ctx: {
        data: { entity: string; data: Record<string, any> };
      }) => Promise<CreateDocumentResult>,

      getDocument: createInvokeFn(
        (input: { entity: string; documentId: string }) =>
          getDocument(input.entity, input.documentId),
      ),

      patchDocument: createInvokeFn(
        (input: {
          entity: string;
          documentId: string;
          data: Record<string, any>;
        }) => patchDocument(input.entity, input.documentId, input.data),
      ) as (ctx: {
        data: {
          entity: string;
          documentId: string;
          data: Record<string, any>;
        };
      }) => Promise<void>,

      searchDocuments: createInvokeFn(
        (input: { entity: string; filter: string }) =>
          searchDocuments(input.entity, input.filter),
      ),

      uploadAttachment: createInvokeFn(
        (input: UploadAttachmentOpts) => uploadAttachment(input),
      ) as (ctx: {
        data: UploadAttachmentOpts;
      }) => Promise<{ ok: true }>,

      // -- Newsletter -------------------------------------------------------

      subscribe: createInvokeFn(
        (input: SubscribeProps) => subscribe(input),
      ) as (ctx: { data: SubscribeProps }) => Promise<void>,

      // -- Misc -------------------------------------------------------------

      notifyMe: createInvokeFn(
        (input: NotifyMeProps) => notifyMe(input),
      ) as (ctx: { data: NotifyMeProps }) => Promise<void>,
    },
  },
} as const;
