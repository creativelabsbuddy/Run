import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { fieldClass } from "@/components/ui";
import { CATEGORIES, type Category, type ListingKind, type ListingPrice } from "@/lib/catalog";
import { publishHosted, updateLiveListing } from "@/lib/live-links";
import { saveGate } from "@/lib/ledger-api";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export function PublishSheet({
  projectId,
  intent,
  initialTitle = "",
  initialDescription = "",
  initialCategory,
  initialImage = "",
  preview,
  html,
  ownerId: signedInId,
  onClose,
}: {
  projectId: string;
  intent: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string;
  initialCategory?: Category;
  initialImage?: string;
  preview: { heading: string; button: string } | null;
  html: string;
  ownerId?: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const titleId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState<Category>(initialCategory ?? CATEGORIES[0]);
  const [kind, setKind] = useState<ListingKind>("tool");
  const [price, setPrice] = useState<ListingPrice>("free");
  const [amount, setAmount] = useState("");
  const [image, setImage] = useState(initialImage);
  const [imageName, setImageName] = useState(initialImage ? "Cover" : "");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function publish(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    const ownerId = signedInId || user?.id || null;
    if (!nextTitle) {
      setError("Title is required.");
      return;
    }
    if (!ownerId) {
      setError("Sign in to publish.");
      return;
    }
    const rupees = Math.round(Number(amount));
    if (price === "paid" && !(rupees >= 1)) {
      setError("Enter a price in rupees.");
      return;
    }
    const listedAmount = price === "paid" ? rupees : 0;
    void saveGate({
      data: { id: projectId, price, amount: listedAmount, source: "hosted", url: "" },
    }).catch(() => undefined);
    if (intent === "edit") {
      updateLiveListing({
        projectId,
        title: nextTitle.slice(0, 80),
        description: description.trim().slice(0, 140),
        image,
        category,
        preview,
        html,
        kind,
        price,
        amount: listedAmount,
      });
      onClose();
      return;
    }
    publishHosted({
      projectId,
      title: nextTitle.slice(0, 80),
      description: description.trim().slice(0, 140),
      image,
      category,
      ownerId,
      preview,
      html,
      kind,
      price,
      amount: listedAmount,
    });
    onClose();
    void navigate({ to: "/" });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={publish}
        className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card px-4 pt-4 pb-safe"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {intent === "edit" ? "Edit listing" : "Publish"}
          </h2>
          <button type="button" aria-label="Close sheet" onClick={onClose} className="grid size-11 place-items-center text-muted">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-muted">Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className={fieldClass} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm text-muted">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={140}
            rows={3}
            className="w-full rounded-control bg-input px-4 py-3 text-base text-fg outline-none ring-1 ring-inset ring-line"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm text-muted">Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className={fieldClass}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm text-muted">Type</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as ListingKind)} className={fieldClass}>
            <option value="tool">Tools</option>
            <option value="website">Websites</option>
            <option value="agent">Agents</option>
          </select>
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm text-muted">Price</span>
          <select value={price} onChange={(event) => setPrice(event.target.value as ListingPrice)} className={fieldClass}>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        {price === "paid" ? (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-sm text-muted">Price in ₹. Buyers pay Run.</span>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" min={1} placeholder="99" className={fieldClass} />
          </label>
        ) : null}
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm text-muted">Cover</span>
          <span className="flex h-12 cursor-pointer items-center rounded-control bg-input px-4 text-sm text-muted ring-1 ring-inset ring-line">
            {imageName || "Choose from gallery"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImageName(file.name);
                void shrinkImage(file).then(setImage).catch(() => setError("Could not read that image."));
              }}
            />
          </span>
          {image ? <img src={image} alt="" className="mt-2 h-28 w-full rounded-lg object-cover" /> : null}
        </label>
        {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
        <button type="submit" className="mt-4 mb-2 h-12 w-full rounded-full bg-fg text-sm font-medium text-bg">
          {intent === "edit" ? "Save" : "Publish"}
        </button>
      </form>
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
