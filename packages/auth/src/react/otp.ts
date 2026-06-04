/** Strip non-digits and cap at `length`. */
export function parseOtpDigits(text: string, length: number): string {
  return text.replace(/\D/g, "").slice(0, length);
}
