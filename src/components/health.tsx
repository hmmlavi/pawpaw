"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Loader2, Trash2, Syringe, Pill, TriangleAlert, Stethoscope, FileText, Scale, NotebookPen, Lock,
} from "lucide-react";
import { cn, HEALTH_KINDS, healthKindLabel } from "@/lib/utils";
import { addHealthRecordAction, deleteHealthRecordAction } from "@/actions/local";
import { toast } from "sonner";

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  vaccination: Syringe,
  medication: Pill,
  allergy: TriangleAlert,
  vet_visit: Stethoscope,
  document: FileText,
  weight: Scale,
  note: NotebookPen,
};

const KIND_TINT: Record<string, string> = {
  vaccination: "text-accent bg-accent/12 border-accent/25",
  medication: "text-sky bg-sky/12 border-sky/25",
  allergy: "text-clay bg-clay/12 border-clay/25",
  vet_visit: "text-sand bg-sand/12 border-sand/25",
  document: "text-white/70 bg-white/8 border-white/15",
  weight: "text-accent bg-accent/12 border-accent/25",
  note: "text-white/70 bg-white/8 border-white/15",
};

export type HealthRecord = {
  id: string;
  kind: string;
  title: string;
  details: string;
  recordDate: string | null;
  weightKg: number | null;
};

