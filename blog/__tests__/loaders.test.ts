import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/records", () => ({
	getRecordsByPath: vi.fn(),
}));

import { getRecordsByPath } from "../core/records";
import BlogPostItem from "../loaders/BlogPostItem";
import BlogPostPageLoader from "../loaders/BlogPostPage";
import BlogpostList from "../loaders/BlogpostList";
import BlogpostListing from "../loaders/BlogpostListing";
import BlogRelatedPostsLoader from "../loaders/BlogRelatedPosts";
import GetCategories from "../loaders/GetCategories";
import type { BlogPost, Category } from "../types";

const mockGetRecords = getRecordsByPath as ReturnType<typeof vi.fn>;

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
	return {
		title: "Test Post",
		slug: "test-post",
		date: "2024-06-01",
		excerpt: "A test post",
		content: "Full content here",
		categories: [{ name: "News", slug: "news" }],
		authors: [{ name: "Author", email: "a@b.com" }],
		...overrides,
	};
}

const samplePosts: BlogPost[] = [
	makePost({ slug: "post-a", title: "Alpha", date: "2024-01-01" }),
	makePost({ slug: "post-b", title: "Bravo", date: "2024-02-01" }),
	makePost({ slug: "post-c", title: "Charlie", date: "2024-03-01" }),
];

beforeEach(() => {
	vi.clearAllMocks();
	mockGetRecords.mockReturnValue(samplePosts);
});

// ---------------------------------------------------------------------------
// BlogpostListing
// ---------------------------------------------------------------------------
describe("BlogpostListing", () => {
	it("returns paginated listing with defaults (page=1, count=12, sortBy=date_desc)", () => {
		const result = BlogpostListing({});
		expect(result).not.toBeNull();
		expect(result!.posts).toHaveLength(3);
		expect(result!.pageInfo.currentPage).toBe(1);
		expect(result!.pageInfo.recordPerPage).toBe(12);
		// date_desc: most recent first
		expect(result!.posts[0].slug).toBe("post-c");
	});

	it("URL search params override props", () => {
		const req = new Request("http://localhost/blog?page=2&count=1");
		const result = BlogpostListing({}, req);
		expect(result).not.toBeNull();
		expect(result!.pageInfo.currentPage).toBe(2);
		expect(result!.posts).toHaveLength(1);
		expect(result!.posts[0].slug).toBe("post-b"); // second page of date_desc
	});

	it("computes nextPage / previousPage correctly", () => {
		const result = BlogpostListing({ count: 1, page: 2 });
		expect(result).not.toBeNull();
		expect(result!.pageInfo.nextPage).toContain("page=3");
		expect(result!.pageInfo.previousPage).toContain("page=1");
	});

	it("returns null when no posts match", () => {
		mockGetRecords.mockReturnValue([]);
		expect(BlogpostListing({})).toBeNull();
	});

	it("SEO canonical strips query params", () => {
		const req = new Request("http://localhost/blog?page=1&count=1");
		const result = BlogpostListing({}, req);
		expect(result).not.toBeNull();
		expect(result!.seo.canonical).toBe("http://localhost/blog");
	});
});

