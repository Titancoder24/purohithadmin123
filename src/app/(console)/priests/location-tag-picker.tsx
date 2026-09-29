"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { BANGALORE_AREAS } from "@/data/bangalore-areas";
import styles from "./location-tag-picker.module.css";

type Props = {
  initialAreas?: string[];
  initialPrimary?: string;
};

export function LocationTagPicker({ initialAreas = [], initialPrimary = "" }: Props) {
  const known = new Set<string>(BANGALORE_AREAS.map((area) => area.name));
  const safeInitial = initialAreas.filter((area) => known.has(area));
  const [selected, setSelected] = useState<string[]>(safeInitial);
  const [primary, setPrimary] = useState(initialPrimary && safeInitial.includes(initialPrimary) ? initialPrimary : safeInitial[0] || "");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? BANGALORE_AREAS.filter((area) => `${area.name} ${area.zone}`.toLowerCase().includes(query)) : BANGALORE_AREAS;
  }, [search]);

  function toggle(name: string) {
    setSelected((current) => {
      if (current.includes(name)) {
        const next = current.filter((area) => area !== name);
        if (primary === name) setPrimary(next[0] || "");
        return next;
      }
      const next = [...current, name];
      if (!primary) setPrimary(name);
      return next;
    });
  }

  return <div className={`span-2 ${styles.picker}`}>
    <div className={styles.heading}><div><strong>Serving locations</strong><small>Select any of the 100 locations already available in the application.</small></div><span>{selected.length} selected</span></div>
    <label className={styles.search}><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Jayanagar, JP Nagar, zone…" aria-label="Search service locations"/></label>
    {!!selected.length && <div className={styles.selected}>{selected.map((name) => <button type="button" key={name} onClick={() => toggle(name)}>{name}<X size={12}/></button>)}</div>}
    <div className={styles.options} role="group" aria-label="Service locations">
      {filtered.map((area) => <label key={area.slug} className={selected.includes(area.name) ? styles.active : ""}>
        <input type="checkbox" name="service_areas" value={area.name} checked={selected.includes(area.name)} onChange={() => toggle(area.name)}/>
        <span><MapPin size={13}/>{area.name}<small>{area.zone}</small></span>
      </label>)}
    </div>
    <label className={styles.primary}>Primary service location
      <select name="primary_service_area" value={primary} onChange={(event) => setPrimary(event.target.value)} required>
        <option value="" disabled>Select a serving location</option>
        {selected.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
  </div>;
}
