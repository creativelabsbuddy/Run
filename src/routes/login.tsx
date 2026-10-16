import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, rememberBearer, signIn } from "@/lib/auth/client";
import { fieldClass } from "@/components/ui";
import { claimBrowserProjects, startProject } from "@/lib/projects";

export const Route = createFileRoute("/login")({ component: Login });

const PENDING = "run.pendingPrompt";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish() {
    await claimBrowserProjects().catch(() => undefined);
    const pending = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    if (pending) {
      const session = await authClient.getSession();
      const ownerId = session.data?.user?.id;
      if (!ownerId) {
        await navigate({ to: "/projects" });
        return;
      }
      const id = await startProject(pending, ownerId);
      await navigate({ to: "/p/$id", params: { id } });
      return;
    }
    await navigate({ to: "/projects" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              email: email.trim(),
              password,
              name: name.trim() || email.trim(),
            })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        const message = result.error.message || "";
        if (mode === "up" && /already exists/i.test(message)) {
          setMode("in");
          setError("Is email pe account hai. Password daal ke sign in karo. Naya account doosri email se banega.");
          return;
        }
        if (/origin/i.test(message)) {
          setError("Sign in abhi connect nahi hua. Ek baar aur try karo.");
          return;
        }
        setError(mode === "up" ? "Account nahi bana. Doosri email try karo." : "Email ya password galat hai.");
        return;
      }
      const token = result.data && "token" in result.data ? result.data.token : null;
      if (typeof token === "string" && token) rememberBearer(token);
      try {
        await finish();
      } catch {
        await navigate({ to: "/projects" });
      }
    } catch {
      setError("Ho nahi paya. Ek baar aur try karo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-card p-5">
        <h1 className="text-xl font-semibold">{mode === "up" ? "Create account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-muted">Same email brings back the projects you saved.</p>
        {authEnabled ? (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            {mode === "up" ? (
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" autoComplete="name" className={fieldClass} />
            ) : null}
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="Email" autoComplete="email" className={fieldClass} />
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error ? <p className="text-sm text-muted">{error}</p> : null}
            <button type="submit" disabled={busy} className="h-11 rounded-full bg-fg text-sm font-medium text-bg disabled:opacity-40">
              {mode === "up" ? "Create account" : "Sign in"}
            </button>
            <button type="button" onClick={() => setMode(mode === "up" ? "in" : "up")} className="h-10 text-sm text-muted">
              {mode === "up" ? "Already have an account? Sign in" : "New here? Create account"}
            </button>
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => {
                  setError("");
                  void signIn(provider.providerId, { callbackURL: "/projects" }).catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "";
                    setError(
                      /pop-up|popup/i.test(message)
                        ? "Google ke liye pop-up allow karo, phir dubara dabao."
                        : "Google sign-in nahi hua. Email se try karo.",
                    );
                  });
                }}
                className="h-11 rounded-full text-sm ring-1 ring-line"
              >
                Continue with {provider.label}
              </button>
            ))}
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">Sign-in is off.</p>
        )}
      </div>
    </main>
  );
}
