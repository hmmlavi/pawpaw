"use client";

import { useState } from "react";
import { AppShell, CreateLauncher, type ShellPet } from "./app-shell";
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
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<"post" | "reel" | "story" | null>(null);

  return (
    <AppShell activePet={activePet} pets={pets} unread={unread} openComposer={() => setLauncherOpen(true)}>
      {children}
      <CreateLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} onPick={(k) => { setLauncherOpen(false); setComposerKind(k); }} />
      {composerKind && activePet && (
        <Composer kind={composerKind} petName={activePet.name} city={city} onClose={() => setComposerKind(null)} />
      )}
    </AppShell>
  );
}
