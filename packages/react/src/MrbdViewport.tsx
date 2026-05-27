import { MRBD_SAFE_MARGIN, MRBD_VIEWPORT_SIZE } from "@mrbd/core";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type MrbdViewportProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  centered?: boolean;
};

export function MrbdViewport({
  children,
  centered = false,
  className,
  style,
  ...props
}: MrbdViewportProps) {
  const viewportStyle: CSSProperties = {
    width: MRBD_VIEWPORT_SIZE.width,
    height: MRBD_VIEWPORT_SIZE.height,
    overflow: "hidden",
    boxSizing: "border-box",
    padding: MRBD_SAFE_MARGIN,
    background: "#000000",
    color: "#ffffff",
    display: centered ? "grid" : undefined,
    placeItems: centered ? "center" : undefined,
    ...style,
  };

  return (
    <div className={className} style={viewportStyle} {...props}>
      {children}
    </div>
  );
}
