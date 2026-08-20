import { type BlogPost, isPublishedStatus, type SortBy } from "../types";

const VALID_SORT_ORDERS = ["asc", "desc"];

/** An ISO 8601 date or date-time carrying no timezone designator. */
const ISO_WITHOUT_TIMEZONE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/;

/**
 * `BlogPost.date` may be a bare `YYYY-MM-DD` or a full ISO 8601 timestamp.
 *
 * Anything without a timezone designator is pinned to UTC, so ordering never
 * depends on the machine timezone. That matters for both shapes: per spec a
 * bare date is already UTC, but an offset-less datetime is parsed as *local*
 * time, which would otherwise reorder posts near a day boundary from one
 * server to the next.
 *
 * Unparseable values fall back to 0 instead of leaking NaN into the comparator
 * (a NaN result is treated as 0, so the post would never move).
 */
const dateToTime = (date: string) =>
	new Date(
		ISO_WITHOUT_TIMEZONE.test(date) ? `${date.includes("T") ? date : `${date}T00:00:00`}Z` : date,
	).getTime() || 0;

/**
 * Sort posts by the given criteria.
 * Skips view-based sorting (no Drizzle in this port).
 */
export const sortPosts = (blogPosts: BlogPost[], sortBy: SortBy): BlogPost[] => {
	const parts = sortBy.split("_");
	const sortMethod = (parts[0] in blogPosts[0] ? parts[0] : "date") as keyof BlogPost;
	const sortOrder = VALID_SORT_ORDERS.includes(parts[1]) ? parts[1] : "desc";

	return [...blogPosts].sort((a, b) => {
		if (!a[sortMethod] && !b[sortMethod]) return 0;
		if (!a[sortMethod]) return 1;
		if (!b[sortMethod]) return -1;

		const comparison =
			sortMethod === "date"
				? dateToTime(b.date) - dateToTime(a.date)
				: (a[sortMethod]?.toString().localeCompare(b[sortMethod]?.toString() ?? "") ?? 0);

		return sortOrder === "desc" ? comparison : -comparison;
	});
};

/** Filter posts by a single category slug. */
export const filterPostsByCategory = (posts: BlogPost[], slug?: string): BlogPost[] =>
	slug ? posts.filter(({ categories }) => categories?.find((c) => c.slug === slug)) : posts;

/** Filter posts whose slug is in the given list. */
export const filterPostsBySlugs = (posts: BlogPost[], postSlugs: string[]): BlogPost[] =>
	posts.filter(({ slug }) => postSlugs.includes(slug));

/** Filter posts matching a search term (title, excerpt, content). */
export const filterPostsByTerm = (posts: BlogPost[], term: string): BlogPost[] =>
	posts.filter(({ content, excerpt, title }) =>
		[content, excerpt, title].some((field) => field?.toLowerCase().includes(term.toLowerCase())),
	);

/** Filter posts whose categories overlap with the given slug array. */
export const filterRelatedPosts = (posts: BlogPost[], slugs: string[]): BlogPost[] =>
	posts.filter(({ categories }) => categories?.find((c) => slugs.includes(c.slug)));

/**
 * A record without a slug has no route, so it can never be rendered: listing it
 * only produces cards linking to the listing itself. Unpublished posts are
 * unreachable for a different reason — the CMS doesn't consider them ready —
 * but the outcome is the same, so both are dropped here, before slicePosts, so
 * `count` still yields `count` renderable posts.
 */
export const filterRoutablePosts = (posts: BlogPost[]): BlogPost[] =>
	// Records come straight from the CMS, so `slug` is only a string by
	// convention: the typeof guard keeps a malformed one from throwing here and
	// taking the whole listing down with it.
	posts.filter(
		(post) => typeof post.slug === "string" && post.slug.trim() && isPublishedStatus(post.status),
	);

/** Slice posts for pagination. */
export const slicePosts = (
	posts: BlogPost[],
	pageNumber: number,
	postsPerPage: number,
): BlogPost[] => {
	const startIndex = (pageNumber - 1) * postsPerPage;
	return posts.slice(startIndex, startIndex + postsPerPage);
};

/**
 * Combined filter & sort pipeline (no slice).
 */
export default function handlePosts(
	posts: BlogPost[],
	sortBy: SortBy,
	slug?: string | string[],
	postSlugs?: string[],
	term?: string,
	excludePostSlug?: string,
): BlogPost[] | null {
	const routable = filterRoutablePosts(posts);
	let filtered: BlogPost[];

	if (typeof slug === "string") {
		filtered =
			postSlugs && postSlugs.length > 0
				? filterPostsBySlugs(routable, postSlugs)
				: filterPostsByCategory(routable, slug);
		if (term) filtered = filterPostsByTerm(filtered, term);
	} else if (Array.isArray(slug)) {
		filtered = filterRelatedPosts(routable, slug);
	} else {
		filtered = term ? filterPostsByTerm(routable, term) : routable;
	}

	if (excludePostSlug) {
		filtered = filtered.filter(({ slug: s }) => s !== excludePostSlug);
	}

	if (!filtered || filtered.length === 0) return null;

	return sortPosts(filtered, sortBy);
}
