import { Check, Circle, Loader2, X } from "lucide-react";
import { CareJourney, JourneyStep } from "../lib/types";

const STEP_LABELS: Record<JourneyStep, string> = {
  SEARCHED_FACILITY: "Searched Facility",
  SELECTED_SERVICE: "Selected Service",
  DIGITAL_TOKEN: "Digital Token",
  CHECK_IN: "Check-In",
  WAITING: "Waiting",
  DOCTOR_CONSULTATION: "Doctor Consultation",
  MEDICINE: "Medicine",
  REFERRAL_FOLLOWUP: "Referral / Follow-up",
  CARE_COMPLETED: "Care Completed",
};

function StepIcon({ status }: { status: string }) {
  if (status === "DONE") return <Check size={14} strokeWidth={3} />;
  if (status === "IN_PROGRESS") return <Loader2 size={14} className="animate-spin" />;
  if (status === "SKIPPED") return <X size={14} />;
  return <Circle size={10} />;
}

export function JourneyTimeline({ journey }: { journey: CareJourney }) {
  return (
    <ol className="relative flex flex-col gap-0" aria-label="My Care Journey timeline">
      {journey.events.map((event, i) => {
        const isDone = event.status === "DONE";
        const isActive = event.status === "IN_PROGRESS";
        const isLast = i === journey.events.length - 1;
        return (
          <li key={event.step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  isDone
                    ? "bg-teal-500 border-teal-500 text-white"
                    : isActive
                    ? "bg-saffron-100 border-saffron-500 text-saffron-600"
                    : "bg-white border-teal-200 text-teal-300"
                }`}
              >
                <StepIcon status={event.status} />
              </div>
              {!isLast && <div className={`w-0.5 flex-1 min-h-[28px] ${isDone ? "bg-teal-500" : "bg-teal-100"}`} />}
            </div>
            <div className={`pb-7 ${isLast ? "pb-0" : ""}`}>
              <div className={`font-medium text-sm ${isDone || isActive ? "text-ink" : "text-ink/50"}`}>
                {STEP_LABELS[event.step]}
              </div>
              {(isDone || isActive) && (
                <div className="text-xs text-ink/50 mt-0.5">
                  {new Date(event.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {event.notes ? ` · ${event.notes}` : ""}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
