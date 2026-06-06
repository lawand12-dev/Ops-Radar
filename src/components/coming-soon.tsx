"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "<npm>/components/ui/button";
import { Input } from "<npm>/components/ui/input";
import Image from "next/image";

// ⚙️ CUSTOMIZE THIS SECTION
const COMING_SOON_CONFIG = {
  enabled: true, // Set to false to disable the overlay
  logoUrl: "/logo.svg", // SVG for perfect quality
  logoAlt: "OpsRadar Logo",
  logoHeight: 80, // Logo height in pixels
  mainHeading: "Coming Soon",
  subtitle: "Something exceptional is on the way.",
  description: "Be the first to know when OpsRadar launches. Join our waitlist for early access.",
  buttonText: "Get Notified",
  successMessage: "Thanks for signing up!",
  successDescription: "We'll be in touch soon with exciting updates.",
  privacyText: "We respect your privacy. No spam, ever.",
};

export function ComingSoon() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!COMING_SOON_CONFIG.enabled) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Only accept Gmail addresses
    if (!normalizedEmail.endsWith("@gmail.com")) {
      setErrorMessage("Please use a valid Gmail address (example@gmail.com)");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/coming-soon-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to subscribe");
      }

      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="relative max-w-2xl w-full">
        {/* Gradient glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-[#0066FF]/20 to-[#00D4FF]/20 blur-2xl rounded-2xl opacity-60"></div>
        
        {/* Content Card */}
        <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 rounded-2xl p-12 shadow-2xl">
          {/* Logo with Premium Styling */}
          <div className="mb-10 flex justify-center">
            <div className="relative">
              {/* Glow effect behind logo */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#0066FF]/40 to-[#00D4FF]/40 blur-2xl rounded-full opacity-70"></div>
              
              {/* Logo container with border */}
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl">
                <Image
                  src={COMING_SOON_CONFIG.logoUrl}
                  alt={COMING_SOON_CONFIG.logoAlt}
                  height={COMING_SOON_CONFIG.logoHeight}
                  width={COMING_SOON_CONFIG.logoHeight * 2.5}
                  priority
                  quality={100}
                  unoptimized={false}
                  className="object-contain drop-shadow-lg"
                  style={{ imageRendering: "crisp-edges" }}
                />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-center text-white mb-2 font-serif leading-tight">
            {COMING_SOON_CONFIG.mainHeading}
          </h1>

          {/* Subtitle */}
          <p className="text-center text-slate-300 text-lg mb-4">
            {COMING_SOON_CONFIG.subtitle}
          </p>

          {/* Description */}
          <p className="text-center text-slate-400 text-base mb-10 leading-relaxed max-w-lg mx-auto">
            {COMING_SOON_CONFIG.description}
          </p>

          {/* Success State */}
          {status === "success" ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div>
                <p className="text-xl text-green-400 font-medium">{COMING_SOON_CONFIG.successMessage}</p>
                <p className="text-slate-400 mt-2">{COMING_SOON_CONFIG.successDescription}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-base h-12 rounded-lg flex-1"
                />
                <Button
                  type="submit"
                  disabled={status === "loading" || !email.trim()}
                  className="bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:opacity-90 text-white font-semibold px-6 h-12 rounded-lg whitespace-nowrap"
                >
                  {status === "loading" ? (
                    <span className="inline-block animate-spin">↻</span>
                  ) : (
                    <>
                      <span className="hidden sm:inline">{COMING_SOON_CONFIG.buttonText}</span>
                      <ArrowRight className="w-5 h-5 sm:hidden" />
                    </>
                  )}
                </Button>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-400 text-center">{errorMessage}</p>
              )}
            </form>
          )}

          {/* Privacy Text */}
          <p className="text-xs text-slate-500 text-center mt-8">
            {COMING_SOON_CONFIG.privacyText}
          </p>
        </div>
      </div>
    </div>
  );
}
