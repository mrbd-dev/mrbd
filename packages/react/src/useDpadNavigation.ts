import { DPAD } from "@mrbd/core";
import { useEffect } from "react";

export type UseDpadNavigationOptions = {
  enabled?: boolean;
  selector?: string;
  loop?: boolean;
  onBack?: () => void;
};

const DEFAULT_SELECTOR = [
  ".mrbd-focusable:not([disabled])",
  ".focusable:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isHTMLElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement;
}

function getFocusableElements(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector)).filter(
    (element): element is HTMLElement =>
      isHTMLElement(element) && !element.hidden && element.offsetParent !== null,
  );
}

function moveFocus(direction: "previous" | "next", selector: string, loop: boolean) {
  const focusables = getFocusableElements(selector);
  if (focusables.length === 0) return;

  const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
  if (currentIndex === -1) {
    focusables[0]?.focus();
    return;
  }

  const delta = direction === "previous" ? -1 : 1;
  const nextIndex = currentIndex + delta;

  if (nextIndex < 0 || nextIndex >= focusables.length) {
    if (!loop) return;
    const wrapped = nextIndex < 0 ? focusables.length - 1 : 0;
    focusables[wrapped]?.focus();
    focusables[wrapped]?.scrollIntoView({ block: "nearest" });
    return;
  }

  focusables[nextIndex]?.focus();
  focusables[nextIndex]?.scrollIntoView({ block: "nearest" });
}

export function useDpadNavigation({
  enabled = true,
  selector = DEFAULT_SELECTOR,
  loop = true,
  onBack,
}: UseDpadNavigationOptions = {}) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case DPAD.UP:
        case DPAD.LEFT:
          moveFocus("previous", selector, loop);
          event.preventDefault();
          break;
        case DPAD.DOWN:
        case DPAD.RIGHT:
          moveFocus("next", selector, loop);
          event.preventDefault();
          break;
        case DPAD.SELECT:
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.click();
            event.preventDefault();
          }
          break;
        case DPAD.BACK:
          onBack?.();
          if (onBack) event.preventDefault();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, loop, onBack, selector]);
}
