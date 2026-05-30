import type { CSSProperties, ReactNode } from "react";

export type MrbdWalletSetupHandoffProps = {
  /** Hosted wallet-setup URL from `client.startWalletSetup()`. */
  url: string;
  title?: ReactNode;
  instructions?: ReactNode;
  /**
   * Optional renderer for a QR code of `url` (e.g. a `qrcode.react` component),
   * so the user can scan it from the glasses instead of typing the link.
   */
  renderQr?: (url: string) => ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Prompts the user to finish saving a card on their phone. Card entry is done in
 * Stripe's hosted, PCI-compliant page (never on the glasses); this component
 * just surfaces the handoff URL and an optional QR code.
 */
export function MrbdWalletSetupHandoff({
  url,
  title = "Add a payment method",
  instructions = "Open this link on your phone to securely add a card to your MRBD wallet. You only need to do this once.",
  renderQr,
  className,
  style,
}: MrbdWalletSetupHandoffProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        textAlign: "center",
        color: "#ffffff",
        ...style,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 18, color: "#c7cbd1", maxWidth: 460 }}>{instructions}</p>
      {renderQr ? <div style={{ marginTop: 8 }}>{renderQr(url)}</div> : null}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mrbd-focusable"
        style={{
          display: "inline-block",
          maxWidth: 480,
          overflowWrap: "anywhere",
          padding: "12px 20px",
          borderRadius: 16,
          border: "2px solid #2a2d31",
          background: "#1C1E21",
          color: "#8ab4ff",
          fontSize: 16,
          textDecoration: "none",
        }}
      >
        {url}
      </a>
    </div>
  );
}
