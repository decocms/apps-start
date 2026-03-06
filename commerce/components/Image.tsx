/**
 * Optimized Image component with CDN-aware transforms.
 *
 * Generates responsive srcset, enforces width/height for CLS prevention,
 * and builds optimized URLs for different image CDNs (VTEX, Shopify,
 * Deco, Cloudflare).
 *
 * @example
 * ```tsx
 * <Image
 *   src="https://store.vteximg.com.br/products/123.jpg"
 *   width={400}
 *   height={400}
 *   alt="Product name"
 *   cdn="vtex"
 * />
 * ```
 */

import type { ImgHTMLAttributes } from "react";

export type ImageCDN = "vtex" | "shopify" | "deco" | "cloudflare" | "none";

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  src: string;
  width: number;
  height: number;
  /** Image CDN to use for URL transforms. @default "none" */
  cdn?: ImageCDN;
  /**
   * Responsive sizes descriptor.
   * @default "(max-width: 768px) 100vw, 50vw"
   */
  sizes?: string;
  /**
   * Multipliers for srcset generation.
   * @default [1, 2]
   */
  srcSetMultipliers?: number[];
  /** Preload the image (adds fetchPriority="high"). */
  preload?: boolean;
}

// -------------------------------------------------------------------------
// CDN URL builders
// -------------------------------------------------------------------------

function vtexImageUrl(src: string, width: number, height: number): string {
  if (src.includes("vteximg.com.br") || src.includes("vtexassets.com")) {
    return src.replace(
      /(-\d+-\d+)(\.\w+)$/,
      `-${width}-${height}$2`,
    );
  }

  const url = new URL(src, "https://placeholder.com");
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  return url.toString();
}

function shopifyImageUrl(src: string, width: number): string {
  if (src.includes("cdn.shopify.com")) {
    return src.replace(/(\.\w+)(\?.*)?$/, `_${width}x$1$2`);
  }
  return src;
}

function decoImageUrl(src: string, width: number, height: number): string {
  if (src.includes("decocache.com") || src.includes("ozksgdmyrqcxcwhnbepg")) {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    url.searchParams.set("fit", "cover");
    return url.toString();
  }
  return src;
}

function cloudflareImageUrl(src: string, width: number, height: number): string {
  return `/cdn-cgi/image/width=${width},height=${height},fit=cover,format=auto,quality=80/${src}`;
}

function buildUrl(src: string, width: number, height: number, cdn: ImageCDN): string {
  switch (cdn) {
    case "vtex": return vtexImageUrl(src, width, height);
    case "shopify": return shopifyImageUrl(src, width);
    case "deco": return decoImageUrl(src, width, height);
    case "cloudflare": return cloudflareImageUrl(src, width, height);
    default: return src;
  }
}

function buildSrcSet(
  src: string,
  width: number,
  height: number,
  cdn: ImageCDN,
  multipliers: number[],
): string {
  return multipliers
    .map((m) => {
      const w = Math.round(width * m);
      const h = Math.round(height * m);
      return `${buildUrl(src, w, h, cdn)} ${w}w`;
    })
    .join(", ");
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function Image({
  src,
  width,
  height,
  cdn = "none",
  sizes = "(max-width: 768px) 100vw, 50vw",
  srcSetMultipliers = [1, 2],
  preload,
  loading,
  decoding,
  ...rest
}: ImageProps) {
  const optimizedSrc = buildUrl(src, width, height, cdn);
  const srcSet = cdn !== "none"
    ? buildSrcSet(src, width, height, cdn, srcSetMultipliers)
    : undefined;

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={width}
      height={height}
      loading={loading ?? (preload ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      fetchPriority={preload ? "high" : undefined}
      {...rest}
    />
  );
}

// -------------------------------------------------------------------------
// Picture (responsive art direction)
// -------------------------------------------------------------------------

export interface PictureSource {
  src: string;
  width: number;
  height: number;
  media: string;
  cdn?: ImageCDN;
}

export interface PictureProps extends Omit<ImageProps, "sizes"> {
  sources: PictureSource[];
}

/**
 * Picture component for responsive art direction.
 *
 * @example
 * ```tsx
 * <Picture
 *   sources={[
 *     { src: mobileSrc, width: 375, height: 200, media: "(max-width: 767px)", cdn: "vtex" },
 *     { src: desktopSrc, width: 1200, height: 400, media: "(min-width: 768px)", cdn: "vtex" },
 *   ]}
 *   src={desktopSrc}
 *   width={1200}
 *   height={400}
 *   alt="Banner"
 * />
 * ```
 */
export function Picture({
  sources,
  src,
  width,
  height,
  cdn = "none",
  preload,
  ...rest
}: PictureProps) {
  return (
    <picture>
      {sources.map((source, i) => (
        <source
          key={i}
          srcSet={buildUrl(source.src, source.width, source.height, source.cdn ?? cdn)}
          media={source.media}
          width={source.width}
          height={source.height}
        />
      ))}
      <Image
        src={src}
        width={width}
        height={height}
        cdn={cdn}
        preload={preload}
        {...rest}
      />
    </picture>
  );
}
