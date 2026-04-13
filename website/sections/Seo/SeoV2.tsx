import SeoComponent, {
	renderTemplateString,
	type SEOSection,
	type Props as SeoProps,
} from "../../components/Seo";
import type { WebsiteConfig } from "../../types";

type Props = Pick<
	SeoProps,
	"title" | "description" | "type" | "favicon" | "image" | "themeColor" | "noIndexing"
>;

/**
 * Loader that merges page-level SEO props with app-level defaults.
 * The framework calls this with the WebsiteConfig from the app state.
 */
export function loader(props: Props, seo?: WebsiteConfig["seo"]) {
	const {
		titleTemplate = "",
		descriptionTemplate = "",
		title: appTitle = "",
		description: appDescription = "",
		...seoSiteProps
	} = seo ?? {};

	const { title: _title, description: _description, ...seoProps } = props;

	const title = renderTemplateString(
		(titleTemplate ?? "").trim().length === 0 ? "%s" : titleTemplate,
		_title ?? appTitle,
	);

	const description = renderTemplateString(
		(descriptionTemplate ?? "").trim().length === 0 ? "%s" : descriptionTemplate,
		_description ?? appDescription,
	);

	return { ...seoSiteProps, ...seoProps, title, description };
}

function Section(props: Props): SEOSection {
	return <SeoComponent {...props} />;
}

export default Section;
