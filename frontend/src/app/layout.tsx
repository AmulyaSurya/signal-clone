import type { Metadata } from "next";
import "./globals.css";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "Signal",
  description: "A Signal messaging experience clone — secure, simple, real-time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
