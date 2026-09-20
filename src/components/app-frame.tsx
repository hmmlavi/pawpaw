"use client";

import { useState } from "react";
import { AppShell, type ShellPet } from "./app-shell";
import { Composer } from "./composer";

export function AppFrame({
  activePet,
  pets,
  unread,
  city,
  children,
}: {
  activePet: ShellPet | null;
  pets: ShellPet[];
  unread: number;
  city: string;
  children: React.ReactNode;
}) {
  const [composerKind, setComposerKind] = useState<"post" | "reel" | "story" | null>(null);

  return (
    <AppShell activePet={activePet} pets={pets} unread={unread} openComposer={(k) => setComposerKind(k)}>
      {children}
      {composerKind && activePet && (
        <Composer kind={composerKind} petName={activePet.name} city={city} onClose={() => setComposerKind(null)} />
      )}
    </AppShell>
  );
}
