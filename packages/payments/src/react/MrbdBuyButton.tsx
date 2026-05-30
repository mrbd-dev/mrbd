import type { CSSProperties, ReactNode } from "react";

export type MrbdBuyButtonProps = {
  /** Primary label, e.g. "Buy" or "Subscribe". */
  label?: ReactNode;
  /** Optional secondary label, typically the formatted price. */
  priceLabel?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A 600x600-friendly, focusable purchase button for the glasses. Presentational
 * only: wire it to a purchase flow (or {@link MrbdPaywall}) via `onClick`.
 */
export function MrbdBuyButton({
  label = "Buy",
  priceLabel,
  onClick,
  disabled = false,
  className,
  style,
}: MrbdBuyButtonProps) {
  return (
    <button
      type="button"
      className={`mrbd-focusable${className ? ` ${className}` : ""}`}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 72,
        width: "100%",
        padding: "0 24px",
        borderRadius: 24,
        border: "2px solid transparent",
        background: disabled ? "#26282c" : "#0866FF",
        color: "#ffffff",
        font: "inherit",
        fontSize: 24,
        fontWeight: 800,
        cursor: disabled ? "default" : "pointer",
        transition: "transform 200ms ease, box-shadow 200ms ease, background 200ms ease",
        ...style,
      }}
    >
      <span>{label}</span>
      {priceLabel ? <span style={{ opacity: 0.85, fontWeight: 700 }}>{priceLabel}</span> : null}
    </button>
  );
}
