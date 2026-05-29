import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Prompts for a single line of input on the terminal. Returns the trimmed
// answer. Throws if stdin is not a TTY so non-interactive callers fail loudly
// instead of hanging.
export async function prompt(question: string): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error(
      `This command needs interactive input ("${question.trim()}") but stdin is not a terminal. Pass the value as a flag instead.`,
    );
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}
