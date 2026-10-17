import type { CSSProperties } from "react";

export const COLOR_SWATCHES = [
  { id: "maroon", label: "Maroon", hex: "#8F1028" },
  { id: "crimson", label: "Crimson", hex: "#B42318" },
  { id: "wine", label: "Wine", hex: "#7F1D1D" },
  { id: "lotus", label: "Lotus", hex: "#9D174D" },
  { id: "saffron", label: "Saffron", hex: "#E65319" },
  { id: "orange", label: "Orange", hex: "#F06412" },
  { id: "copper", label: "Copper", hex: "#A15C38" },
  { id: "gold", label: "Gold", hex: "#B8860B" },
  { id: "temple", label: "Temple", hex: "#6B3A2A" },
  { id: "forest", label: "Forest", hex: "#1B5E3B" },
  { id: "emerald", label: "Emerald", hex: "#0F766E" },
  { id: "peacock", label: "Peacock", hex: "#0E7490" },
  { id: "indigo", label: "Indigo", hex: "#1E3A8A" },
  { id: "royal", label: "Royal", hex: "#1D4ED8" },
  { id: "plum", label: "Plum", hex: "#6D28D9" },
  { id: "slate", label: "Slate", hex: "#334155" },
] as const;

export const APPEARANCE_PRESETS = [
  { id: "maroon", label: "Maroon", primary: "#8F1028", accent: "#E65319" },
  { id: "crimson", label: "Crimson", primary: "#B42318", accent: "#B8860B" },
  { id: "saffron", label: "Saffron", primary: "#C94708", accent: "#F5A524" },
  { id: "temple", label: "Temple", primary: "#6B3A2A", accent: "#B8860B" },
  { id: "copper", label: "Copper", primary: "#A15C38", accent: "#E65319" },
  { id: "forest", label: "Forest", primary: "#1B5E3B", accent: "#C4A35A" },
  { id: "emerald", label: "Emerald", primary: "#0F766E", accent: "#E65319" },
  { id: "peacock", label: "Peacock", primary: "#0E7490", accent: "#B8860B" },
  { id: "indigo", label: "Indigo", primary: "#1E3A8A", accent: "#E07A3D" },
  { id: "royal", label: "Royal", primary: "#1D4ED8", accent: "#B8860B" },
  { id: "plum", label: "Plum", primary: "#6D28D9", accent: "#B8860B" },
  { id: "lotus", label: "Lotus", primary: "#9D174D", accent: "#E65319" },
  { id: "wine", label: "Wine", primary: "#7F1D1D", accent: "#B8860B" },
  { id: "slate", label: "Slate", primary: "#334155", accent: "#E65319" },
] as const;

export const BUTTON_SHAPES = [
  { id: "pill", label: "Pill", radius: 999 },
  { id: "rounded", label: "Rounded", radius: 12 },
  { id: "square", label: "Square", radius: 4 },
] as const;

export const BUTTON_STYLES = [
  { id: "solid", label: "Solid" },
  { id: "soft", label: "Soft" },
  { id: "outline", label: "Outline" },
] as const;

export type CustomerAppearance = {
  preset: string;
  primary: string;
  accent: string;
  buttonShape: "pill" | "rounded" | "square";
  buttonStyle: "solid" | "soft" | "outline";
};

export const DEFAULT_APPEARANCE: CustomerAppearance = {
  preset: "maroon",
  primary: "#8F1028",
  accent: "#E65319",
  buttonShape: "pill",
  buttonStyle: "solid",
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function tint(hex: string, amount = 0.14) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#F7E8EA";
  const mix = (channel: string) => Math.round(parseInt(channel, 16) * amount + 255 * (1 - amount));
  const pair = (value: string) => mix(value).toString(16).padStart(2, "0");
  return `#${pair(raw.slice(0, 2))}${pair(raw.slice(2, 4))}${pair(raw.slice(4, 6))}`.toUpperCase();
}

export function darken(hex: string, amount = 0.18) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#111111";
  const mix = (channel: string) => Math.round(parseInt(channel, 16) * (1 - amount));
  const pair = (value: string) => mix(value).toString(16).padStart(2, "0");
  return `#${pair(raw.slice(0, 2))}${pair(raw.slice(2, 4))}${pair(raw.slice(4, 6))}`.toUpperCase();
}

export function consoleThemeStyle(input: unknown) {
  const tokens = buttonTokens(input);
  const radius = tokens.buttonShape === "pill" ? "999px" : `${tokens.radius}px`;
  return {
    "--brown": tokens.primary,
    "--brown-soft": tokens.softBg,
    "--orange": tokens.accent,
    "--orange-dark": darken(tokens.accent),
    "--button-radius": radius,
    "--button-bg": tokens.primaryBg,
    "--button-fg": tokens.primaryFg,
    "--button-border": tokens.primaryBorder,
    "--button-shadow": tokens.buttonStyle === "solid" ? darken(tokens.primary) : "transparent",
  } as CSSProperties;
}

export function normalizeAppearance(input: unknown): CustomerAppearance {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const named = APPEARANCE_PRESETS.find((item) => item.id === source.preset);
  const primary = HEX.test(String(source.primary || "")) ? String(source.primary).toUpperCase() : (named?.primary || DEFAULT_APPEARANCE.primary);
  const accent = HEX.test(String(source.accent || "")) ? String(source.accent).toUpperCase() : (named?.accent || DEFAULT_APPEARANCE.accent);
  const buttonShape = BUTTON_SHAPES.some((item) => item.id === source.buttonShape) ? source.buttonShape as CustomerAppearance["buttonShape"] : "pill";
  const buttonStyle = BUTTON_STYLES.some((item) => item.id === source.buttonStyle) ? source.buttonStyle as CustomerAppearance["buttonStyle"] : "solid";
  const matched = APPEARANCE_PRESETS.find((item) => item.primary === primary && item.accent === accent);
  return { preset: matched?.id || "custom", primary, accent, buttonShape, buttonStyle };
}

export function buttonTokens(input: unknown) {
  const theme = normalizeAppearance(input);
  const radius = BUTTON_SHAPES.find((item) => item.id === theme.buttonShape)?.radius ?? 999;
  const softBg = tint(theme.primary);
  let primaryBg = theme.primary;
  let primaryFg = "#FFFFFF";
  let primaryBorder = theme.primary;
  if (theme.buttonStyle === "soft") {
    primaryBg = softBg;
    primaryFg = theme.primary;
    primaryBorder = softBg;
  } else if (theme.buttonStyle === "outline") {
    primaryBg = "#FFFFFF";
    primaryFg = theme.primary;
    primaryBorder = theme.primary;
  }
  return { ...theme, radius, softBg, primaryBg, primaryFg, primaryBorder };
}