function WeightChart({ weights }: { weights: { date: string; kg: number }[] }) {
  if (weights.length < 2) return null;
  const w = 560, h = 120, pad = 12;
  const min = Math.min(...weights.map((x) => x.kg));
  const max = Math.max(...weights.map((x) => x.kg));
  const range = Math.max(0.4, max - min);
  const pts = weights.map((x, i) => ({
    x: pad + (i / (weights.length - 1)) * (w - pad * 2),
    y: h - pad - ((x.kg - min) / range) * (h - pad * 3),
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <div className="glass-hair relative mt-3 overflow-hidden rounded-2xl p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fb99a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8fb99a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${pts[pts.length - 1].x},${h - 2} L${pts[0].x},${h - 2} Z`} fill="url(#wg)" />
        <path d={path} fill="none" stroke="#8fb99a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0b0c0e" stroke="#8fb99a" strokeWidth="2" />)}
      </svg>
      <div className="flex justify-between text-[10px] text-white/45">
        <span>{new Date(weights[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span className="font-bold text-accent">{weights[weights.length - 1].kg} kg now</span>
        <span>{new Date(weights[weights.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

export function HealthVault({ petName, records }: { petName: string; records: HealthRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("vaccination");
  const [filter, setFilter] = useState("all");
  const [pending, start] = useTransition();

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const weights = records
    .filter((r) => r.kind === "weight" && r.weightKg)
    .map((r) => ({ date: r.recordDate ?? "", kg: r.weightKg! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const shown = filter === "all" ? records : records.filter((r) => r.kind === filter);
  const allergies = records.filter((r) => r.kind === "allergy");

  return (
    <div>
      {/* privacy banner */}
      <div className="glass glass-sheen mb-5 flex items-center gap-3 rounded-3xl p-4 animate-rise">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30">
          <Lock className="h-4.5 w-4.5 text-accent" />
        </span>
        <p className="text-dim text-xs leading-relaxed">
          The vault is <span className="font-bold text-white/85">private by default</span> — only you can see {petName}'s records.
          The AI assistant can only use it when you explicitly ask about a record.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <button className="chip shrink-0 !py-1.5" data-active={filter === "all"} onClick={() => setFilter("all")}>All</button>
          {HEALTH_KINDS.map((k) => (
            <button key={k.value} className="chip shrink-0 !py-1.5" data-active={filter === k.value} onClick={() => setFilter(k.value)}>{k.label}</button>
          ))}
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2 text-sm"><Plus className="h-4 w-4" /> Add record</button>
      </div>

      {/* allergies summary */}
      {allergies.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-clay/25 bg-clay/8 px-4 py-3 animate-fade">
          <TriangleAlert className="h-4 w-4 shrink-0 text-clay" />
          <p className="text-xs font-semibold text-clay">Known allergies: {allergies.map((a) => a.title).join(", ")}</p>
        </div>
      )}

      {/* weight trend */}
      {weights.length > 0 && (
        <section className="glass glass-sheen mb-5 animate-rise rounded-3xl p-4.5">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-white/90">Weight trend</h2>
          </div>
          {weights.length >= 2 ? (
            <WeightChart weights={weights} />
          ) : (
            <p className="text-faint mt-2 text-xs">Current: {weights[0].kg} kg — add more entries over time to see the trend.</p>
          )}
        </section>
      )}

      {/* records */}
      {shown.length === 0 ? (
        <div className="glass glass-sheen animate-rise rounded-3xl p-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-clay/18 to-accent/12 border border-white/10">
            <Stethoscope className="h-6 w-6 text-clay/80" />
          </span>
          <h3 className="card-title text-lg font-bold text-white/90">{petName}'s health story begins here</h3>
          <p className="text-dim mx-auto mt-1.5 max-w-sm text-sm leading-relaxed">
            Vaccinations, medications, vet visits and weight — kept safe, organized and private.
          </p>
          <button onClick={() => setOpen(true)} className="btn-ghost mt-5 text-sm"><Plus className="h-4 w-4" /> Add the first record</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((r) => {
            const Icon = KIND_ICONS[r.kind] ?? FileText;
            return (
              <div key={r.id} className="glass glass-sheen glass-hover group animate-rise rounded-3xl p-4.5">
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", KIND_TINT[r.kind] ?? KIND_TINT.note)}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white/92">{r.title}</p>
                    <p className="text-faint text-[11px] font-semibold uppercase tracking-wide">{healthKindLabel(r.kind)}{r.recordDate ? ` · ${new Date(r.recordDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}{r.weightKg ? ` · ${r.weightKg} kg` : ""}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm("Delete this record?")) start(async () => { const res = await deleteHealthRecordAction(r.id); if (res.ok) { toast.success("Record deleted."); router.refresh(); } }); }}
                    className="rounded-lg p-1.5 text-white/25 opacity-0 transition-all hover:bg-clay/15 hover:text-clay group-hover:opacity-100" aria-label="Delete record">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {r.details && <p className="text-dim mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed">{r.details}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* add modal */}
      {open && (
        <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={() => setOpen(false)}>
          <div className="glass-deep flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
              <h2 className="card-title text-lg font-bold">Add health record</h2>
              <button onClick={() => setOpen(false)} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <form className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4"
              action={(fd) => {
                start(async () => {
                  const res = await addHealthRecordAction(fd);
                  if (res.ok) { toast.success("Record added to the vault."); setOpen(false); router.refresh(); }
                  else toast.error(res.error ?? "Couldn't add record.");
                });
              }}>
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {HEALTH_KINDS.map((k) => {
                    const Icon = KIND_ICONS[k.value] ?? FileText;
                    return (
                      <button key={k.value} type="button" onClick={() => setKind(k.value)}
                        className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 transition-all",
                          kind === k.value ? "border-accent/45 bg-accent/12 text-accent" : "border-white/8 bg-white/3 text-white/55 hover:border-white/18")}>
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-bold leading-none">{k.label}</span>
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="kind" value={kind} />
              </div>
              <div>
                <label className="label">{kind === "vaccination" ? "Vaccine name" : kind === "medication" ? "Medication" : kind === "allergy" ? "Allergen" : kind === "weight" ? "Entry name (e.g. Monthly check)" : "Title"}</label>
                <input name="title" required maxLength={80} className="field" placeholder={kind === "vaccination" ? "e.g. Rabies vaccine" : kind === "allergy" ? "e.g. Chicken" : "Title"} />
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: kind === "weight" ? "1fr 1fr" : "1fr" }}>
                <div>
                  <label className="label">Date</label>
                  <input name="recordDate" type="date" className="field" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                {kind === "weight" && (
                  <div>
                    <label className="label">Weight (kg)</label>
                    <input name="weightKg" type="number" step="0.01" min="0.01" max="300" className="field" placeholder="e.g. 12.4" required />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Details</label>
                <textarea name="details" rows={3} maxLength={600} className="field resize-none"
                  placeholder={kind === "vet_visit" ? "Clinic, reason, outcome, next visit…" : kind === "document" ? "What document is this? (e.g. blood test results from…)" : "Notes, dosage, booster due date…"} />
                {kind === "document" && <p className="text-faint mt-1.5 text-[11px]">Store a summary here — attach the original file to the pet's messages or keep it in your records.</p>}
              </div>
              <div className="flex justify-end gap-2 pb-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={pending} className="btn-primary text-sm">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
