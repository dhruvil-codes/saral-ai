"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          toast.error(`Sign Up Error: ${error.message}`);
        } else if (data.session) {
          // Email confirmation disabled: session is immediate — go to dashboard
          // where /api/auth/me will provision the user and open onboarding.
          toast.success("Account created! Setting up your workspace...");
          window.location.href = "/dashboard";
        } else {
          toast.success("Account created! Please check your email for confirmation.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error(`Login Error: ${error.message}`);
        } else {
          toast.success("Logged in successfully! Redirecting...");
          window.location.href = "/dashboard";
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(`Google Login Error: ${error.message}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter your email address first to reset password.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      });
      if (error) {
        toast.error(`Reset Error: ${error.message}`);
      } else {
        toast.success("Password reset link sent to your email.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-2 sm:p-4">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            {isSignUp ? "Create an account" : "Login to your account"}
          </CardTitle>
          <CardDescription className="text-white/70 text-sm">
            {isSignUp
              ? "Enter your details below to create your account"
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="email" className="text-white/80 text-xs font-medium">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || googleLoading}
                  required
                  className="h-10 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/40 text-sm rounded-lg"
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password" className="text-white/80 text-xs font-medium">
                    Password
                  </FieldLabel>
                  {!isSignUp && (
                    <a
                      href="#"
                      onClick={handleForgotPassword}
                      className="ml-auto inline-block text-xs text-white/80 underline-offset-4 hover:underline hover:text-white transition-colors"
                    >
                      Forgot your password?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || googleLoading}
                  required
                  className="h-10 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:border-white/40 text-sm rounded-lg"
                />
              </Field>

              <Field className="gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-10 rounded-lg bg-white hover:bg-gray-200 text-black font-semibold text-sm transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-4 animate-spin text-black" />}
                  {isSignUp ? "Sign Up" : "Login"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || loading}
                  className="w-full h-10 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors font-medium text-sm cursor-pointer flex items-center justify-center gap-2.5"
                >
                  {googleLoading ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  Login with Google
                </Button>

                <FieldDescription className="text-center text-xs text-white/70 mt-2">
                  {isSignUp ? (
                    <span>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(false)}
                        className="underline underline-offset-4 text-white/80 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium"
                      >
                        Login
                      </button>
                    </span>
                  ) : (
                    <span>
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(true)}
                        className="underline underline-offset-4 text-white/80 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium"
                      >
                        Sign up
                      </button>
                    </span>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
