import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="glass-deep flex h-16 w-16 items-center justify-center rounded-[22px] animate-rise">
        <PawPrint className="h-7 w-7 text-sage" />
      </span>
      <h1 className="card-title mt-6 text-2xl font-bold tracking-tight">This trail went cold</h1>
      <p className="text-dim mt-2 max-w-xs text-sm leading-relaxed">The pet, post or page you're looking for doesn't exist — or may have been removed.</p>
      <Link href="/home" className="btn-primary mt-6 text-sm">Back to home</Link>
    </main>
  );
}
