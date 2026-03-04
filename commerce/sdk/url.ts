export const relative = (link?: string | undefined) => {
  if (!link) return undefined;
  try {
    const linkUrl = new URL(link, "https://localhost");
    return `${linkUrl.pathname}${linkUrl.search}`;
  } catch {
    return link;
  }
};
