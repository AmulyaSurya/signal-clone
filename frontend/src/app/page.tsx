import Link from "next/link";
import {
  MessageCircle, Zap, Users, RadioTower, Check, CheckCheck, ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Signal — real-time messaging",
  description: "A fast, focused messaging experience — built for real conversations.",
};

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time, always",
    body: "Messages, typing indicators, and read receipts land the instant they happen — no refresh, no delay.",
  },
  {
    icon: Users,
    title: "Groups that stay organized",
    body: "Start a thread with two people or twenty. Everyone stays in sync, automatically.",
  },
  {
    icon: RadioTower,
    title: "Works everywhere you do",
    body: "Pick up a conversation on your phone right where you left it on desktop.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0E0E0E] overflow-x-hidden">
      {/* ---- Nav ---- */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-signal-blue flex items-center justify-center">
            <MessageCircle size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight text-[17px]">Signal</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[#0E0E0E]/70 hover:text-[#0E0E0E] transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold bg-signal-blue text-white px-4 py-2 rounded-full hover:bg-signal-blue-dark transition-colors"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-signal-blue font-medium mb-5">
            REAL-TIME &middot; CROSS-DEVICE
          </p>
          <h1 className="text-[44px] sm:text-[56px] leading-[1.03] font-black tracking-tight mb-6">
            Conversations that
            <br />
            keep pace with you.
          </h1>
          <p className="text-lg text-[#0E0E0E]/60 leading-relaxed max-w-md mb-8">
            Signal is a focused messaging app for the conversations that matter —
            direct messages, groups, and everything in between, delivered the
            moment you hit send.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#0E0E0E] text-white px-6 py-3.5 rounded-full hover:bg-signal-blue transition-colors group"
            >
              Get started
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[#0E0E0E]/60 hover:text-[#0E0E0E] transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="text-xs text-[#0E0E0E]/35 mt-8">
            A demo messaging client — not affiliated with Signal Foundation.
          </p>
        </div>

        {/* Signature element: live-looking conversation mockup */}
        <div className="relative">
          <div
            className="motion-safe:animate-ambient-drift absolute -inset-8 rounded-[40px] bg-signal-blue/15 blur-3xl -z-10"
            aria-hidden
          />
          <div className="mx-auto w-full max-w-[340px] rounded-[32px] bg-[#141414] p-2 shadow-2xl">
            <div className="rounded-[26px] bg-[#1B1C1F] overflow-hidden">
              {/* mock status bar */}
              <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-white/5">
                <div className="w-8 h-8 rounded-full bg-signal-blue flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  P
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium leading-tight truncate">Priya Nair</p>
                  <p className="text-[11px] text-[#4CAF50] leading-tight">online</p>
                </div>
              </div>

              {/* mock conversation */}
              <div className="px-4 py-5 flex flex-col gap-2.5 min-h-[300px]">
                <div
                  className="self-start max-w-[78%] bg-[#2C2C2E] text-white/90 text-[13px] leading-snug px-3.5 py-2 rounded-2xl rounded-bl-md motion-safe:animate-bubble-in"
                  style={{ animationDelay: "0.1s" }}
                >
                  hey! are we still on for tomorrow?
                </div>
                <div
                  className="self-end max-w-[78%] bg-signal-blue text-white text-[13px] leading-snug px-3.5 py-2 rounded-2xl rounded-br-md motion-safe:animate-bubble-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  yes! 10am works for me
                </div>
                <div
                  className="self-end flex items-center gap-1 pr-1 -mt-1 motion-safe:animate-bubble-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  <span className="text-[10px] text-white/30">10:41 AM</span>
                  <CheckCheck size={13} className="text-signal-blue" />
                </div>
                <div
                  className="self-start flex items-center gap-1 bg-[#2C2C2E] px-3.5 py-2.5 rounded-2xl rounded-bl-md w-fit motion-safe:animate-bubble-in"
                  style={{ animationDelay: "1s" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 typing-dot" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 typing-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 typing-dot" style={{ animationDelay: "0.3s" }} />
                </div>
                <div
                  className="self-start max-w-[78%] bg-[#2C2C2E] text-white/90 text-[13px] leading-snug px-3.5 py-2 rounded-2xl rounded-bl-md motion-safe:animate-bubble-in"
                  style={{ animationDelay: "1.8s" }}
                >
                  perfect, see you then 🎉
                </div>
              </div>

              {/* mock composer */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
                <div className="flex-1 h-9 rounded-full bg-[#2C2C2E]" />
                <div className="w-9 h-9 rounded-full bg-signal-blue flex items-center justify-center shrink-0">
                  <Check size={15} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Feature strip ---- */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#E4E4E5]">
        <div className="grid sm:grid-cols-3 gap-10">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="w-10 h-10 rounded-xl bg-signal-blue/10 flex items-center justify-center mb-4">
                <Icon size={19} className="text-signal-blue" />
              </div>
              <h3 className="font-semibold text-[15px] mb-1.5">{title}</h3>
              <p className="text-sm text-[#0E0E0E]/55 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- CTA footer ---- */}
      <section className="border-t border-[#E4E4E5] bg-[#F6F6F6]">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Start a conversation.
          </h2>
          <p className="text-[#0E0E0E]/55 mb-8 max-w-sm">
            Jump in with a demo account — no setup required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-signal-blue text-white px-7 py-3.5 rounded-full hover:bg-signal-blue-dark transition-colors group"
          >
            Get started
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-[#0E0E0E]/35">
        <span>&copy; {new Date().getFullYear()} Signal clone — demo project.</span>
        <span>Built with Next.js</span>
      </footer>
    </div>
  );
}
