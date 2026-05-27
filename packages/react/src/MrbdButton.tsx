import { MRBD_MIN_TARGET_SIZE } from "@mrbd/core";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type MrbdButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function MrbdButton({ children, className, style, ...props }: MrbdButtonProps) {
  const buttonStyle: CSSProperties = {
    minHeight: MRBD_MIN_TARGET_SIZE,
    borderRadius: 24,
    border: "2px solid transparent",
    background: "#1C1E21",
    color: "#ffffff",
    font: "inherit",
    fontWeight: 700,
    padding: "16px 24px",
    transition: "transform 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
    ...style,
  };

  return (
    <button className={["mrbd-focusable", className].filter(Boolean).join(" ")} style={buttonStyle} {...props}>
      {children}
    </button>
  );
}
