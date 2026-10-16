import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AppFrame } from "@/components/chrome";
import { readCredits, startProject } from "@/lib/projects";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const IDEAS = ["a site for my salon", "a recipe blog"];

export function BuilderScreen() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [prompt, setPrompt] = useState("");
  const [credits, setCredits] = useState(15);

  useEffect(() => {
    setCredits(readCredits());
  }, []);

  async function go(text: string) {
    if (!user) {
      sessionStorage.setItem("run.pendingPrompt", text);
      await navigate({ to: "/login" });
      return;
    }
    const id = await startProject(text, user.id);
    await navigate({ to: "/p/$id", params: { id } });
  }

  function build(event: FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    if (isPending) return;
    if (!user) {
      sessionStorage.setItem("run.pendingPrompt", text);
      void navigate({ to: "/login" });
      return;
    }
    void go(text);
  }

  return (
    <AppFrame mode="builder">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 pt-8 pb-12 text-center">
          <h1 className="text-[2.75rem] leading-[1.05] font-semibold tracking-tight">
            <span className="block">Run your</span>
            <span className="mt-1 block">
              <span className="relative inline-block">
                <span className="grad-text">site</span>
                <span className="grad-line absolute -bottom-1 left-0" />
              </span>
              <span> live</span>
            </span>
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted">
            Describe what you want. It gets designed, built, and put online in minutes. No coding required.
          </p>

          <form onSubmit={build} className="mt-8 w-full rounded-[1.4rem] border border-white/10 bg-card p-3 text-left">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the site you want..."
              aria-label="Describe the site you want"
              rows={4}
              className="w-full resize-none rounded-2xl bg-input px-4 py-4 text-base text-fg outline-none placeholder:text-muted"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="h-9 rounded-full px-3 text-sm text-fg ring-1 ring-white/15"
                >
                  {idea}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 h-12 w-full rounded-full text-base font-semibold text-white"
              style={{ backgroundImage: "linear-gradient(90deg, #4C8DFF, #7B5CFF)" }}
            >
              Build my site
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            <span className="font-medium text-fg">{credits}</span> credits · No card to start · Live in minutes
          </p>

          <div className="mt-8 w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-card text-left">
            <div className="flex h-11 items-center gap-3 px-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-[#7B5CFF]" />
                <span className="size-2.5 rounded-full bg-[#5B8CFF]" />
                <span className="size-2.5 rounded-full bg-[#3DDC97]" />
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-center">
                <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-input px-3 py-1 text-xs text-muted">
                  <Lock className="size-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  yours.site
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-fg">Publish</span>
            </div>
            <div className="min-h-48 border-t border-white/10 bg-bg" />
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

