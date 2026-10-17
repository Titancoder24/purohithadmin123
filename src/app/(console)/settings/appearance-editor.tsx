"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { saveAdminAppearance } from "@/app/actions/settings";
import { APPEARANCE_PRESETS, BUTTON_SHAPES, BUTTON_STYLES, COLOR_SWATCHES, buttonTokens, type CustomerAppearance } from "@/lib/appearance";

export function AppearanceEditor({ initial }: { initial: CustomerAppearance }) {
  const [appearance, setAppearance] = useState(initial);
  const tokens = useMemo(() => buttonTokens(appearance), [appearance]);

  function choosePreset(id: string) {
    const preset = APPEARANCE_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setAppearance((current) => ({ ...current, preset: preset.id, primary: preset.primary, accent: preset.accent }));
  }

  return (
    <form action={saveAdminAppearance} className="appearance-layout">
      <input type="hidden" name="appearance" value={JSON.stringify(appearance)} />
      <div className="appearance-controls">
        <div>
          <p className="appearance-label">Palette</p>
          <div className="appearance-presets">
            {APPEARANCE_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className={appearance.preset === preset.id ? "active" : ""} onClick={() => choosePreset(preset.id)}>
                <i style={{ background: preset.primary }} />
                <i style={{ background: preset.accent }} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="appearance-label">Primary color</p>
          <div className="appearance-dots">
            {COLOR_SWATCHES.map((swatch) => (
              <button key={`primary-${swatch.id}`} type="button" title={swatch.label} aria-label={`${swatch.label} primary`} className={appearance.primary === swatch.hex ? "active" : ""} style={{ background: swatch.hex }} onClick={() => setAppearance((current) => ({ ...current, preset: "custom", primary: swatch.hex }))} />
            ))}
          </div>
        </div>
        <div>
          <p className="appearance-label">Accent color</p>
          <div className="appearance-dots">
            {COLOR_SWATCHES.map((swatch) => (
              <button key={`accent-${swatch.id}`} type="button" title={swatch.label} aria-label={`${swatch.label} accent`} className={appearance.accent === swatch.hex ? "active" : ""} style={{ background: swatch.hex }} onClick={() => setAppearance((current) => ({ ...current, preset: "custom", accent: swatch.hex }))} />
            ))}
          </div>
        </div>
        <div className="appearance-colors">
          <label>
            Primary
            <input type="color" value={appearance.primary.toLowerCase()} onChange={(event) => setAppearance((current) => ({ ...current, preset: "custom", primary: event.target.value.toUpperCase() }))} />
          </label>
          <label>
            Accent
            <input type="color" value={appearance.accent.toLowerCase()} onChange={(event) => setAppearance((current) => ({ ...current, preset: "custom", accent: event.target.value.toUpperCase() }))} />
          </label>
        </div>
        <div>
          <p className="appearance-label">Button shape</p>
          <div className="appearance-presets">
            {BUTTON_SHAPES.map((shape) => (
              <button key={shape.id} type="button" className={appearance.buttonShape === shape.id ? "active" : ""} onClick={() => setAppearance((current) => ({ ...current, buttonShape: shape.id }))}>
                {shape.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="appearance-label">Button style</p>
          <div className="appearance-presets">
            {BUTTON_STYLES.map((style) => (
              <button key={style.id} type="button" className={appearance.buttonStyle === style.id ? "active" : ""} onClick={() => setAppearance((current) => ({ ...current, buttonStyle: style.id }))}>
                {style.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <button className="primary-button" type="submit"><Save size={15} /> Apply to this console</button>
        </div>
      </div>
      <aside className="appearance-phone" aria-label="Console theme preview">
        <p className="appearance-label">Console preview</p>
        <div className="appearance-card">
          <div className="appearance-photo" style={{ background: tokens.softBg }} />
          <div>
            <p style={{ color: tokens.accent }}>CONFIGURATION</p>
            <strong style={{ color: tokens.primary }}>Your console</strong>
            <span>Buttons, links, and highlights</span>
          </div>
        </div>
        <div className="appearance-actions">
          <span style={{ borderRadius: tokens.radius }}>Secondary</span>
          <b style={{ borderRadius: tokens.radius, background: tokens.primaryBg, color: tokens.primaryFg, borderColor: tokens.primaryBorder }}>Primary</b>
        </div>
      </aside>
    </form>
  );
}
