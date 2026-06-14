export const CORES_DISPONIVEIS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "purple",
  "pink",
  "rose",
] as const;

export type CorBrand = (typeof CORES_DISPONIVEIS)[number];
export type CorPrimaria = CorBrand | "zinc";

export const corClasses: Record<
  CorPrimaria,
  { text: string; border: string; bg: string; muted: string }
> = {
  red: {
    text: "text-red-500",
    border: "border-red-600",
    bg: "bg-red-600",
    muted: "text-red-400",
  },
  orange: {
    text: "text-orange-500",
    border: "border-orange-600",
    bg: "bg-orange-600",
    muted: "text-orange-400",
  },
  amber: {
    text: "text-amber-500",
    border: "border-amber-600",
    bg: "bg-amber-600",
    muted: "text-amber-400",
  },
  green: {
    text: "text-green-500",
    border: "border-green-600",
    bg: "bg-green-600",
    muted: "text-green-400",
  },
  teal: {
    text: "text-teal-500",
    border: "border-teal-600",
    bg: "bg-teal-600",
    muted: "text-teal-400",
  },
  blue: {
    text: "text-blue-500",
    border: "border-blue-600",
    bg: "bg-blue-600",
    muted: "text-blue-400",
  },
  violet: {
    text: "text-violet-500",
    border: "border-violet-600",
    bg: "bg-violet-600",
    muted: "text-violet-400",
  },
  purple: {
    text: "text-purple-500",
    border: "border-purple-600",
    bg: "bg-purple-600",
    muted: "text-purple-400",
  },
  pink: {
    text: "text-pink-500",
    border: "border-pink-600",
    bg: "bg-pink-600",
    muted: "text-pink-400",
  },
  rose: {
    text: "text-rose-500",
    border: "border-rose-600",
    bg: "bg-rose-600",
    muted: "text-rose-400",
  },
  zinc: {
    text: "text-zinc-400",
    border: "border-zinc-600",
    bg: "bg-zinc-700",
    muted: "text-zinc-500",
  },
};

export const DEFAULT_COR: CorPrimaria = "zinc";
export const DEFAULT_SIGLA = "TV";
export const DEFAULT_NOME = "Roleplay";
