import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, Eye, ImagePlus, Link2, Undo2 } from "lucide-react";
import { AppFrame } from "@/components/chrome";
import { fieldClass } from "@/components/ui";
import { PublishSheet } from "@/components/publish-sheet";
import { claimBrowserProjects, loadProject, openOwned, previewHtml, readCredits, rememberProject, stampImages, withAppMemory, mirrorLedger, CREDIT_PACK, CREDIT_PACK_PRICE, hasPaidPack, type Project } from "@/lib/projects";
import {
  applySimpleEdit,
  creditCeiling,
  creditsUsed,
  emptyBuild,
  fileTail,
  routeLocal,
  type ProjectBuild,
  type Tier,
} from "@/lib/build-flow";
import { classifyBuild, generateBuild } from "@/lib/build/api";
import { getLedger } from "@/lib/ledger-api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LINKS_EVENT, findUserListing, republishHosted, updateLiveListing } from "@/lib/live-links";
import type { Listing } from "@/lib/catalog";

const running = new Map<string, number>();

function stopped(error?: string): string {
  if (error === "timeout") return "Model ne time par jawab nahi diya. Credit nahi kata.";
  if (error === "cut") return "Page adhura aaya, isliye save nahi hua. Credit nahi kata.";
  if (error === "credits") return "Credits khatam. Recharge ke baad yahin se aage chalega. Credit nahi kata.";
  if (error === "no-key") return "Model ki key missing hai. Credit nahi kata.";
  return "Build nahi hua. Neeche dubara likho. Credit nahi kata.";
}

function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 640 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.62));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

function suggestionsFor(prompt: string, html: string): string[] {
  const text = `${prompt}\n${html.slice(0, 600)}`.toLowerCase();
  if (/watch|घड़ी|ghadi/.test(text)) {
    return ["Do watch cards aur add karo", "Background black karo", "Price bada dikhao"];
  }
  if (/shop|store|landing|brand|collection/.test(text)) {
    return ["Teen products aur add karo", "Hero ka color dark karo", "Neeche contact section lagao"];
  }
  return ["Heading bada karo", "Button ka color badlo", "Ek aur section add karo"];
}

function pendingPrompt(current: Project): string | null {
  const last = current.messages[current.messages.length - 1];
  if (last?.role === "user") return last.text;
  if (current.messages.length > 0 || current.html.trim()) return null;
  return current.prompt.trim() || null;
}

