import { getRecordsByPath } from "../core/records";
import { type BlogPost, isPublishedStatus } from "../types";

export interface Props {
	slug: string;
}

/**
 * @title BlogPostItem
 * @description Fetches a single blog post by slug. Returns the BlogPost
 * directly (not wrapped in BlogPostPage).
 */
export default function BlogPostItem(props: Props & { __pageUrl?: string }): BlogPost | null {
	const { slug } = props;
	if (!slug) return null;

	const posts = getRecordsByPath<BlogPost>("collections/blog/posts", "post");
	const post = posts.find((p) => p?.slug === slug);

	if (!post) return null;

	// An unpublished post is still served — that page *is* the CMS preview — it
	// just must never be indexed. Everything else the post declared under `seo`
	// is kept as-is.
	return isPublishedStatus(post.status)
		? post
		: { ...post, seo: { ...post.seo, noIndexing: true } };
}
