import { DPAD } from "@mrbd/core";
import { useEffect, useRef } from "react";
import { type MrbdBindableElement, openMrbdKeyboardForField } from "./fieldBinding.js";
import { useMrbdTextInput } from "./useMrbdTextInput.js";

/**
 * Wire an existing input to the head keyboard without swapping the element or
 * enabling provider-wide `autoBind`. Attach the returned ref to any
 * `<input>`/`<textarea>`/`contenteditable` element; activating it (D-pad
 * `Enter`) opens the keyboard and writes the result back. Must be used inside a
 * `MrbdKeyboardProvider`.
 *
 * @example
 * const ref = useMrbdKeyboardField<HTMLInputElement>();
 * return <input ref={ref} placeholder="Name" />;
 */
export function useMrbdKeyboardField<T extends MrbdBindableElement = HTMLInputElement>() {
  const { requestText } = useMrbdTextInput();
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onKeyDown = (event: Event) => {
      if ((event as KeyboardEvent).key !== DPAD.SELECT) return;
      event.preventDefault();
      event.stopPropagation();
      void openMrbdKeyboardForField(el, requestText);
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [requestText]);

  return ref;
}
