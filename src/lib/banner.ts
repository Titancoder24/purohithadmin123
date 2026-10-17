export const ROLE_PICKER_BANNER_KEY = "role_picker_banner";
export const BANNER_BUCKET = "app-banners";

export type RolePickerBanner = {
  badge: string;
  title: string;
  imageUrl: string;
};

export const DEFAULT_ROLE_PICKER_BANNER: RolePickerBanner = {
  badge: "THE TRUSTED WAY TO BEGIN",
  title: "Your shubh karya,\nhandled with care.",
  imageUrl: "",
};

export const BANNER_LIMITS = { badge: 40, title: 80 } as const;

export function normalizeRolePickerBanner(input: unknown): RolePickerBanner {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const text = (value: unknown, max: number, fallback: string) => {
    const clean = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
    return clean || fallback;
  };
  const imageUrl = typeof source.imageUrl === "string" && /^https:\/\/\S+$/i.test(source.imageUrl.trim()) ? source.imageUrl.trim() : "";
  return {
    badge: text(source.badge, BANNER_LIMITS.badge, DEFAULT_ROLE_PICKER_BANNER.badge),
    title: text(source.title, BANNER_LIMITS.title, DEFAULT_ROLE_PICKER_BANNER.title),
    imageUrl,
  };
}
