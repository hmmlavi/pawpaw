import { getSessionUser, getUserPets } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding";
import { MAX_PETS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create your pet" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const userPets = await getUserPets(user.id);
  if (userPets.length >= MAX_PETS) redirect("/home");
  return <OnboardingWizard defaultCity={user.city ?? ""} hasPets={userPets.length > 0} />;
}
