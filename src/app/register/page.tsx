import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthShell, RegisterForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/home");
  return (
    <AuthShell title="Join Pawkind" sub="The human account — your pet gets the spotlight next.">
      <RegisterForm />
    </AuthShell>
  );
}
