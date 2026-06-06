"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent relative overflow-hidden select-none">
      {/* Aurora Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-primary/5 blur-[120px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A29BFE]/5 dark:bg-[#A29BFE]/3 blur-[120px] animate-pulse"
          style={{ animationDuration: "12s" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#A29BFE] shadow-[0_4px_15px_rgba(108,92,231,0.25)]">
            <GraduationCap strokeWidth={1.5} className="size-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#A29BFE]">
            ELearnHub
          </span>
        </div>

        {/* Double-Bezel Card */}
        <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2.25rem] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_24px_80px_rgba(0,0,0,0.03)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
          <div className="p-8 rounded-[calc(2.25rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5">
            {/* Header */}
            <div className="text-center pb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5">
                Sign in to continue learning
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail
                    strokeWidth={1.2}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/80"
                  />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-11 pl-10 pr-4 rounded-xl border-border/40 focus-visible:ring-primary/20 focus-visible:border-primary bg-background/30 backdrop-blur-sm"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    strokeWidth={1.2}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/80"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 pl-10 pr-10 rounded-xl border-border/40 focus-visible:ring-primary/20 focus-visible:border-primary bg-background/30 backdrop-blur-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff strokeWidth={1.2} className="size-4" />
                    ) : (
                      <Eye strokeWidth={1.2} className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button (Button-in-Button CTA) */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="group/btn relative w-full h-11 flex items-center justify-between rounded-full bg-primary hover:bg-primary/95 text-white font-extrabold shadow-md shadow-primary/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] px-6 cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <span className="text-xs tracking-tight">Sign In</span>
                      <div className="flex size-7 items-center justify-center rounded-full bg-white/15 dark:bg-white/10 group-hover/btn:bg-white/25 transition-all duration-500">
                        <ChevronRight
                          strokeWidth={1.2}
                          className="size-4 text-white group-hover/btn:translate-x-0.5 transition-transform"
                        />
                      </div>
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center text-xs text-muted-foreground font-medium">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-primary dark:text-[#A29BFE] hover:underline transition-all"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
