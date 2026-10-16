import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/chrome";
import { accountProjects, claimBrowserProjects, removeProject, shortTitle, type Project } from "@/lib/projects";
import { postedAgo } from "@/lib/catalog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { WORKSPACE_EVENT, currentWorkspaceId, loadWorkspaces } from "@/lib/workspaces";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<Project[]>([]);
  const [workspaceId, setWorkspaceId] = useState("personal");

  useEffect(() => {
    function sync() {
      setWorkspaceId(currentWorkspaceId());
    }
    sync();
    window.addEventListener(WORKSPACE_EVENT, sync);
    return () => window.removeEventListener(WORKSPACE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!user) return;
    let gone = false;
    void claimBrowserProjects()
      .catch(() => undefined)
      .then(() => accountProjects())
      .then((rows) => {
        if (!gone) setItems(rows);
      })
      .catch(() => {
        if (!gone) setItems([]);
      });
    return () => {
      gone = true;
    };
  }, [user?.id, workspaceId]);

  const workspaceName = loadWorkspaces().find((item) => item.id === workspaceId)?.name ?? "Personal";
  const visible = items.filter((project) => (project.workspaceId || "personal") === workspaceId);

  async function drop(id: string) {
    if (!window.confirm("Delete this project?")) return;
    await removeProject(id);
    setItems((rows) => rows.filter((project) => project.id !== id));
  }

  return (
    <AppFrame mode="projects">
      <main className="mx-auto w-full max-w-lg px-4 pt-6 pb-safe">
        <h1 className="text-2xl font-semibold tracking-tight">My projects</h1>
        <p className="mt-1 text-sm text-muted">{workspaceName}</p>
        {!isPending && !user ? (
          <p className="mt-6 text-sm text-muted">
            <Link to="/login" className="text-fg">
              Sign in
            </Link>{" "}
            to see your projects.
          </p>
        ) : visible.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {visible.map((project) => (
              <li key={project.id} className="flex items-center rounded-card bg-card">
                <Link to="/p/$id" params={{ id: project.id }} className="block min-w-0 flex-1 px-4 py-3.5">
                  <p className="truncate text-base font-medium">{shortTitle(project.title || project.prompt)}</p>
                  <p className="mt-1 text-xs text-muted">{postedAgo(project.updatedAt)}</p>
                </Link>
                <button type="button" onClick={() => void drop(project.id)} className="px-3 text-xs text-muted">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppFrame>
  );
}