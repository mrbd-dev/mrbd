import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

// Shown to anyone visiting from a phone or computer. This is an ordinary,
// responsive website — no 600x600 lock, no D-pad assumptions. The glasses get
// the focused app experience in `GlassesHome` instead.
const steps = [
  {
    title: "Open the Meta AI app",
    body: "On the phone paired with your Meta Ray-Ban Display glasses, turn on Developer Mode.",
  },
  {
    title: "Add this web app",
    body: "Go to App Settings > App Connections > Web Apps > Add a Web App, then paste this page's URL.",
  },
  {
    title: "Launch on the glasses",
    body: "Open it from the glasses app grid. You'll see the experience built for the 600 x 600 display.",
  },
];

export function WebHome() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16 sm:py-24">
        <header className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-300" />
          MRBD Web App
        </header>

        <section className="mt-10">
          <h1 className="text-4xl font-black leading-[1.05] sm:text-6xl">__MRBD_APP_TITLE__</h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-300 sm:text-xl">
            This experience is designed for Meta Ray-Ban Display glasses. Open it on your glasses to use the full app —
            this page is the welcome screen for everyone else.
          </p>

          <div className="mt-8">
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-xl bg-cyan-400 px-5 py-3 font-bold text-black transition-colors hover:bg-cyan-300"
            >
              Try the sign-in demo
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Open on your glasses</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="border-white/10 bg-[#16181d]">
                <CardContent className="p-5">
                  <span className="text-2xl font-black text-cyan-300">{index + 1}</span>
                  <p className="mt-3 font-bold">{step.title}</p>
                  <p className="mt-2 text-sm text-zinc-400">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-auto pt-16 text-sm text-zinc-500">
          Built with Next.js, Tailwind CSS, and the mrbd packages.
        </footer>
      </div>
    </main>
  );
}
