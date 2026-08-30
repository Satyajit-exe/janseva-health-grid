import { Queue, QueueToken, WaitEstimate } from "../lib/types";

export function TokenBoard({
  queue,
  myToken,
  wait,
}: {
  queue: Queue;
  myToken?: QueueToken;
  wait?: WaitEstimate;
}) {
  return (
    <div className="card p-6 bg-teal-500 !bg-teal-500 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-teal-100 text-xs uppercase tracking-widest font-medium">Now Serving</div>
          <div className="font-mono text-4xl font-semibold tabular-nums">
            {queue.currentTokenNumber > 0 ? `#${String(queue.currentTokenNumber).padStart(3, "0")}` : "—"}
          </div>
        </div>
        {myToken && (
          <div className="sm:text-right">
            <div className="text-teal-100 text-xs uppercase tracking-widest font-medium">Your Token</div>
            <div className="font-mono text-4xl font-semibold tabular-nums">{myToken.tokenCode}</div>
          </div>
        )}
      </div>
      {wait && (
        <div className="relative mt-5 pt-4 border-t border-white/20 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-teal-100">People Ahead:</span> <strong>{wait.patientsAhead}</strong>
          </div>
          <div>
            <span className="text-teal-100">Estimated Wait:</span> <strong>{wait.estimatedMinutes} min</strong>
          </div>
          <div className="text-teal-100 text-xs italic">Estimated — may change based on actual consultation time.</div>
        </div>
      )}
    </div>
  );
}
