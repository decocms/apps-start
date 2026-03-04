/**
 * Shim for apps/website/components/Picture.tsx
 * Pass-through to native <picture> and <source>.
 */
import type { HTMLAttributes, SourceHTMLAttributes, ReactNode } from "react";

interface PictureProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  preload?: boolean;
}

export function Picture({ children, preload, ...props }: PictureProps) {
  return <picture {...props}>{children}</picture>;
}

interface SourceProps extends SourceHTMLAttributes<HTMLSourceElement> {
  src?: string;
  width?: number;
  height?: number;
  fetchPriority?: string;
}

export function Source(props: SourceProps) {
  const { src, fetchPriority: _fp, srcSet: origSrcSet, ...rest } = props as any;
  return <source {...rest} srcSet={src || origSrcSet} />;
}
