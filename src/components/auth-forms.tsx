"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PawPrint, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { toast } from "sonner";

export function AuthShell({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5 animate-rise">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sage/40 to-sky/25 border border-white/15">
          <PawPrint className="h-4.5 w-4.5 text-sage" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">Pawkind</span>
      </Link>
      <div className="glass-deep glass-sheen animate-scale-in w-full max-w-sm rounded-[28px] p-7">
        <h1 className="card-title text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-dim mt-1.5 text-sm">{sub}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await loginAction(fd);
          if (res && !res.ok) {
            setError(res.error ?? "Something went wrong.");
            toast.error(res.error ?? "Sign in failed");
          }
        });
      }}
    >
      <div>
        <label className="label" htmlFor="email">Email</label>
        <div className="relative">
          <Mail className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input id="email" name="email" type="email" required autoComplete="email" className="field !pl-10" placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <Lock className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="field !pl-10 !pr-10" placeholder="Your password" />
          <button type="button" onClick={() => setShow(!show)} className="text-faint hover:text-white/70 absolute right-3 top-1/2 -translate-y-1/2 transition-colors" aria-label="Toggle password visibility">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && <p className="rounded-xl border border-clay/40 bg-clay/10 px-3.5 py-2.5 text-[13px] text-clay animate-fade">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full !py-3">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </button>
      <p className="text-faint pt-1 text-center text-[13px]">
        New to Pawkind? <Link href="/register" className="text-sage hover:text-sage/80 font-semibold transition-colors">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await registerAction(fd);
          if (res && !res.ok) {
            setError(res.error ?? "Something went wrong.");
            toast.error(res.error ?? "Could not create account");
          }
        });
      }}
    >
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <div className="relative">
          <User className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input id="name" name="name" required minLength={2} maxLength={60} autoComplete="name" className="field !pl-10" placeholder="The human behind the pet" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <div className="relative">
          <Mail className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input id="email" name="email" type="email" required autoComplete="email" className="field !pl-10" placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <Lock className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input id="password" name="password" type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" className="field !pl-10 !pr-10" placeholder="8+ characters" />
          <button type="button" onClick={() => setShow(!show)} className="text-faint hover:text-white/70 absolute right-3 top-1/2 -translate-y-1/2 transition-colors" aria-label="Toggle password visibility">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && <p className="rounded-xl border border-clay/40 bg-clay/10 px-3.5 py-2.5 text-[13px] text-clay animate-fade">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full !py-3">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </button>
      <p className="text-faint pt-1 text-center text-[13px]">
        Already joined? <Link href="/login" className="text-sage hover:text-sage/80 font-semibold transition-colors">Sign in</Link>
      </p>
    </form>
  );
}