// ---------------------------------------------------------------------------
// BlogRelatedPosts
// ---------------------------------------------------------------------------
describe("BlogRelatedPostsLoader", () => {
	it("excludes current post via excludePostSlug", () => {
		const result = BlogRelatedPostsLoader({ excludePostSlug: "post-a" });
		expect(result).not.toBeNull();
		expect(result!.find((p) => p.slug === "post-a")).toBeUndefined();
	});

	it("returns BlogPost[] (not BlogPostListingPage)", () => {
		const result = BlogRelatedPostsLoader({});
		expect(Array.isArray(result)).toBe(true);
	});

	it("returns null when empty", () => {
		mockGetRecords.mockReturnValue([]);
		expect(BlogRelatedPostsLoader({})).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// BlogPostPage
// ---------------------------------------------------------------------------
describe("BlogPostPageLoader", () => {
	it("returns BlogPostPage with correct @type", () => {
		const result = BlogPostPageLoader({ slug: "post-a" });
		expect(result).not.toBeNull();
		expect(result!["@type"]).toBe("BlogPostPage");
		expect(result!.post.slug).toBe("post-a");
	});

	it("returns null when post not found", () => {
		expect(BlogPostPageLoader({ slug: "nonexistent" })).toBeNull();
	});

	it("SEO fields fall back to post fields", () => {
		mockGetRecords.mockReturnValue([
			makePost({
				slug: "no-seo",
				title: "Fallback Title",
				excerpt: "Fallback Desc",
				image: "img.png",
				seo: undefined,
			}),
		]);

		const result = BlogPostPageLoader({ slug: "no-seo" });
		expect(result).not.toBeNull();
		expect(result!.seo?.title).toBe("Fallback Title");
		expect(result!.seo?.description).toBe("Fallback Desc");
		expect(result!.seo?.image).toBe("img.png");
	});

	it("uses SEO fields when present", () => {
		mockGetRecords.mockReturnValue([
			makePost({
				slug: "has-seo",
				title: "Post Title",
				seo: { title: "SEO Title", description: "SEO Desc" },
			}),
		]);

		const result = BlogPostPageLoader({ slug: "has-seo" });
		expect(result!.seo?.title).toBe("SEO Title");
		expect(result!.seo?.description).toBe("SEO Desc");
	});
});

// ---------------------------------------------------------------------------
// GetCategories
// ---------------------------------------------------------------------------
describe("GetCategories", () => {
	const categories: Category[] = [
		{ name: "Beta", slug: "beta" },
		{ name: "Alpha", slug: "alpha" },
		{ name: "Charlie", slug: "charlie" },
	];

	beforeEach(() => {
		mockGetRecords.mockReturnValue([...categories]);
	});

	it("sorts by name (title_desc default)", () => {
		const result = GetCategories({});
		expect(result).not.toBeNull();
		expect(result!.map((c) => c.name)).toEqual(["Alpha", "Beta", "Charlie"]);
	});

	it("filters by slug when provided", () => {
		const result = GetCategories({ slug: "alpha" });
		expect(result).toHaveLength(1);
		expect(result![0].slug).toBe("alpha");
	});

	it("slices by count", () => {
		const result = GetCategories({ count: 2 });
		expect(result).toHaveLength(2);
	});

	it("returns null when no categories", () => {
		mockGetRecords.mockReturnValue([]);
		expect(GetCategories({})).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// BlogPostItem
// ---------------------------------------------------------------------------
describe("BlogPostItem", () => {
	it("returns post by slug", () => {
		const result = BlogPostItem({ slug: "post-b" });
		expect(result).not.toBeNull();
		expect(result!.slug).toBe("post-b");
	});

	it("returns null when no slug provided", () => {
		expect(BlogPostItem({ slug: "" })).toBeNull();
	});

	it("returns null when post not found", () => {
		expect(BlogPostItem({ slug: "nonexistent" })).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Draft / published lifecycle
// ---------------------------------------------------------------------------
describe("publication status", () => {
	it("BlogpostListing hides unpublished and slugless posts", () => {
		mockGetRecords.mockImplementation((path: string) =>
			path.includes("categories")
				? []
				: [
						makePost({ slug: "live", date: "2024-01-01" }),
						makePost({ slug: "draft", status: "draft", date: "2024-02-01" }),
						makePost({ slug: "", date: "2024-03-01" }),
					],
		);

		const result = BlogpostListing({}, new Request("https://example.com/blog"));
		expect(result?.posts.map((p) => p.slug)).toEqual(["live"]);
		expect(result?.pageInfo.records).toBe(1);
	});

	it("BlogPostItem still serves a draft but forces noIndexing", () => {
		mockGetRecords.mockReturnValue([makePost({ slug: "draft", status: "draft" })]);

		const result = BlogPostItem({ slug: "draft" });
		expect(result?.slug).toBe("draft");
		expect(result?.seo?.noIndexing).toBe(true);
	});

	it("BlogPostItem preserves the post's own seo fields while forcing noIndexing", () => {
		mockGetRecords.mockReturnValue([
			makePost({ slug: "draft", status: "draft", seo: { title: "Kept", noIndexing: false } }),
		]);

		expect(BlogPostItem({ slug: "draft" })?.seo).toEqual({ title: "Kept", noIndexing: true });
	});

	it("BlogPostItem leaves a published post untouched", () => {
		const post = makePost({ slug: "live", status: "published", seo: { title: "T" } });
		mockGetRecords.mockReturnValue([post]);

		expect(BlogPostItem({ slug: "live" })).toBe(post);
	});

	it("BlogPostPage marks a draft noIndexing", () => {
		mockGetRecords.mockReturnValue([makePost({ slug: "draft", status: "draft" })]);

		const result = BlogPostPageLoader({ slug: "draft" }, new Request("https://example.com/p"));
		expect(result?.seo?.noIndexing).toBe(true);
	});

	it("BlogPostPage leaves a legacy post (no status) indexable", () => {
		mockGetRecords.mockReturnValue([makePost({ slug: "legacy" })]);

		const result = BlogPostPageLoader({ slug: "legacy" }, new Request("https://example.com/p"));
		expect(result?.seo?.noIndexing).toBe(false);
	});

	it("BlogRelatedPosts hides unpublished posts", () => {
		mockGetRecords.mockReturnValue([
			makePost({ slug: "live" }),
			makePost({ slug: "draft", status: "draft" }),
		]);

		const result = BlogRelatedPostsLoader({ slug: ["news"] }, new Request("https://example.com/"));
		expect(result?.map((p) => p.slug)).toEqual(["live"]);
	});
});

// ---------------------------------------------------------------------------
// BlogpostListing categories
// ---------------------------------------------------------------------------
describe("BlogpostListing categories", () => {
	const categories: Category[] = [
		{ name: "Tech", slug: "tech", description: "All things tech" },
		{ name: "News", slug: "news", description: "Fresh news" },
	];

	function mockWith(cats: unknown[]) {
		mockGetRecords.mockImplementation((path: string) =>
			path.includes("categories") ? cats : samplePosts,
		);
	}

	it("always returns the sorted category list, even with no active category", () => {
		mockWith(categories);

		const result = BlogpostListing({}, new Request("https://example.com/blog"));
		expect(result?.categories?.map((c) => c.slug)).toEqual(["news", "tech"]);
		expect(result?.category).toBeNull();
	});

	it("resolves the active category from the collection, with description in seo", () => {
		mockWith(categories);

		const result = BlogpostListing({ slug: "news" }, new Request("https://example.com/blog/news"));
		expect(result?.category).toEqual(categories[1]);
		expect(result?.seo.title).toBe("News");
		expect(result?.seo.description).toBe("Fresh news");
	});

	it("falls back to the category inlined on a post when the collection has no match", () => {
		mockWith([]);

		const result = BlogpostListing({ slug: "news" }, new Request("https://example.com/blog/news"));
		expect(result?.category).toEqual({ name: "News", slug: "news" });
		expect(result?.categories).toEqual([]);
	});

	it("drops categories missing a name or slug", () => {
		mockWith([...categories, { name: "", slug: "empty" }, { name: "No slug" }]);

		const result = BlogpostListing({}, new Request("https://example.com/blog"));
		expect(result?.categories?.map((c) => c.slug)).toEqual(["news", "tech"]);
	});

	it("survives a failure reading categories", () => {
		mockGetRecords.mockImplementation((path: string) => {
			if (path.includes("categories")) throw new Error("boom");
			return samplePosts;
		});

		const result = BlogpostListing({}, new Request("https://example.com/blog"));
		expect(result?.posts).toHaveLength(3);
		expect(result?.categories).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// GetCategories validity filtering
// ---------------------------------------------------------------------------
describe("GetCategories validity", () => {
	it("drops categories with a missing or non-string name/slug before sorting", () => {
		mockGetRecords.mockReturnValue([
			{ name: "Tech", slug: "tech" },
			{ name: "", slug: "empty-name" },
			{ name: "No slug" },
			{ name: 5, slug: "numeric-name" },
			{ name: "News", slug: "news" },
		]);

		expect(GetCategories({})?.map((c) => c.slug)).toEqual(["news", "tech"]);
	});

	it("returns null when every category is invalid", () => {
		mockGetRecords.mockReturnValue([{ name: "" }, { slug: "x" }]);

		expect(GetCategories({})).toBeNull();
	});

	it("filters an invalid category out of a slug lookup too", () => {
		mockGetRecords.mockReturnValue([{ name: "", slug: "tech" }]);

		expect(GetCategories({ slug: "tech" })).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// BlogpostList
// ---------------------------------------------------------------------------
describe("BlogpostList", () => {
	it("returns a flat post array, newest first", () => {
		const result = BlogpostList({}, new Request("https://example.com/blog"));
		expect(result?.map((p) => p.slug)).toEqual(["post-c", "post-b", "post-a"]);
	});

	it("honours postSlugs when a category slug is given", () => {
		const result = BlogpostList(
			{ slug: "news", postSlugs: ["post-a", "post-c"] },
			new Request("https://example.com/blog"),
		);
		expect(result?.map((p) => p.slug)).toEqual(["post-c", "post-a"]);
	});

	it("paginates with count and page", () => {
		const result = BlogpostList({ count: 2, page: 2 }, new Request("https://example.com/blog"));
		expect(result?.map((p) => p.slug)).toEqual(["post-a"]);
	});

	it("returns null when the page is past the end", () => {
		expect(BlogpostList({ count: 2, page: 5 }, new Request("https://example.com/blog"))).toBeNull();
	});

	it("excludes unpublished posts", () => {
		mockGetRecords.mockReturnValue([
			makePost({ slug: "live" }),
			makePost({ slug: "archived", status: "archived" }),
		]);

		expect(BlogpostList({}, new Request("https://example.com/blog"))?.map((p) => p.slug)).toEqual([
			"live",
		]);
	});
});
