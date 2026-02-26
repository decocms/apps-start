import type { PostalAddress } from "../../../commerce/types";
import type { AppContext } from "../../mod";
import { toPostalAddress } from "../../utils/transform";
import type { Address } from "../../utils/types";
import { parseCookie } from "../../utils/vtexId";

const query = `query Addresses @context(scope: "private") {
  profile {
    cacheId
    addresses {
      addressId: id
      addressType
      addressName
      city
      complement
      country
      neighborhood
      number
      postalCode
      geoCoordinates
      receiverName
      state
      street
    }
  }
}`;

/**
 * @title Get User Addresses
 * @description Get the addresses of the user logged in
 */
async function loader(
  _props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<PostalAddress[]> {
  const { io } = ctx;
  const { cookie, payload } = parseCookie(req.headers, ctx.account);

  if (!payload?.sub || !payload?.userId) {
    throw new Error("User cookie is invalid");
  }

  const { profile } = await io.query<
    { profile: { addresses: Address[] } },
    null
  >(
    { query },
    { headers: { cookie } },
  );

  return profile?.addresses?.map(toPostalAddress) || [];
}

export const defaultVisibility = "private";
export default loader;
