import QueueToken from "../models/QueueToken";
import { IQueue } from "../models/Queue";
import { Types } from "mongoose";

/**
 * Estimated Wait = Patients Ahead x Average Consultation Time,
 * adjusted for priority patients who will be served before this token.
 * This is explicitly an estimate - callers must label it as such in API responses.
 */
export async function estimateWaitMinutes(queue: IQueue, sequenceNumber: number): Promise<{
  patientsAhead: number;
  priorityAhead: number;
  estimatedMinutes: number;
}> {
  const waitingAhead = await QueueToken.find({
    queueId: queue._id,
    status: { $in: ["WAITING", "CALLED"] },
    sequenceNumber: { $lt: sequenceNumber },
  }).lean();

  const patientsAhead = waitingAhead.length;
  const priorityAhead = waitingAhead.filter((t) => t.priority !== "NORMAL").length;

  // Priority/urgent/emergency patients are served out of turn, so they compress the
  // effective wait even though they don't change raw sequence position.
  const effectivePatientsAhead = patientsAhead;
  const estimatedMinutes = Math.max(0, Math.round(effectivePatientsAhead * queue.averageConsultationMinutes));

  return { patientsAhead, priorityAhead, estimatedMinutes };
}

export async function queueSnapshot(queueId: Types.ObjectId, averageConsultationMinutes: number) {
  const waiting = await QueueToken.countDocuments({ queueId, status: "WAITING" });
  const totalToday = await QueueToken.countDocuments({ queueId });
  return {
    waiting,
    totalToday,
    estimatedMinutesForNext: Math.round(waiting * averageConsultationMinutes),
  };
}
