import { Link } from "react-router-dom";
import { MapPin, Clock, Users, Navigation } from "lucide-react";
import { Facility } from "../lib/types";
import { PressureBadge } from "./PressureBadge";

export function FacilityCard({ facility }: { facility: Facility }) {
  return (
    <Link to={`/facility/${facility._id}`} className="card p-4 flex flex-col gap-3 hover:border-teal-400 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-teal-500 font-semibold">{facility.type.replace(/_/g, " ")}</div>
          <h3 className="font-display text-lg font-semibold leading-snug">{facility.name}</h3>
        </div>
        <PressureBadge level={facility.pressureLevel} score={facility.pressureScore} />
      </div>

      <div className="flex items-center gap-1.5 text-sm text-ink/70">
        <MapPin size={14} className="shrink-0" />
        <span className="truncate">{facility.address}</span>
        {facility.distanceKm !== undefined && (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-teal-600 font-medium">
            <Navigation size={12} /> {facility.distanceKm} km
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {facility.services.slice(0, 4).map((s) => (
          <span key={s} className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-600 font-medium">
            {s}
          </span>
        ))}
        {facility.services.length > 4 && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-600 font-medium">
            +{facility.services.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-teal-50 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink/70">
          <Users size={14} /> Queue: <strong className="text-ink">{facility.liveQueueWaiting ?? "-"}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink/70">
          <Clock size={14} /> {facility.operatingHours}
        </span>
      </div>
    </Link>
  );
}
