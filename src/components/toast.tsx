"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export function Toast({ message }: { message?: string }) {
  const [text, setText] = useState(message || "");

  useEffect(() => {
    if (!message) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", next);
    const timer = window.setTimeout(() => setText(""), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!text) return null;

  return <div className="toast" role="status">
    <Check size={16} />
    <span>{text}</span>
    <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setText("")}><X size={14} /></button>
  </div>;
}
