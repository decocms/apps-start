import { WebPage as ProductWebPage } from "./types/productJSON";
import { WebPage as GridProductsWebPage } from "./types/gridProductsJSON";
import { CartResponse } from "./types/basketJSON";
import { WebPage as SuggestionsWebPage } from "./types/suggestionsJSON";
import { WebPage as AuctionWebPage } from "./types/auctionJSON";
import { WebPage as AuctionDetailWebPage } from "./types/auctionDetailJSON";
import { WebPage as ListBidsWebPage } from "./types/ListBidsJSON";
import { ProductListResponse } from "./types/productList";
import { CartOperation } from "./types/basket";
import { Props as AddProductProps } from "../actions/cart/addItem";
import { LoginResponse } from "./types/login";
import { NewsletterResponse } from "./types/newsletterJSON";
import { UserResponse } from "./types/userJSON";
import { ProductByIdResponse } from "./types/productByIdJSON";

export interface API {
  "GET /*splat": {
    response:
      | ProductWebPage
      | GridProductsWebPage
      | SuggestionsWebPage
      | AuctionWebPage
      | AuctionDetailWebPage;
  };

  "GET /Shopping/Shopper": {
    response: UserResponse;
  };

  "GET /web-api/v1/Catalog/Products/:source/:id": {
    response: ProductListResponse;
    searchParams: {
      catalogID: number;
    };
  };

  "POST /web-api/v1/Profile/Account/Login": {
    response: LoginResponse;
    body: {
      Key: string;
      Password: string;
    };
  };

  "POST /web-api/v1/Shopping/Basket/Get": {
    response: CartResponse;
    body: {
      BasketID?: number;
    };
  };

  "POST /web-api/v1/Shopping/Basket/AddProduct": {
    response: CartResponse;
    body: AddProductProps;
  };

  "POST /web-api/v1/Shopping/Basket/AddCoupon": {
    response: CartResponse;
    body: {
      CouponCode: string;
      BasketID?: number;
    };
  };

  "POST /web-api/v1/Shopping/Basket/UpdateBasketItem": {
    response: CartResponse;
    body: {
      BasketItemID: number;
      Quantity: number;
    };
  };

  "POST /web-api/v1/Shopping/Basket/RemoveBasketItem": {
    response: CartResponse;
    body: {
      BasketItemID: number;
    };
  };

  "POST /Shopping/ProductAuction/AddBid": {
    response: CartOperation;
    searchParams: {
      productAuctionID: number;
      Amount: number;
      IsListening: boolean;
    };
  };

  "POST /shopping/newsletter.json": {
    response: NewsletterResponse;
    searchParams: {
      Name: string;
      Email: string;
      OptIn: boolean;
      AllowReceiveNewsletter: boolean;
    };
  };

  "GET /Shopping/ProductAuction/ListBids": {
    response: ListBidsWebPage;
    searchParams: {
      ProductAuctionID: number;
    };
  };

  "POST /web-api/v1/Shopping/Basket/SetPostalCode": {
    response: CartResponse;
    body: {
      BasketID: number;
      PostalCode: string;
    };
  };

  "POST /web-api/v1/Shopping/Basket/AddCustomMetadata": {
    response: unknown;
    body: {
      BasketItemID?: number;
      ProductID: string;
      SkuID: string;
      Metas: Array<{
        PropertyMetadataID: number;
        PropertyName: string;
        Value: string;
      }>;
    };
  };

  "POST /web-api/v1/Shopping/Basket/CheckoutRedirect": {
    response: unknown;
    body: {
      BasketID?: number;
    };
  };

  "GET /web-api/v1/Catalog/Products/Get": {
    response: ProductByIdResponse;
    searchParams: {
      id: string;
    };
  };

  "GET /widget/:widget": {
    response: unknown;
    searchParams: Record<string, string>;
  };
}
