"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Clock3, ImagePlus, IndianRupee, Pencil, Power, X } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { togglePooja } from "@/app/actions/content";
import type { Pooja } from "@/lib/types";
import { PoojaForm } from "./pooja-form";
import styles from "./pooja-catalog-row.module.css";

export function PoojaCatalogRow({ pooja }: { pooja: Pooja }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    editorRef.current?.scrollIntoView({ block: "nearest", behavior });
  }, [open]);

  function openEditor() {
    setMounted(true);
    setOpen(true);
  }

  return <article className={styles.item}>
    <div className={`catalog-image ${styles.thumb}`}>
      {pooja.image_url ? <Image src={pooja.image_url} alt="" width={72} height={72} unoptimized /> : <span>{pooja.name.slice(0, 2).toUpperCase()}</span>}
      <button type="button" className={styles.changePhoto} onClick={openEditor}><ImagePlus size={14} />Change</button>
    </div>
    <div className="catalog-copy">
      <div><h2>{pooja.name}</h2><StatusPill status={pooja.is_active ? "active" : "inactive"} /></div>
      <p>{pooja.description || "No description has been added."}</p>
      <span className="meta"><Clock3 size={15} />{pooja.duration_minutes} min <IndianRupee size={15} />{pooja.base_price_inr.toLocaleString("en-IN")}</span>
    </div>
    <button type="button" className={`secondary-button ${styles.edit}`} aria-expanded={open} onClick={() => { setMounted(true); setOpen((value) => !value); }}>
      {open ? <><X size={15} />Close</> : <><Pencil size={15} />Edit</>}
    </button>
    <form action={togglePooja} className={styles.toggle}>
      <input type="hidden" name="id" value={pooja.id} />
      <input type="hidden" name="next" value={String(!pooja.is_active)} />
      <button className="icon-button" title={pooja.is_active ? "Deactivate" : "Activate"}><Power size={17} /></button>
    </form>
    {mounted && <div ref={editorRef} className={styles.editor} hidden={!open}>
      <PoojaForm pooja={pooja} onCancel={() => setOpen(false)} />
    </div>}
  </article>;
}
