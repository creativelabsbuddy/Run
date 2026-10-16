import { createFileRoute } from "@tanstack/react-router";
import { handleAppStore } from "@/lib/app-store.server";

function cors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "content-type, authorization");
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  return new Response(response.body, { status: response.status, headers });
}

export const Route = createFileRoute("/api/apps/$id")({
  server: {
    handlers: {
      OPTIONS: () => cors(new Response(null, { status: 204 })),
      POST: async ({ request, params }) => {
        const body = (await request.json().catch(() => null)) as { action?: string; email?: string; password?: string; order?: { title?: string; detail?: string } } | null;
        const result = await handleAppStore(params.id, body ?? {}, request.headers.get("authorization"));
        return cors(Response.json(result.body, { status: result.status }));
      },
    },
  },
});
