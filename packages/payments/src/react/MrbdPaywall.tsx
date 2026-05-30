import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { MrbdPaymentsClient } from "../client.js";
import { MrbdPaymentsError } from "../error.js";
import type { MrbdPrice } from "../types.js";
import { MrbdBuyButton } from "./MrbdBuyButton.js";
import { MrbdPinPad } from "./MrbdPinPad.js";
import { MrbdWalletSetupHandoff } from "./MrbdWalletSetupHandoff.js";
import { formatPrice } from "./format.js";

export type MrbdPaywallProps = {
  client: MrbdPaymentsClient;
  /** Product whose ownership gates the children. */
  productId: string;
  /** Price to charge when the user buys. */
  price: MrbdPrice;
  /** Rendered once the user owns the product. */
  children: ReactNode;
  /** PIN length for the numeric pad. Defaults to 4. */
  pinLength?: number;
  title?: ReactNode;
  description?: ReactNode;
  /** Optional QR renderer passed through to the wallet-setup handoff. */
  renderQr?: (url: string) => ReactNode;
  onPurchased?: () => void;
  onError?: (error: MrbdPaymentsError) => void;
};

type Stage =
  | "checking"
  | "locked"
  | "wallet"
  | "set_pin"
  | "enter_pin"
  | "processing"
  | "action_required"
  | "owned";

/**
 * Gates `children` behind ownership of `productId`, orchestrating the full
 * glasses purchase flow: wallet setup (phone handoff) -> PIN -> off-session
 * charge -> entitlement check. Falls back to a phone handoff when Stripe
 * requires SCA.
 */
