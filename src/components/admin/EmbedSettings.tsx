"use client";

import { useMemo, useState } from "react";

interface Props {
  embedBaseUrl: string;
}

export default function EmbedSettings({ embedBaseUrl }: Props) {
  const [limit, setLimit] = useState(9);
  const [template, setTemplate] = useState<"aurora" | "magazine" | "spotlight">("aurora");
  const [accent, setAccent] = useState("#ea580c");
  const [text, setText] = useState("#1c1917");
  const [card, setCard] = useState("#ffffff");
  const [bg, setBg] = useState("transparent");

  const embedUrl = useMemo(() => {
    const u = new URL(embedBaseUrl);
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("template", template);
    u.searchParams.set("accent", accent);
    u.searchParams.set("text", text);
    u.searchParams.set("card", card);
    u.searchParams.set("bg", bg);
    return u.toString();
  }, [embedBaseUrl, limit, template, accent, text, card, bg]);

  const iframeCode = `<iframe src="${embedUrl}" title="Testimonials" style="width:100%;min-height:680px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <label className="text-xs text-stone-500 space-y-1.5">
          <span className="block uppercase tracking-[0.12em] font-mono">Video count</span>
          <input
            type="number"
            min={1}
            max={24}
            value={limit}
            onChange={(e) => setLimit(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
            className="w-full border border-stone-300 px-2.5 py-2 text-sm bg-white"
          />
        </label>

        <label className="text-xs text-stone-500 space-y-1.5">
          <span className="block uppercase tracking-[0.12em] font-mono">Template</span>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as "aurora" | "magazine" | "spotlight")}
            className="w-full border border-stone-300 px-2.5 py-2 text-sm bg-white"
          >
            <option value="aurora">Aurora cards</option>
            <option value="magazine">Magazine feature</option>
            <option value="spotlight">Spotlight tiles</option>
          </select>
        </label>

        <label className="text-xs text-stone-500 space-y-1.5">
          <span className="block uppercase tracking-[0.12em] font-mono">Accent</span>
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-full h-10 border border-stone-300 bg-white" />
        </label>

        <label className="text-xs text-stone-500 space-y-1.5">
          <span className="block uppercase tracking-[0.12em] font-mono">Text</span>
          <input type="color" value={text} onChange={(e) => setText(e.target.value)} className="w-full h-10 border border-stone-300 bg-white" />
        </label>

        <label className="text-xs text-stone-500 space-y-1.5">
          <span className="block uppercase tracking-[0.12em] font-mono">Card</span>
          <input type="color" value={card} onChange={(e) => setCard(e.target.value)} className="w-full h-10 border border-stone-300 bg-white" />
        </label>

        <label className="text-xs text-stone-500 space-y-1.5">
          <span className="block uppercase tracking-[0.12em] font-mono">Background</span>
          <select
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="w-full border border-stone-300 px-2.5 py-2 text-sm bg-white"
          >
            <option value="transparent">Transparent</option>
            <option value="#f5f5f4">Stone</option>
            <option value="#ffffff">White</option>
            <option value="#111827">Dark</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.12em] font-mono text-stone-500">Embed URL</p>
        <textarea readOnly value={embedUrl} className="w-full border border-stone-300 bg-white p-3 text-xs text-stone-700 min-h-20" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.12em] font-mono text-stone-500">Iframe code</p>
        <textarea readOnly value={iframeCode} className="w-full border border-stone-300 bg-white p-3 text-xs text-stone-700 min-h-24" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.12em] font-mono text-stone-500">Preview</p>
        <div className="border border-stone-300 bg-white overflow-hidden">
          <iframe src={embedUrl} title="Embed preview" className="w-full h-170" loading="lazy" />
        </div>
      </div>
    </div>
  );
}
