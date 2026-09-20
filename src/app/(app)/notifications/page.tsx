import { getActiveContext } from "@/lib/auth";
import { loadNotifications } from "@/lib/queries";
import { NotificationsClient } from "@/components/notifications";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = startOfDay(now) - startOfDay(d);
  if (diff <= 0) return "Today";
  if (diff <= 86400000) return "Yesterday";
  if (diff <= 86400000 * 7) return "This week";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

export default async function NotificationsPage() {
  const ctx = await getActiveContext();
  if (!ctx?.user) redirect("/login");
  const notifications = await loadNotifications(ctx.user.id);

  const groups = new Map<string, typeof notifications>();
  for (const n of notifications) {
    const g = groupLabel(n.createdAt);
    groups.set(g, [...(groups.get(g) ?? []), n]);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 animate-rise">
        <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Activity</p>
        <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Notifications</h1>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          body="Follows, likes, messages, event updates and birthday moments will land here — intelligently grouped."
        />
      ) : (
        <div className="space-y-6">
          {GROUP_ORDER.filter((g) => groups.has(g)).map((g) => (
            <section key={g}>
              <h2 className="text-faint mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em]">{g}</h2>
              <div className="glass space-y-0.5 rounded-3xl p-1.5">
                {groups.get(g)!.map((n) => <NotificationsClient key={n.id} notification={n} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