export function MrbdPaywall({
  client,
  productId,
  price,
  children,
  pinLength = 4,
  title,
  description,
  renderQr,
  onPurchased,
  onError,
}: MrbdPaywallProps) {
  const [stage, setStage] = useState<Stage>("checking");
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [walletUrl, setWalletUrl] = useState<string | null>(null);
  const [actionUrl, setActionUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fail = useCallback(
    (error: unknown) => {
      const err =
        error instanceof MrbdPaymentsError
          ? error
          : new MrbdPaymentsError("server_error", "Something went wrong.");
      if (mounted.current) setMessage(err.message);
      onError?.(err);
    },
    [onError],
  );

  const refreshOwnership = useCallback(async () => {
    const owned = await client.hasPurchased(productId);
    if (!mounted.current) return owned;
    if (owned) {
      setStage("owned");
      onPurchased?.();
    }
    return owned;
  }, [client, productId, onPurchased]);

  useEffect(() => {
    void (async () => {
      try {
        const owned = await refreshOwnership();
        if (owned || !mounted.current) return;
        const wallet = await client.getWallet();
        if (!mounted.current) return;
        setHasPaymentMethod(wallet.hasPaymentMethod);
        setHasPin(wallet.hasPin);
        setStage("locked");
      } catch (error) {
        fail(error);
        if (mounted.current) setStage("locked");
      }
    })();
  }, [client, refreshOwnership, fail]);

  const doPurchase = useCallback(
    async (pin: string) => {
      setMessage(null);
      setStage("processing");
      try {
        const result =
          price.kind === "recurring"
            ? await client.subscribe(price.id, { pin })
            : await client.purchase(price.id, { pin });

        if ("requiresAction" in result && result.requiresAction) {
          const { url } = await client.checkout(price.id);
          if (!mounted.current) return;
          setActionUrl(url);
          setStage("action_required");
          return;
        }
        // Entitlements are granted from the Stripe webhook; poll once here.
        const owned = await refreshOwnership();
        if (!mounted.current) return;
        if (!owned) {
          setMessage("Payment received. Unlocking shortly...");
          setStage("locked");
        }
      } catch (error) {
        if (error instanceof MrbdPaymentsError && error.code === "pin_invalid") {
          if (mounted.current) {
            setMessage("Incorrect PIN. Try again.");
            setStage("enter_pin");
          }
          return;
        }
        fail(error);
        if (mounted.current) setStage("locked");
      }
    },
    [client, price, refreshOwnership, fail],
  );

  const startBuy = useCallback(async () => {
    setMessage(null);
    try {
      if (!hasPaymentMethod) {
        const { url } = await client.startWalletSetup();
        if (!mounted.current) return;
        setWalletUrl(url);
        setStage("wallet");
        return;
      }
      setStage(hasPin ? "enter_pin" : "set_pin");
    } catch (error) {
      fail(error);
    }
  }, [client, hasPaymentMethod, hasPin, fail]);

  const onWalletDone = useCallback(async () => {
    try {
      const wallet = await client.getWallet();
      if (!mounted.current) return;
      setHasPaymentMethod(wallet.hasPaymentMethod);
      setHasPin(wallet.hasPin);
      if (!wallet.hasPaymentMethod) {
        setMessage("No card detected yet. Finish adding it on your phone, then try again.");
        return;
      }
      setStage(wallet.hasPin ? "enter_pin" : "set_pin");
    } catch (error) {
      fail(error);
    }
  }, [client, fail]);

  const onSetPin = useCallback(
    async (pin: string) => {
      try {
        await client.setPin(pin);
        await doPurchase(pin);
      } catch (error) {
        fail(error);
        if (mounted.current) setStage("locked");
      }
    },
    [client, doPurchase, fail],
  );

  if (stage === "owned") return <>{children}</>;

  return (
    <div style={containerStyle}>
      {stage === "checking" ? <p style={mutedStyle}>Loading...</p> : null}

      {stage === "locked" ? (
        <div style={columnStyle}>
          {title ? <h2 style={titleStyle}>{title}</h2> : null}
          {description ? <p style={mutedStyle}>{description}</p> : null}
          <MrbdBuyButton
            label={price.kind === "recurring" ? "Subscribe" : "Buy"}
            priceLabel={formatPrice(price)}
            onClick={() => void startBuy()}
          />
        </div>
      ) : null}

      {stage === "wallet" && walletUrl ? (
        <div style={columnStyle}>
          <MrbdWalletSetupHandoff url={walletUrl} {...(renderQr ? { renderQr } : {})} />
          <MrbdBuyButton label="I've added my card" onClick={() => void onWalletDone()} />
        </div>
      ) : null}

      {stage === "set_pin" ? (
        <div style={columnStyle}>
          <h2 style={titleStyle}>Create a purchase PIN</h2>
          <p style={mutedStyle}>You'll use this to confirm future purchases.</p>
          <MrbdPinPad length={pinLength} onSubmit={(pin) => void onSetPin(pin)} />
        </div>
      ) : null}

      {stage === "enter_pin" ? (
        <div style={columnStyle}>
          <h2 style={titleStyle}>Enter your PIN</h2>
          <MrbdPinPad length={pinLength} onSubmit={(pin) => void doPurchase(pin)} />
        </div>
      ) : null}

      {stage === "processing" ? <p style={mutedStyle}>Processing...</p> : null}

      {stage === "action_required" && actionUrl ? (
        <div style={columnStyle}>
          <MrbdWalletSetupHandoff
            url={actionUrl}
            title="Confirm on your phone"
            instructions="Your bank needs to confirm this payment. Open this link on your phone to finish, then come back."
            {...(renderQr ? { renderQr } : {})}
          />
          <MrbdBuyButton label="I've confirmed" onClick={() => void refreshOwnership()} />
        </div>
      ) : null}

      {message ? (
        <p style={{ ...mutedStyle, color: "#f0a0a0" }} aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  width: "100%",
  maxWidth: 520,
  margin: "0 auto",
  color: "#ffffff",
} as const;

const columnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  width: "100%",
} as const;

const titleStyle = { margin: 0, fontSize: 28, fontWeight: 800, textAlign: "center" } as const;
const mutedStyle = { margin: 0, fontSize: 18, color: "#c7cbd1", textAlign: "center" } as const;
