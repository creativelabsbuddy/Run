import { useState } from "react";
import { JSON_SAMPLE } from "@/lib/seeds";

const areaClass =
  "min-h-72 w-full resize-y rounded-card bg-input p-4 font-mono text-base leading-relaxed text-fg outline-none ring-1 ring-inset ring-line focus-visible:ring-line-strong";

export function JsonTool() {
  const [text, setText] = useState(JSON_SAMPLE);
  const [error, setError] = useState("");

  function rewrite(space: number | undefined) {
    const raw = text.trim();
    if (!raw) {
      setError("Nothing to format.");
      return;
    }
    try {
      const value: unknown = JSON.parse(raw);
      setText(JSON.stringify(value, null, space));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        aria-label="JSON"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={areaClass}
      />
      {error ? <p className="text-sm text-muted">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => rewrite(2)}
          className="h-12 rounded-full bg-fg text-sm font-medium text-bg"
        >
          Format
        </button>
        <button
          type="button"
          onClick={() => rewrite(undefined)}
          className="h-12 rounded-full text-sm ring-1 ring-line"
        >
          Minify
        </button>
      </div>
    </div>
  );
}
