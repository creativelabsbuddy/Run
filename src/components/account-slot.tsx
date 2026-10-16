import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Folder, Menu, Plus } from "lucide-react";
import { fieldClass } from "@/components/ui";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimBrowserProjects, mirrorLedger, readCreditCap, readCredits } from "@/lib/projects";
import { readBalance, readEarnings, WALLET_EVENT, writeSlot } from "@/lib/wallet";
import { getLedger } from "@/lib/ledger-api";
import {
  WORKSPACE_EVENT,
  createWorkspace,
  currentWorkspaceId,
  inviteToWorkspace,
  loadWorkspaces,
  selectWorkspace,
  type Workspace,
} from "@/lib/workspaces";

const STORAGE_KEY = "run.displayName";
const SIGN_IN_EVENT = "run-request-sign-in";

export function isSignedIn(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

const SIGNED_IN_EVENT = "run-signed-in";
export { SIGNED_IN_EVENT };

export function readOwnerId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function signInAs(name: string): void {
  const next = (name.trim() || "You").slice(0, 40);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SIGNED_IN_EVENT, { detail: next }));
}

export function AccountSlot() {
  const { user, isPending } = useCurrentUserState();
  const name = user?.displayName || user?.primaryEmail || null;
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("personal");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteDraft, setInviteDraft] = useState("");
  const [workspaceDraft, setWorkspaceDraft] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(15);
  const [creditCap, setCreditCap] = useState(15);
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [payoutNote, setPayoutNote] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void claimBrowserProjects().catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    function sync() {
      setWorkspaces(loadWorkspaces());
      setWorkspaceId(currentWorkspaceId());
    }
    sync();
    window.addEventListener(WORKSPACE_EVENT, sync);
    return () => window.removeEventListener(WORKSPACE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!open || !user?.id) return;
    function sync() {
      if (!user?.id) return;
      setCreditsLeft(readCredits());
      setCreditCap(readCreditCap());
      setBalance(readBalance(user.id));
      setEarnings(readEarnings(user.id));
    }
    sync();
    void getLedger()
      .then((row) => {
        if (!user?.id) return;
        mirrorLedger(row.credits, row.paid);
        writeSlot(user.id, { balance: row.balance, earnings: row.earnings, owned: row.owned });
        setCreditsLeft(row.credits);
        setCreditCap(Math.max(row.credits, readCreditCap()));
        setBalance(row.balance);
        setEarnings(row.earnings);
      })
      .catch(() => undefined);
    window.addEventListener(WALLET_EVENT, sync);
    return () => window.removeEventListener(WALLET_EVENT, sync);
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function signOutAccount() {
    setOpen(false);
    void signOut().catch(() => undefined);
  }

  const selected = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0];

  function addInvite(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    inviteToWorkspace(selected.id, inviteDraft);
    setInviteDraft("");
    setInviteOpen(false);
  }

  function addWorkspace(event: FormEvent) {
    event.preventDefault();
    createWorkspace(workspaceDraft);
    setWorkspaceDraft("");
    setCreating(false);
  }

  return (
    <div ref={rootRef} className="relative">
      {isPending ? (
        <span className="grid h-11 min-w-11 place-items-center">
          <span className="size-9 animate-pulse rounded-full bg-card" />
        </span>
      ) : name ? (
        <button
          type="button"
          className="grid h-11 min-w-11 place-items-center rounded-full text-fg"
          aria-label="Menu"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
      ) : (
        <Link to="/login" className="grid h-11 place-items-center px-2 text-sm font-medium">
          Sign in
        </Link>
      )}
      {open ? (
        <div
          role="dialog"
          aria-label={name ? "Profile" : "Sign in"}
          className="absolute right-0 top-12 z-40 w-72 rounded-card border border-line bg-card p-4 shadow-pop"
        >
          {name ? (
            <div>
              <div className="px-1 pb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-base font-semibold">Credits</p>
                  <p className="text-sm text-muted">{creditsLeft} left</p>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-45deg, #2c2c38 0 5px, #1c1c26 5px 10px)",
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, (creditsLeft / creditCap) * 100))}%`,
                      background: "linear-gradient(90deg, #8B6CFF, #5B8CFF)",
                    }}
                  />
                </div>
              </div>
              <div className="mt-3 border-t border-line px-1 pt-3">
                <p className="text-sm">Wallet ₹{balance}</p>
                <p className="mt-1 text-sm text-muted">Earnings ₹{earnings}</p>
                <button
                  type="button"
                  onClick={() => setPayoutNote("Payouts are not live yet.")}
                  className="mt-2 h-9 rounded-full px-3 text-sm ring-1 ring-line"
                >
                  Withdraw
                </button>
                {payoutNote ? <p className="mt-2 text-xs text-muted">{payoutNote}</p> : null}
              </div>
              <button
                type="button"
                aria-expanded={workspaceOpen}
                onClick={() => setWorkspaceOpen((value) => !value)}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm font-medium"
              >
                <span className="truncate">{selected?.name ?? "Personal"}</span>
                <ChevronDown className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
              </button>
              {workspaceOpen ? (
                <div className="mt-1 flex flex-col border-t border-line pt-1">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => selectWorkspace(workspace.id)}
                      className={`h-10 truncate rounded-lg px-2 text-left text-sm ${workspace.id === selected?.id ? "text-fg" : "text-muted"}`}
                    >
                      {workspace.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setInviteOpen((value) => !value);
                      setCreating(false);
                    }}
                    className="h-10 rounded-lg px-2 text-left text-sm text-muted"
                  >
                    Invite
                  </button>
                  {inviteOpen ? (
                    <form onSubmit={addInvite} className="flex gap-2 px-2 pb-2">
                      <input
                        value={inviteDraft}
                        onChange={(event) => setInviteDraft(event.target.value)}
                        placeholder="Email"
                        className={`${fieldClass} h-10`}
                      />
                      <button type="submit" className="h-10 shrink-0 rounded-full bg-fg px-3 text-xs font-medium text-bg">
                        Add
                      </button>
                    </form>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setCreating((value) => !value);
                      setInviteOpen(false);
                    }}
                    className="h-10 rounded-lg px-2 text-left text-sm text-muted"
                  >
                    New workspace
                  </button>
                  {creating ? (
                    <form onSubmit={addWorkspace} className="flex gap-2 px-2 pb-2">
                      <input
                        value={workspaceDraft}
                        onChange={(event) => setWorkspaceDraft(event.target.value)}
                        placeholder="Name"
                        className={`${fieldClass} h-10`}
                      />
                      <button type="submit" className="h-10 shrink-0 rounded-full bg-fg px-3 text-xs font-medium text-bg">
                        Create
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-2 flex flex-col border-t border-line pt-2">
                <Link to="/build" onClick={() => setOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm">
                  <Plus className="size-4" strokeWidth={1.75} />
                  New project
                </Link>
                <Link to="/projects" onClick={() => setOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm">
                  <Folder className="size-4" strokeWidth={1.75} />
                  My projects
                </Link>
              </div>
              <button type="button" onClick={signOutAccount} className="mt-1 h-10 px-2 text-sm text-muted">
                Sign out
              </button>
              <Link
                to="/pricing"
                onClick={() => setOpen(false)}
                className="mt-1 flex h-10 items-center rounded-lg px-2 text-sm font-medium"
              >
                Upgrade to Pro
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
