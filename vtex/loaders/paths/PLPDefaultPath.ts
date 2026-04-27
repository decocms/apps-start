/**
 * Default-path provider for PLPs — mirrors deco-cx/apps
 * `vtex/loaders/paths/PLPDefaultPath.ts`.
 *
 * Walks the VTEX category tree to a configurable depth and emits a flat list
 * of `/category/...` paths used by sitemap generators and Deco's static
 * default-path slot.
 */

import { getCategoryTree } from "../catalog";

interface CategoryNode {
	name?: string;
	children?: CategoryNode[];
}

export interface DefaultPathProps {
	possiblePaths: string[];
}

export interface Props {
	/** Category tree depth to traverse (default `1`). */
	level?: number;
}

/**
 * @title PLP Default Path
 * @description Get paths for product listing page seeded from the category tree.
 */
const loader = async (props: Props): Promise<DefaultPathProps | null> => {
	const { level = 1 } = props ?? {};

	const tree = await getCategoryTree<CategoryNode>(level);
	const paths: string[] = [];

	const visit = (node: CategoryNode, prefix: string) => {
		if (!node.name) return;
		const next = `${prefix}/${node.name}`.toLowerCase();
		paths.push(next);
		for (const child of node.children ?? []) visit(child, next);
	};

	if (Array.isArray(tree)) {
		for (const node of tree) visit(node, "");
	} else if (tree && typeof tree === "object") {
		visit(tree as CategoryNode, "");
	}

	return { possiblePaths: paths };
};

export const cache = "stale-while-revalidate" as const;

export const cacheKey = (props: Props) => `plp-default-path-${props?.level ?? 1}`;

export default loader;
