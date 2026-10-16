const KEY = "run.workspaces";
const CURRENT = "run.workspaceId";
export const WORKSPACE_EVENT = "run-workspaces";

export type Workspace = { id: string; name: string; invites: string[] };

function seed(): Workspace[] {
  return [{ id: "personal", name: "Personal", invites: [] }];
}

function read(): Workspace[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Workspace[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed();
    return parsed.map((item) => ({
      id: item.id,
      name: item.name || "Workspace",
      invites: Array.isArray(item.invites) ? item.invites : [],
    }));
  } catch {
    return seed();
  }
}

function write(items: Workspace[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(WORKSPACE_EVENT));
}

export function loadWorkspaces(): Workspace[] {
  const items = read();
  if (!localStorage.getItem(KEY)) write(items);
  return items;
}

export function currentWorkspaceId(): string {
  const items = loadWorkspaces();
  const saved = localStorage.getItem(CURRENT);
  if (saved && items.some((item) => item.id === saved)) return saved;
  return items[0]!.id;
}

export function selectWorkspace(id: string) {
  localStorage.setItem(CURRENT, id);
  window.dispatchEvent(new Event(WORKSPACE_EVENT));
}

export function createWorkspace(name: string): Workspace {
  const items = loadWorkspaces();
  const next = { id: `ws-${Date.now()}`, name: name.trim().slice(0, 40) || "Workspace", invites: [] };
  items.push(next);
  write(items);
  selectWorkspace(next.id);
  return next;
}

export function inviteToWorkspace(id: string, who: string) {
  const value = who.trim().slice(0, 80);
  if (!value) return;
  const items = loadWorkspaces();
  const workspace = items.find((item) => item.id === id);
  if (!workspace || workspace.invites.includes(value)) return;
  workspace.invites.push(value);
  write(items);
}
