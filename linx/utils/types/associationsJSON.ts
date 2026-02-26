import { Product } from "./productList";

export interface Associations {
  ProductLists: ProductList[];
}

export interface ProductList {
  Name: string;
  Alias: string;
  Type: string;
  TypeAlias: string;
  MainRequired: boolean;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
  PageNumber: number;
  PageIndex: number;
  PageCount: number;
  PageSize: number;
  HasProducts: boolean;
  ProductCount: number;
  Product: Product;
  Products: Product[];
}
