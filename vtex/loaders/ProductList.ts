import productList, {
	type ProductListProps,
} from "./intelligentSearch/productList";

export type { ProductListProps };

/**
 * Redundant path alias for `intelligentSearch/productList.ts`, kept only so
 * pre-existing blocks referencing `vtex/loaders/ProductList.ts` keep resolving.
 * @ignore
 */
export default productList;
