"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/store";

const DEMO_USERS = [
  { username: "alex", display_name: "Alex Carter", color: "#2C6BED" },
  { username: "priya", display_name: "Priya Nair", color: "#E63950" },
  { username: "sam", display_name: "Sam Okafor", color: "#4CAF50" },
  { username: "mira", display_name: "Mira Chen", color: "#9C27B0" },
  { username: "leo", display_name: "Leo Fischer", color: "#FF9500" },
];

type Step = "phone" | "otp" | "profile";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrate, loginWithUsername, requestOtp, verifyOtp } = useAuthStore();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mockOtpHint, setMockOtpHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/app");
  }, [isLoading, isAuthenticated, router]);

  const handleSendOtp = async () => {
    setError("");
    if (!phone.trim()) {
      setError("Enter a phone number");
      return;
    }
    setBusy(true);
    try {
      const otpHint = await requestOtp(phone.trim());
      setMockOtpHint(otpHint);
      setStep("otp");
    } catch {
      setError("Could not send OTP. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setBusy(true);
    try {
      await verifyOtp(phone.trim(), otp.trim());
      router.replace("/app");
    } catch (e: any) {
      if (e?.response?.data?.detail?.includes("display_name")) {
        setStep("profile");
      } else {
        setError(e?.response?.data?.detail || "Invalid code");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteProfile = async () => {
    setError("");
    if (!displayName.trim()) {
      setError("Enter a display name");
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(phone.trim(), otp.trim(), displayName.trim());
      router.replace("/app");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleDemoLogin = async (username: string) => {
    setError("");
    setBusy(true);
    try {
      await loginWithUsername(username);
      router.replace("/app");
    } catch {
      setError("Could not log in to demo account");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-signal-bg-secondary dark:bg-signal-bg-dark-secondary px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-signal-blue flex items-center justify-center mb-3 shadow-lg">
            <MessageCircle size={32} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-semibold">Signal</h1>
          <p className="text-signal-text-secondary dark:text-signal-text-secondary-dark text-sm mt-1">
            Say hello to a different messaging experience
          </p>
        </div>

        <div className="bg-white dark:bg-signal-bg-dark-elevated rounded-2xl shadow-panel p-6">
          {step === "phone" && (
            <>
              <h2 className="font-semibold text-lg mb-1">Your phone number</h2>
              <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark mb-4">
                We'll send a mocked verification code — no real SMS is sent.
              </p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0100 001"
                className="w-full bg-signal-bg-secondary dark:bg-signal-bg-dark rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
              />
              {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
              <button
                onClick={handleSendOtp}
                disabled={busy}
                className="w-full bg-signal-blue text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send code"}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-signal-blue" />
                <h2 className="font-semibold text-lg">Enter the code</h2>
              </div>
              <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark mb-4">
                Sent to {phone}. {mockOtpHint && (
                  <span className="text-signal-blue font-medium">(mocked code: {mockOtpHint})</span>
                )}
              </p>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                className="w-full bg-signal-bg-secondary dark:bg-signal-bg-dark rounded-lg px-3 py-2.5 text-sm outline-none mb-3 tracking-widest text-center text-lg"
              />
              {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
              <button
                onClick={handleVerifyOtp}
                disabled={busy}
                className="w-full bg-signal-blue text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Verify"}
              </button>
              <button onClick={() => setStep("phone")} className="w-full text-sm text-signal-blue mt-3">
                Change phone number
              </button>
            </>
          )}

          {step === "profile" && (
            <>
              <h2 className="font-semibold text-lg mb-1">Set up your profile</h2>
              <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark mb-4">
                This is how you'll appear to others.
              </p>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full bg-signal-bg-secondary dark:bg-signal-bg-dark rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
              />
              {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
              <button
                onClick={handleCompleteProfile}
                disabled={busy}
                className="w-full bg-signal-blue text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
              >
                {busy ? "Creating account..." : "Get started"}
              </button>
            </>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-signal-bg-dark-elevated rounded-2xl shadow-panel p-5">
          <p className="text-xs font-semibold text-signal-text-secondary dark:text-signal-text-secondary-dark uppercase mb-3">
            Quick demo login (seeded accounts)
          </p>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.username}
                onClick={() => handleDemoLogin(u.username)}
                disabled={busy}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-left disabled:opacity-50"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: u.color }}
                >
                  {u.display_name.split(" ").map((p) => p[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.display_name}</p>
                  <p className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark">
                    @{u.username}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
