export type PhaseColor = "teal" | "blue" | "amber";

interface PhaseStyle {
  bg: string;
  bgSoft: string;
  text: string;
  border: string;
  ring: string;
}

export const phaseStyles: Record<PhaseColor, PhaseStyle> = {
  teal: {
    bg: "bg-teal",
    bgSoft: "bg-teal-soft",
    text: "text-teal",
    border: "border-teal",
    ring: "ring-teal",
  },
  blue: {
    bg: "bg-blue",
    bgSoft: "bg-blue-soft",
    text: "text-blue",
    border: "border-blue",
    ring: "ring-blue",
  },
  amber: {
    bg: "bg-amber",
    bgSoft: "bg-amber-soft",
    text: "text-amber",
    border: "border-amber",
    ring: "ring-amber",
  },
};
