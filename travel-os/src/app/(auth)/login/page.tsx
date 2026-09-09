import { LoginForm } from "./login-form";

/**
 * Server Component so the `next` parameter can be read here and handed to the
 * form as a prop. Reading it client-side with useSearchParams() would force the
 * page into a Suspense boundary and bail out of prerendering.
 *
 * searchParams is a Promise in Next 16 — synchronous access was removed.
 */
export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "";
  const callbackError = typeof error === "string" ? error : undefined;

  return (
    <main className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* The gradient is reserved for customer-facing surfaces and this
            screen — never behind the dense admin tables. */}
        <div className="bg-brand-gradient mb-6 flex size-12 items-center justify-center rounded-xl text-lg font-semibold text-white">
          S
        </div>

        <h1 className="text-xl font-semibold tracking-tight">
          SkyMiles Travel OS
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sign in to continue.
        </p>

        <LoginForm next={target} callbackError={callbackError} />
      </div>
    </main>
  );
}
