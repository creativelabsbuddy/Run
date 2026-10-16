import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { fieldClass } from "@/components/ui";
import { listProduct } from "@/lib/live-links";
import { saveGate } from "@/lib/ledger-api";
import { CATEGORIES, type Category, type ListingKind, type ListingPrice } from "@/lib/catalog";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Link } from "@tanstack/react-router";

const CATEGORY_OPTIONS = CATEGORIES;

export function AddLinkSheet({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [kind, setKind] = useState<ListingKind>("tool");
  const [price, setPrice] = useState<ListingPrice>("free");
  const [amount, setAmount] = useState("");
  const user = useCurrentUser();
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickImage(file: File) {
    setImageName(file.name);
    void shrinkImage(file).then(setImage).catch(() => setError("Could not read that image."));
  }

  function list(event: FormEvent) {
    event.preventDefault();
    const nextUrl = url.trim();
    const nextTitle = title.trim();
    if (!nextUrl || !nextTitle) {
      setError("URL and title are required.");
      return;
    }
    try {
      const parsed = new URL(nextUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad");
    } catch {
      setError("Enter a valid http or https URL.");
      return;
    }
    if (!user) return;
    const rupees = Math.round(Number(amount));
    if (price === "paid" && !(rupees >= 1)) {
      setError("Enter a price in rupees.");
      return;
    }
    const listed = listProduct({
      url: nextUrl,
      title: nextTitle.slice(0, 80),
      description: description.trim().slice(0, 140),
      image: image.trim(),
      category,
      kind,
      price,
      amount: price === "paid" ? rupees : 0,
      ownerId: user.id,
    });
    void saveGate({
      data: {
        id: listed.id,
        price,
        amount: price === "paid" ? rupees : 0,
        source: "external",
        url: nextUrl,
      },
    }).catch(() => undefined);
    onClose();
  }

  const form = user ? (
    <form
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onSubmit={list}
      className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-card px-4 pt-4 pb-safe"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          Add a live link
        </h2>
        <button type="button" aria-label="Close sheet" onClick={onClose} className="grid size-11 place-items-center text-muted">
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <Field label="URL">
          <input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" autoComplete="url" placeholder="https://" className={fieldClass} />
        </Field>
        <Field label="Title">
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className={fieldClass} />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={140}
            rows={3}
            className="w-full min-w-0 rounded-control bg-input px-4 py-3 text-base text-fg outline-none ring-1 ring-inset ring-line placeholder:text-muted focus-visible:ring-line-strong"
          />
        </Field>
        <Field label="Image">
          <label className="flex h-12 cursor-pointer items-center rounded-control bg-input px-4 text-sm text-muted ring-1 ring-inset ring-line">
            {imageName || "Choose from gallery"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void pickImage(file);
              }}
            />
          </label>
          {image ? <img src={image} alt="" className="mt-2 h-28 w-full rounded-lg object-cover" /> : null}
        </Field>
        <Field label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className={fieldClass}>
            {CATEGORY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select value={kind} onChange={(event) => setKind(event.target.value as ListingKind)} className={fieldClass}>
            <option value="tool">Tools</option>
            <option value="website">Websites</option>
            <option value="agent">Agents</option>
          </select>
        </Field>
        <Field label="Price">
          <select value={price} onChange={(event) => setPrice(event.target.value as ListingPrice)} className={fieldClass}>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
        {price === "paid" ? (
          <Field label="Price in ₹. Buyers pay Run.">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder="99" className={fieldClass} />
          </Field>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      <button type="submit" className="mt-4 mb-2 h-12 w-full rounded-full bg-fg text-sm font-medium text-bg">
        List
      </button>
    </form>
  ) : (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="relative z-10 w-full max-w-md rounded-t-3xl bg-card px-4 pt-4 pb-safe"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          Sign in
        </h2>
        <button type="button" aria-label="Close sheet" onClick={onClose} className="grid size-11 place-items-center text-muted">
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">Sign in to add a live link.</p>
      <Link to="/login" className="mt-4 mb-2 grid h-12 place-items-center rounded-full bg-fg text-sm font-medium text-bg">
        Sign in
      </Link>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      {form}
    </div>,
    document.body,
  );
}

function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("image"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}