export function EditorScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null | undefined>(() => loadProject(projectId) ?? undefined);
  const { user, isPending } = useCurrentUserState();
  const seenUser = useRef<string | null>(user?.id ?? null);
  if (user?.id) seenUser.current = user.id;
  const ownerId = user?.id ?? seenUser.current;
  const [draft, setDraft] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [working, setWorking] = useState(false);
  const [credits, setCredits] = useState(() => readCredits());
  const [previewOn, setPreviewOn] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const frameHtml = useMemo(
    () => (project?.html ? withAppMemory(project.html, project.appData ?? {}) : ""),
    [project?.html, previewOn],
  );
  const [justUpdated, setJustUpdated] = useState(false);
  const projectRef = useRef<Project | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const kickoff = useRef<(current: Project) => void>(() => {});

  useEffect(() => {
    const local = readCredits();
    if (local > 0) setCredits(local);
    void getLedger()
      .then((row) => {
        mirrorLedger(row.credits, row.paid);
        setCredits(row.credits);
      })
      .catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    let timer = 0;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; key?: string; value?: string | null };
      if (data?.type !== "run-store" || !data.key) return;
      const current = projectRef.current;
      if (!current) return;
      const appData = { ...current.appData };
      if (data.value == null) delete appData[data.key];
      else appData[data.key] = String(data.value).slice(0, 20000);
      const next = { ...current, appData };
      projectRef.current = next;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setProject(next);
        rememberProject(next);
      }, 400);
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    if (isPending || !ownerId) return;
    let gone = false;
    void claimBrowserProjects()
      .catch(() => undefined)
      .then(() => openOwned(projectId))
      .then((row) => {
        if (gone) return;
        const adopted = row && row.ownerId !== ownerId ? { ...row, ownerId } : row;
        if (adopted && row && adopted.ownerId !== row.ownerId) rememberProject(adopted);
        setProject((prev) => {
          if (!adopted) return prev === undefined ? null : prev;
          if (prev && prev.id === adopted.id && prev.updatedAt > adopted.updatedAt) return prev;
          return adopted;
        });
      });
    return () => {
      gone = true;
    };
  }, [projectId, ownerId, isPending]);

  useEffect(() => {
    projectRef.current = project ?? null;
  }, [project]);

  useEffect(() => {
    function syncListing() {
      setListing(findUserListing(projectId));
    }
    syncListing();
    window.addEventListener(LINKS_EVENT, syncListing);
    return () => window.removeEventListener(LINKS_EVENT, syncListing);
  }, [projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [project?.messages, working]);

  useEffect(() => {
    if (!project || !ownerId) return;
    kickoff.current(project);
    // Only when this project opens. Typing and saves must not start the build again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, ownerId]);

  if (project === null && ownerId && !isPending) {
    return (
      <AppFrame mode="tool">
        <p className="px-4 pt-8 text-sm text-muted">This project is not on this account.</p>
      </AppFrame>
    );
  }
  if (!project) {
    if (!ownerId && !isPending) {
      return (
        <AppFrame mode="tool">
          <p className="px-4 pt-8 text-sm text-muted">Sign in to open this project.</p>
        </AppFrame>
      );
    }
    return (
      <AppFrame mode="editor" credits={credits}>
        <p className="px-4 pt-6 text-sm text-muted">Ban raha hai…</p>
      </AppFrame>
    );
  }
  if (!ownerId && !isPending) {
    return (
      <AppFrame mode="tool">
        <p className="px-4 pt-8 text-sm text-muted">Sign in to open this project.</p>
      </AppFrame>
    );
  }

  const mine = !ownerId || project.ownerId === ownerId;
  const live = listing?.status === "live";
  if (!mine) {
    return <PreviewOnly title={listing?.title || project.title} html={live ? listing?.html || "" : ""} />;
  }

  function persist(next: Project) {
    projectRef.current = next;
    setProject(next);
    rememberProject(next);
  }

  function say(current: Project, text: string, build: ProjectBuild, html = current.html) {
    const at = new Date().toISOString();
    persist({
      ...current,
      html,
      build,
      preview: html ? { heading: current.title.slice(0, 80), button: "Open" } : current.preview,
      messages: [...current.messages, { id: `a-${Date.now()}`, role: "assistant", text }],
      updatedAt: at,
    });
    if (html && html !== current.html) setPreviewOn(true);
  }

  function need(current: Project, amount: number, build: ProjectBuild) {
    say(current, `Iske liye ${amount} credits chahiye. ${readCredits()} hain. Recharge ke baad yahin se aage chalega.`, build);
  }

  function onPrimary() {
    const current = projectRef.current;
    if (!current?.html.trim()) return;
    if (live) {
      const ok = updateLiveListing({
        projectId: current.id,
        title: current.title.slice(0, 80),
        preview: current.preview,
        html: current.html,
      });
      if (ok) {
        setJustUpdated(true);
        window.setTimeout(() => setJustUpdated(false), 1600);
        return;
      }
    }
    if (listing?.status === "unlisted") {
      republishHosted(current.id, current.preview, current.html, current.title.slice(0, 80));
      return;
    }
    setPublishOpen(true);
  }

  function charge(current: Project, before: string, after: string, prompt: string, build: ProjectBuild, note: string, serverCredits?: number) {
    const cost = creditsUsed(prompt, before, after);
    const base = before.trim() && before !== after ? { ...current, undo: { html: before } } : current;
    if (typeof serverCredits === "number") mirrorLedger(serverCredits, hasPaidPack());
    if (cost <= 0) {
      say(base, "Credit nahi kata.", { ...build, lastFailed: false, step: null }, after);
      if (typeof serverCredits === "number") setCredits(serverCredits);
      return;
    }
    if (typeof serverCredits === "number") {
      setCredits(serverCredits);
      say(base, `${note} ${cost} credit.`, { ...build, lastFailed: false, step: null, planFor: prompt }, after);
      return;
    }
    if (readCredits() < cost) return need(current, cost, build);
    say(base, `${note} ${cost} credit.`, { ...build, lastFailed: false, step: null, planFor: prompt }, after);
  }

  async function askModel(current: Project, brief: string, chain: "free" | "tiny" | "simple" | "medium" | "heavy") {
    const data = { brief, fileName: current.html ? "index.html" : "", html: current.html, chain };
    const once = () =>
      Promise.race([
        generateBuild({ data }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 100000)),
      ]);
    try {
      return await once();
    } catch (error) {
      if (error instanceof Error && error.message === "timeout") throw error;
      return await once();
    }
  }

  async function runTurn(current: Project, text: string, images: string[] = []) {
    const photoNote = images.length
      ? `\nUse these photo sources exactly: ${images.map((_, index) => `RUN_IMG_${index + 1}`).join(", ")}.`
      : "";
    const build = current.build ?? emptyBuild();
    const route = routeLocal({ text, hasFile: Boolean(current.html), free: !hasPaidPack(), build });
    if (route.type === "ask-audience") {
      say(current, "Yeh kis ke liye hai?", { ...build, step: "audience", pending: route.pending });
      return;
    }
    if (route.type === "ask-action") {
      say(current, "Pehli screen pe kya action hai?", {
        ...build,
        step: "action",
        audience: route.audience,
        pending: route.pending,
      });
      return;
    }
    if (route.type === "edit") {
      const patched = applySimpleEdit(current.html, text);
      if (patched) {
        charge(current, current.html, patched, text, build, "Edit ho gaya. Model nahi chala.");
        return;
      }
    }
    if (route.type === "hold") {
      say(current, "Haan likho to yeh banega. Credit abhi nahi katega.", build);
      return;
    }
    const state = build.step === "action" ? { ...build, action: text.trim(), step: null } : build;
    let tier: Tier = "simple";
    let chain: "free" | "tiny" | "simple" | "medium" | "heavy" = hasPaidPack() ? "simple" : "free";
    let brief = text;
    let forModel = text;
    if (route.type === "plan") {
      say(
        current,
        "Yeh payment, login ya database hai. Pehle plan: ek screen, phir wahi action. Build 1.2 credits ka hoga. Haan likho to banega. Abhi credit nahi katega.",
        { ...build, step: "plan", pending: route.brief, planFor: route.brief },
      );
      return;
    }
    if (route.type === "build") {
      tier = route.tier;
      chain = route.chain;
      brief = route.brief;
      forModel = route.brief;
    } else if (route.type === "classify" || route.type === "edit") {
      const judged = await classifyBuild({
        data: { brief: route.type === "classify" ? route.brief : text, fileName: current.html ? "index.html" : "", tail: fileTail(current.html) },
      });
      if ("error" in judged) {
        say(current, "Classifier nahi chala, isliye build nahi hua. Credit nahi kata.", state);
        return;
      }
      tier = !hasPaidPack() || judged.tier === 1 ? "simple" : judged.tier === 2 ? "medium" : "heavy";
      chain = !hasPaidPack() ? "free" : tier;
      forModel = judged.task || brief;
      brief = forModel;
      if (tier === "heavy" && state.planFor !== forModel) {
        say(current, "Yeh heavy hai. Plan: pehle yahi kaam, poora code baad mein. Build 1.2 credits ka hoga. Haan likho to banega. Abhi credit nahi katega.", {
          ...state,
          step: "plan",
          pending: brief,
          planFor: brief,
        });
        return;
      }
    }
    const hold = creditCeiling(text, Boolean(current.html));
    if (readCredits() < hold) return need(current, hold, state);
    const result = await askModel(current, forModel + photoNote, chain);
    if ("error" in result) {
      if (typeof result.credits === "number") {
        mirrorLedger(result.credits, hasPaidPack());
        setCredits(result.credits);
      }
      say(current, stopped(result.error), { ...state, lastFailed: false, step: null });
      return;
    }
    const built = stampImages(result.html, images);
    if (built.trim() === current.html.trim()) {
      say(current, "Build fail ho gaya. Credit nahi kata.", { ...state, lastFailed: false, step: null });
      return;
    }
    const heard = forModel === text ? "" : `Classifier: ${forModel.slice(0, 160)}. `;
    charge(current, current.html, built, text, state, `${heard}Ban gaya. ${result.model}.`, result.credits);
  }

  async function sendText(text: string) {
    const current = projectRef.current;
    const clean = text.trim();
    if (!clean || !current || working || running.has(current.id)) return;
    running.set(current.id, Date.now());
    const messageId = `u-${Date.now()}`;
    sessionStorage.setItem("run.kickoff", `${current.id}:${messageId}`);
    const next = {
      ...current,
      messages: [...current.messages, { id: messageId, role: "user" as const, text: clean }],
      updatedAt: new Date().toISOString(),
    };
    const shots = photos;
    setPhotos([]);
    persist(next);
    setDraft("");
    setWorking(true);
    try {
      await runTurn(next, clean, shots);
    } catch {
      say(next, stopped("timeout"), next.build ?? emptyBuild());
    } finally {
      running.delete(current.id);
      setWorking(false);
    }
  }

  kickoff.current = (current) => {
    if (ownerId === null || current.ownerId !== ownerId) return;
    if (running.has(current.id)) return;
    const text = pendingPrompt(current);
    if (!text) return;
    const last = current.messages[current.messages.length - 1];
    const token = `${current.id}:${last?.role === "user" ? last.id : "prompt"}`;
    const key = "run.kickoff";
    if (sessionStorage.getItem(key) === token) {
      say(current, "Build ruk gaya. Neeche se dubara bhejo. Credit nahi kata.", current.build ?? emptyBuild());
      return;
    }
    sessionStorage.setItem(key, token);
    running.set(current.id, Date.now());
    const next =
      last?.role === "user"
        ? current
        : {
            ...current,
            messages: [...current.messages, { id: `u-${Date.now()}`, role: "user" as const, text }],
            updatedAt: new Date().toISOString(),
          };
    if (next !== current) persist(next);
    setWorking(true);
    void runTurn(next, text)
      .catch(() => {
        const latest = projectRef.current ?? next;
        say(latest, stopped("timeout"), latest.build ?? emptyBuild());
      })
      .finally(() => {
        running.delete(current.id);
        setWorking(false);
      });
  };

  function undo() {
    const current = projectRef.current;
    if (!current?.undo?.html) return;
    persist({
      ...current,
      html: current.undo.html,
      undo: null,
      messages: [...current.messages, { id: `a-${Date.now()}`, role: "assistant", text: "Pichhla page wapas aa gaya." }],
      updatedAt: new Date().toISOString(),
    });
  }

  async function copyLink() {
    const current = projectRef.current;
    if (!current?.html.trim()) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/t/${current.id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const quote = draft.trim() ? creditCeiling(draft, Boolean(project.html)) : 0;

  function rename(value: string) {
    const current = projectRef.current;
    if (!current) return;
    persist({ ...current, title: value, updatedAt: new Date().toISOString() });
  }

  const locked = working;
  const last = project.messages[project.messages.length - 1];
  const ideas =
    !working &&
    project.html.trim() &&
    last?.role === "assistant" &&
    /ban gaya|edit ho gaya/i.test(last.text)
      ? suggestionsFor(project.prompt, project.html)
      : [];
  const eyeClass = "grid size-10 shrink-0 place-items-center rounded-full text-muted";

  return (
    <AppFrame
      mode="editor"
      credits={credits}
      publishLabel={justUpdated ? "Updated" : live ? "Update" : "Publish"}
      onPublish={onPrimary}
    >
      {previewOn && project.html ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <button
            type="button"
            aria-label="Back to chat"
            aria-pressed="true"
            onClick={() => setPreviewOn(false)}
            className={`${eyeClass} absolute top-3 right-3 z-10 bg-card`}
          >
            <Eye className="size-5" strokeWidth={1.75} />
          </button>
          <iframe
            title="Preview"
            sandbox="allow-scripts allow-forms allow-popups"
            srcDoc={frameHtml || "<p></p>"}
            className="min-h-0 w-full flex-1 border-0 bg-bg"
          />
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-3 pt-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Project title</span>
              <input
                value={project.title}
                onChange={(event) => rename(event.target.value)}
                maxLength={80}
                className="h-10 w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>
            {project.undo?.html ? (
              <button type="button" aria-label="Undo" onClick={undo} className={eyeClass}>
                <Undo2 className="size-5" strokeWidth={1.75} />
              </button>
            ) : null}
            {project.html ? (
              <button type="button" aria-label={copied ? "Link copied" : "Copy link"} onClick={() => void copyLink()} className={eyeClass}>
                <Link2 className="size-5" strokeWidth={1.75} />
              </button>
            ) : null}
            {project.html ? (
              <button
                type="button"
                aria-label="Show preview"
                aria-pressed="false"
                onClick={() => setPreviewOn(true)}
                className={eyeClass}
              >
                <Eye className="size-5" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            <Thread messages={project.messages} working={working} />
            <div ref={endRef} />
          </div>
          {credits < 1 ? (
            <Link to="/pricing" className="mx-3 mt-2 grid h-10 place-items-center rounded-full bg-fg text-sm font-medium text-bg">
              Buy {CREDIT_PACK} credits · ₹{CREDIT_PACK_PRICE}
            </Link>
          ) : null}
          {quote > 0 || photos.length > 0 ? (
            <p className="px-4 pb-1 text-xs text-muted">
              {quote > 0 ? `Isme ${quote} credit lagega.` : ""}
              {photos.length > 0 ? ` ${photos.length} photo.` : ""}
            </p>
          ) : null}
          {ideas.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto px-3 pt-2">
              {ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  disabled={locked}
                  onClick={() => void sendText(idea)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs text-muted ring-1 ring-line disabled:opacity-40"
                >
                  {idea}
                </button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendText(draft);
            }}
            className="composer-pad flex items-center gap-2 border-t border-line px-3 pt-3"
          >
            <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted">
              <span className="sr-only">Add photo</span>
              <ImagePlus className="size-5" strokeWidth={1.75} />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={locked || photos.length >= 2}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void shrinkImage(file).then((url) => setPhotos((items) => [...items, url].slice(0, 2))).catch(() => undefined);
                }}
              />
            </label>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void sendText(draft);
              }}
              placeholder="Ask to edit…"
              aria-label="Ask to edit"
              autoComplete="off"
              disabled={locked}
              className={`${fieldClass} flex-1 disabled:opacity-40`}
            />
            <button
              type="button"
              aria-label="Send"
              disabled={locked || !draft.trim()}
              onClick={() => void sendText(draft)}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-fg text-bg disabled:opacity-30"
            >
              <ArrowUp className="size-5" strokeWidth={1.75} />
            </button>
          </form>
        </section>
      )}
      {publishOpen ? (
        <PublishSheet
          projectId={project.id}
          intent="create"
          initialTitle={project.title.slice(0, 80)}
          initialDescription={project.prompt.slice(0, 140)}
          preview={project.preview}
          html={project.html}
          ownerId={ownerId}
          onClose={() => setPublishOpen(false)}
        />
      ) : null}
    </AppFrame>
  );
}

function Thread({
  messages,
  working,
}: {
  messages: Project["messages"];
  working: boolean;
}) {
  if (messages.length === 0 && !working) return null;
  return (
    <>
      {messages.map((message) => (
        <p
          key={message.id}
          className={
            message.role === "user"
              ? "max-w-[90%] self-end rounded-card bg-input px-3.5 py-2.5 text-sm leading-relaxed"
              : "max-w-[90%] text-sm leading-relaxed text-muted"
          }
        >
          {message.text}
        </p>
      ))}
      {working ? <p className="text-sm text-muted">Ban raha hai…</p> : null}
    </>
  );
}

function PreviewOnly({ title, html }: { title: string; html: string }) {
  return (
    <iframe title={title} sandbox="allow-scripts allow-forms allow-popups" srcDoc={html || previewHtml(title)} className="h-dvh w-full border-0 bg-bg" />
  );
}
