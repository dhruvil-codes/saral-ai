"use client";

import { useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { Toaster, toast } from "sonner";

export default function LoginPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      toast.error(`Authentication Failed: ${errorParam}`);
    }
  }, []);

  return (
    <main 
      className="min-h-screen w-full bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none font-sans bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/login-bg.png")' }}
    >
      <Toaster position="top-center" theme="dark" richColors />

      {/* Subtle dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 
            className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            style={{ textShadow: "0px 2px 8px rgba(0,0,0,0.8)" }}
          >
            Saral AI
          </h1>
          <p 
            className="text-white/90 text-sm sm:text-base max-w-sm mx-auto font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }}
          >
            Zero-friction access to your voice automation platform & lead insights.
          </p>
        </div>

        {/* Shadcn login-01 LoginForm Component */}
        <LoginForm />

        {/* Footer info */}
        <p 
          className="text-center text-xs text-white/80 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
          style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.9)" }}
        >
          By signing in, you agree to our Terms of Service & Privacy Policy.
        </p>
      </div>
    </main>
  );
}
