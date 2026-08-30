import { PressureLevel } from "../lib/types";

const STYLES: Record<PressureLevel, string> = {
  LOW: "bg-ok-100 text-ok-500",
  MODERATE: "bg-warn-100 text-warn-500",
  HIGH: "bg-saffron-100 text-saffron-600",
  CRITICAL: "bg-danger-100 text-danger-500",
};

export function PressureBadge({ level, score }: { level: PressureLevel; score?: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${STYLES[level]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {level}
      {score !== undefined && <span className="font-mono normal-case font-medium opacity-70">{score}</span>}
    </span>
  );
}
