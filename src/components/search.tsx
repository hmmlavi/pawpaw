"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchInput({ initial, tab }: { initial: string; tab: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQ(initial); }, [initial]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (value: string) => {
    router.push(`/search?q=${encodeURIComponent(value.trim())}&tab=${tab}`);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(q); }}
      className="glass-deep glass-sheen flex items-center gap-3 rounded-2xl px-4 py-3.5 animate-rise"
    >
      <Search className="text-faint h-4.5 w-4.5 shrink-0" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => submit(e.target.value), 400);
        }}
        placeholder="Pets, @usernames, breeds, #hashtags, cities, clinics…"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-white/90 outline-none placeholder:text-white/30"
        maxLength={80}
      />
      {q && (
        <button type="button" onClick={() => { setQ(""); submit(""); }} className="text-faint transition-colors hover:text-white/80" aria-label="Clear">
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
