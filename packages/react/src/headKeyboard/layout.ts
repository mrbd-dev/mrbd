export type MrbdKeyDef = {
  /** What is displayed on the key. */
  label: string;
  /** What gets inserted when the key is selected. */
  value: string;
};

export type MrbdKeyboardLayout = {
  rows: MrbdKeyDef[][];
};

export const MRBD_DEFAULT_PUNCTUATION = [".", ",", "?", "!", "'", "\u201C", ":", ";", "-", "@"];

function lettersRow(letters: string): MrbdKeyDef[] {
  return letters.split("").map((c) => ({ label: c, value: c.toLowerCase() }));
}

/** Default QWERTY layout with a punctuation row at the bottom. */
export const MRBD_DEFAULT_KEYBOARD_LAYOUT: MrbdKeyboardLayout = {
  rows: [
    lettersRow("QWERTYUIOP"),
    lettersRow("ASDFGHJKL"),
    lettersRow("ZXCVBNM"),
    MRBD_DEFAULT_PUNCTUATION.map((p) => ({ label: p, value: p })),
  ],
};

function keysRow(chars: string[]): MrbdKeyDef[] {
  return chars.map((c) => ({ label: c, value: c }));
}

/**
 * Numeric layout for `type="number" | "tel"` (and `inputmode` numeric/decimal/tel)
 * fields — larger keys arranged like a phone dialpad with the common numeric
 * punctuation a wearer needs (decimal point, plus, dash, comma).
 */
export const MRBD_NUMERIC_KEYBOARD_LAYOUT: MrbdKeyboardLayout = {
  rows: [
    keysRow(["1", "2", "3"]),
    keysRow(["4", "5", "6"]),
    keysRow(["7", "8", "9"]),
    keysRow([".", "0", "-"]),
    keysRow(["+", ",", "#", "*"]),
  ],
};
