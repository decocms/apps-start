export interface Props {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
  noIndexing?: boolean;
  themeColor?: string;
  favicon?: string;
  jsonLDs?: any[];
}

export type SEOSection = (props: Props) => any;

export function renderTemplateString(template?: string, data?: Record<string, string>): string {
  if (!template) return "";
  if (!data) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "");
}

function Seo(_props: Props) {
  return null;
}

export default Seo;
export type { Props as SeoProps };
