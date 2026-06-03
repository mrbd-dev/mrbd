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

function charsRow(chars: string[]): MrbdKeyDef[] {
  return chars.map((c) => ({ label: c, value: c }));
}

export const MRBD_DEFAULT_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** Default QWERTY layout with a number row on top and punctuation at the bottom. */
export const MRBD_DEFAULT_KEYBOARD_LAYOUT: MrbdKeyboardLayout = {
  rows: [
    charsRow(MRBD_DEFAULT_NUMBERS),
    lettersRow("QWERTYUIOP"),
    lettersRow("ASDFGHJKL"),
    lettersRow("ZXCVBNM"),
    charsRow(MRBD_DEFAULT_PUNCTUATION),
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
