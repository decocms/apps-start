import { AppContext } from "../mod";

export const withDigestCookie = ({ storefrontDigestCookie }: AppContext) =>
  storefrontDigestCookie
    ? [{
      key: "cookie",
      value: `storefront_digest=${storefrontDigestCookie}`,
    }]
    : undefined;
