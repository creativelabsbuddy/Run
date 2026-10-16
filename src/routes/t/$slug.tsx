import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { hostedBySlug } from "@/lib/catalog";
import { NotFound } from "@/components/not-found";
import { ToolFrame } from "@/components/chrome";
import { ToolBody } from "@/components/tool-body";
import { loadProject, withAppMemory } from "@/lib/projects";
import { getSharedProject } from "@/lib/projects-api";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { BuySheet } from "@/components/buy-sheet";

export const Route = createFileRoute("/t/$slug")({
  loader: ({ params }) => hostedBySlug(params.slug) ?? { slug: params.slug, name: "" },
  component: ToolPage,
});

function memoryKey(id: string) {
  return `run.memory.${id}`;
}

function readMemory(id: string): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(memoryKey(id)) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function ToolPage() {
  const loaded = Route.useLoaderData();
  const isSeed = Boolean(loaded.name);
  const user = useCurrentUser();
  const [html, setHtml] = useState("");
  const [missing, setMissing] = useState(false);
  const [pay, setPay] = useState<{ title: string; amount: number; ownerId: string } | null>(null);
  const [bought, setBought] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    if (isSeed) return;
    const project = loadProject(loaded.slug);
    void getSharedProject({ data: loaded.slug }).then((row) => {
      if (row && "locked" in row && row.locked) {
        setPay({ title: row.title, amount: row.amount, ownerId: row.ownerId });
        setHtml("");
        setMissing(false);
        return;
      }
      setPay(null);
      if (row && "html" in row && row.html) {
        setHtml(row.html);
        return;
      }
      if (project?.html && user?.id && project.ownerId === user.id) {
        setHtml(project.html);
        return;
      }
      setMissing(true);
    });
  }, [isSeed, loaded.slug, user?.id, bought]);

  useEffect(() => {
    if (isSeed) return;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; key?: string; value?: string | null };
      if (data?.type !== "run-store" || !data.key) return;
      const bag = readMemory(loaded.slug);
      if (data.value == null) delete bag[data.key];
      else bag[data.key] = String(data.value).slice(0, 20000);
      localStorage.setItem(memoryKey(loaded.slug), JSON.stringify(bag));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isSeed, loaded.slug]);

  if (isSeed) {
    return (
      <ToolFrame name={loaded.name} wide={loaded.slug === "invoice"}>
        <ToolBody slug={loaded.slug} />
      </ToolFrame>
    );
  }

  if (pay && !bought) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold">{pay.title}</h1>
          <p className="mt-2 text-sm text-muted">₹{pay.amount}</p>
          <button type="button" onClick={() => setBuyOpen(true)} className="mt-4 h-11 w-full rounded-full bg-fg text-sm font-medium text-bg">
            Buy ₹{pay.amount}
          </button>
        </div>
        {buyOpen ? (
          <BuySheet
            buyerId={user?.id ?? null}
            listingId={loaded.slug}
            sellerId={pay.ownerId}
            title={pay.title}
            amount={pay.amount}
            onClose={() => setBuyOpen(false)}
            onBought={() => {
              setBuyOpen(false);
              setBought(true);
            }}
          />
        ) : null}
      </main>
    );
  }

  if (missing) return <NotFound />;

  return (
    <iframe
      title="Preview"
      sandbox="allow-scripts allow-forms allow-popups"
      srcDoc={html ? withAppMemory(html, readMemory(loaded.slug)) : "<p></p>"}
      className="h-dvh w-full border-0 bg-bg"
    />
  );
}