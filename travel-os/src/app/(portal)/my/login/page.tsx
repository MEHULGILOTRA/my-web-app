import { redirect } from "next/navigation";

import { getPortalCustomer } from "@/lib/auth/portal-session";
import { PortalLoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function PortalLoginPage() {
  // Someone already signed in who lands here should go to their trips, not be
  // asked to prove themselves again.
  const customer = await getPortalCustomer();
  if (customer) redirect("/my");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="bg-brand-gradient mb-6 flex size-12 items-center justify-center rounded-2xl text-lg font-semibold text-white">
        S
      </div>

      <h1 className="text-brand-ink text-xl font-semibold">My SkyMiles Trip</h1>
      <p className="text-brand-ink/60 mt-1 text-sm leading-relaxed">
        Sign in to see your itinerary, documents and trip details.
      </p>

      <PortalLoginForm />

      <p className="text-brand-ink/50 mt-10 text-xs leading-relaxed">
        Accounts are created by SkyMiles Travels when your trip is booked. If you
        cannot sign in, contact us and we&rsquo;ll set you up.
      </p>
    </main>
  );
}
