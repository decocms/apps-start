/**
 * VTEX Wishlist actions (wish-list graphql app).
 * Ported from deco-cx/apps:
 *   - vtex/actions/wishlist/addItem.ts
 *   - vtex/actions/wishlist/removeItem.ts
 * @see https://developers.vtex.com/docs/apps/vtex.wish-list
 */
import { vtexFetch, getVtexConfig } from "../client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WishlistItem {
  productId: string;
  sku: string;
}

// ---------------------------------------------------------------------------
// GraphQL helper (myvtex.com private graphql)
// ---------------------------------------------------------------------------

interface GqlResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  authCookie: string,
): Promise<T> {
  const { account } = getVtexConfig();
  const result = await vtexFetch<GqlResponse<T>>(
    `https://${account}.myvtex.com/_v/private/graphql/v1`,
    {
      method: "POST",
      body: JSON.stringify({ query, variables }),
      headers: { Cookie: `VtexIdclientAutCookie=${authCookie}` },
    },
  );
  if (result.errors?.length) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

const ADD_TO_WISHLIST = `mutation AddToWishlist($listItem: ListItemInputType!, $shopperId: String!, $name: String!, $public: Boolean) {
  addToList(listItem: $listItem, shopperId: $shopperId, name: $name, public: $public) @context(provider: "vtex.wish-list@1.x")
}`;

const REMOVE_FROM_WISHLIST = `mutation RemoveFromList($id: ID!, $shopperId: String!, $name: String) {
  removeFromList(id: $id, shopperId: $shopperId, name: $name) @context(provider: "vtex.wish-list@1.x")
}`;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Add an item to the user's wishlist.
 * The original Deco action re-fetched the full wishlist after mutating.
 * Here we only perform the mutation — the caller should refresh if needed.
 *
 * @param shopperId - User email (was extracted from cookie payload in the original).
 */
export async function addItem(
  item: WishlistItem,
  shopperId: string,
  authCookie: string,
): Promise<void> {
  await gql<unknown>(
    ADD_TO_WISHLIST,
    {
      name: "Wishlist",
      shopperId,
      listItem: item,
    },
    authCookie,
  );
}

/**
 * Remove an item from the user's wishlist by its list-entry ID.
 * The original Deco action re-fetched the full wishlist after mutating.
 * Here we only perform the mutation — the caller should refresh if needed.
 *
 * @param shopperId - User email (was extracted from cookie payload in the original).
 */
export async function removeItem(
  id: string,
  shopperId: string,
  authCookie: string,
): Promise<void> {
  await gql<unknown>(
    REMOVE_FROM_WISHLIST,
    {
      id,
      name: "Wishlist",
      shopperId,
    },
    authCookie,
  );
}
