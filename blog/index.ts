/**
 * Public API for the blog app.
 */

/** @deprecated Use `createBlogLoaders` instead. */
export {
	createBlogLoaders,
	createBlogLoaders as createBlogCommerceLoaders,
} from "./commerceLoaders";
export { getRecordsByPath } from "./core/records";
export { configure } from "./mod";

// Types
export type {
	Author,
	BlogPost,
	BlogPostListingPage,
	BlogPostPage,
	Category,
	ExtraProps,
	PageInfo,
	Seo,
	SortBy,
} from "./types";
