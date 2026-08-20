import handlePosts, { slicePosts } from "../core/handlePosts";
import { getRecordsByPath } from "../core/records";
import type { BlogPost, SortBy } from "../types";

const COLLECTION_PATH = "collections/blog/posts";
const ACCESSOR = "post";

export interface Props {
	/**
	 * @title Items per page
	 * @description Number of posts per page to display.
	 */
	count?: number;
	/**
	 * @title Page query parameter
	 * @description The current page number. Defaults to 1.
	 */
	page?: number;
	/**
	 * @title Category Slug
	 * @description Filter by a specific category slug.
	 */
	slug?: string;
	/**
	 * @title Specific post slugs
	 * @description Filter by specific post slugs.
	 */
	postSlugs?: string[];
	/**
	 * @title Page sorting parameter
	 * @description The sorting option. Default is "date_desc"
	 */
	sortBy?: SortBy;
	/**
	 * @description Overrides the query term at url
	 */
	query?: string;
}

/**
 * @title BlogPostList
 * @description Retrieves a flat list of blog posts. Unlike BlogpostListing it
 * returns the posts alone, with no pageInfo or seo wrapper.
 */
export default function BlogPostList(
	props: Props & { __pageUrl?: string },
	req?: Request,
): BlogPost[] | null {
	const { page, count, slug, sortBy, postSlugs, query } = props;
	const rawUrl = req?.url ?? props.__pageUrl ?? "http://localhost/";
	const url = new URL(rawUrl);
	const postsPerPage = Number(count ?? url.searchParams.get("count") ?? 12);
	const pageNumber = Number(page ?? url.searchParams.get("page") ?? 1);
	const pageSort = sortBy ?? (url.searchParams.get("sortBy") as SortBy) ?? "date_desc";
	const term = query ?? url.searchParams.get("q") ?? undefined;

	const posts = getRecordsByPath<BlogPost>(COLLECTION_PATH, ACCESSOR);

	try {
		const handledPosts = handlePosts(posts, pageSort, slug, postSlugs, term);

		if (!handledPosts) return null;

		const slicedPosts = slicePosts(handledPosts, pageNumber, postsPerPage);
		return slicedPosts.length > 0 ? slicedPosts : null;
	} catch (e) {
		console.error("[BlogpostList]", e);
		return null;
	}
}
