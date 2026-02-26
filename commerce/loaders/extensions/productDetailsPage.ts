import loader from "../product/extensions/detailsPage";

/** @deprecated use product/detailsPage instead */
const deprecated = (...args: Parameters<typeof loader>) => loader(...args);

export default deprecated;
