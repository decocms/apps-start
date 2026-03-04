/**
 * Shim for apps/website/components/Image.tsx
 * In the original stack, this wraps images with optimization (resizing, format conversion).
 * Here we pass through to a standard <img> tag.
 */
import type { ImgHTMLAttributes } from "react";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  width?: number;
  height?: number;
  preload?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
  fit?: string;
}

function Image({ preload, fit, children, ...props }: ImageProps & { children?: any }) {
  return <img {...props} />;
}

export default Image;
