import {
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { DPAD } from "@mrbd/core";
import { openMrbdKeyboardForField } from "./fieldBinding.js";
import { useMrbdTextInput } from "./useMrbdTextInput.js";

function withFocusable(className?: string): string {
  return ["mrbd-focusable", className].filter(Boolean).join(" ");
}

export type MrbdInputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * A native `<input>` that opens the head keyboard when activated (D-pad `Enter`)
 * and writes the typed text back through normal `onChange`. Use this for a
 * single field without enabling provider-wide `autoBind`. Must be rendered
 * inside a `MrbdKeyboardProvider`.
 */
export const MrbdInput = forwardRef<HTMLInputElement, MrbdInputProps>(function MrbdInput(
  { className, onKeyDown, ...props },
  ref,
) {
  const { requestText } = useMrbdTextInput();
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === DPAD.SELECT && innerRef.current) {
        event.preventDefault();
        void openMrbdKeyboardForField(innerRef.current, requestText);
      }
      onKeyDown?.(event);
    },
    [onKeyDown, requestText],
  );

  return <input {...props} ref={innerRef} className={withFocusable(className)} onKeyDown={handleKeyDown} />;
});

export type MrbdTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** A native `<textarea>` variant of {@link MrbdInput}. */
export const MrbdTextArea = forwardRef<HTMLTextAreaElement, MrbdTextAreaProps>(function MrbdTextArea(
  { className, onKeyDown, ...props },
  ref,
) {
  const { requestText } = useMrbdTextInput();
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === DPAD.SELECT && innerRef.current) {
        event.preventDefault();
        void openMrbdKeyboardForField(innerRef.current, requestText);
      }
      onKeyDown?.(event);
    },
    [onKeyDown, requestText],
  );

  return <textarea {...props} ref={innerRef} className={withFocusable(className)} onKeyDown={handleKeyDown} />;
});
