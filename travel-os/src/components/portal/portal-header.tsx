/**
 * Portal header.
 *
 * Under `src/components/portal`, so ESLint forbids it from importing the admin
 * database client — a build error, not a convention.
 */
export function PortalHeader({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <header className="mx-auto w-full max-w-2xl px-5 pt-10 pb-8">
      <div className="bg-brand-gradient mb-5 flex size-11 items-center justify-center rounded-2xl text-lg font-semibold text-white">
        S
      </div>

      <h1 className="text-brand-ink text-xl font-semibold">
        {firstName ? `Hello, ${firstName}` : "My SkyMiles Trip"}
      </h1>
      <p className="text-brand-ink/60 mt-1 text-sm">
        Your itinerary, documents and trip details.
      </p>
    </header>
  );
}
