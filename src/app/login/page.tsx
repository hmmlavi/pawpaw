import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthShell, LoginForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/home");
  return (
    <AuthShell title="Welcome back" sub="Sign in to manage your pet's world.">
      <LoginForm />
    </AuthShell>
  );
}
