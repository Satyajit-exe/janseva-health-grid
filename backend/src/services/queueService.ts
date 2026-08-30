import { Types } from "mongoose";
import Queue from "../models/Queue";
import QueueToken from "../models/QueueToken";
import Department from "../models/Department";
import { ApiError } from "../middleware/errorHandler";
import { emit } from "../sockets";
import { estimateWaitMinutes } from "./waitTimeService";
import { recalculateFacilityPressure } from "./pressureService";
import { notifyUser } from "./notificationService";
import { writeAuditLog } from "../utils/audit";
import { PriorityLevel } from "../utils/constants";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function tokenCodeFor(departmentPrefix: string, sequenceNumber: number): string {
  return `${departmentPrefix}-${String(sequenceNumber).padStart(3, "0")}`;
}

/** Finds today's active queue for a department, creating it if this is the first token of the day. */
export async function getOrCreateTodaysQueue(facilityId: string, departmentId: string, doctorId?: string) {
  const department = await Department.findById(departmentId);
  if (!department) throw new ApiError(404, "Department not found");

  // Look for any existing queue for this department today
  let queue = await Queue.findOne({ facilityId, departmentId, date: todayStr() });
  
  if (!queue) {
    const filter = { facilityId, departmentId, doctorId: doctorId || null, date: todayStr() };
    queue = await Queue.create({
      ...filter,
      averageConsultationMinutes: department.averageConsultationMinutes,
    });
  } else if (doctorId && !queue.doctorId) {
    // Associate the doctor if the queue was initially created without one
    queue.doctorId = new Types.ObjectId(doctorId) as any;
    await queue.save();
  }
  
  return queue;
}

export async function generateToken(params: {
  facilityId: string;
  departmentId: string;
  doctorId?: string;
  patientId: string;
}) {
  const queue = await getOrCreateTodaysQueue(params.facilityId, params.departmentId, params.doctorId);
  const department = await Department.findById(params.departmentId);
  if (!department) throw new ApiError(404, "Department not found");

  queue.lastTokenNumber += 1;
  await queue.save();

  const prefix = department.name.slice(0, 1).toUpperCase() || "A";
  const token = await QueueToken.create({
    queueId: queue._id,
    facilityId: params.facilityId,
    departmentId: params.departmentId,
    patientId: params.patientId,
    tokenCode: tokenCodeFor(prefix, queue.lastTokenNumber),
    sequenceNumber: queue.lastTokenNumber,
    status: "WAITING",
  });

  const wait = await estimateWaitMinutes(queue, token.sequenceNumber);
  await recalculateFacilityPressure(params.facilityId);

  emit.toQueue(String(queue._id), "queue:updated", { queueId: String(queue._id) });
  emit.toFacility(String(params.facilityId), "queue:updated", { queueId: String(queue._id) });

  await notifyUser({
    userId: params.patientId,
    type: "TOKEN_GENERATED",
    title: "Token generated",
    message: `Your token ${token.tokenCode} is confirmed. Estimated wait: ${wait.estimatedMinutes} min.`,
    relatedFacilityId: params.facilityId,
  });

  return { token, queue, wait };
}

export async function getTokenStatus(tokenId: string) {
  const token = await QueueToken.findById(tokenId);
  if (!token) throw new ApiError(404, "Token not found");
  const queue = await Queue.findById(token.queueId);
  if (!queue) throw new ApiError(404, "Queue not found");

  const wait = await estimateWaitMinutes(queue, token.sequenceNumber);
  return { token, queue, wait };
}

async function requireQueueToken(tokenId: string) {
  const token = await QueueToken.findById(tokenId);
  if (!token) throw new ApiError(404, "Token not found");
  return token;
}

export async function checkInToken(tokenId: string) {
  const token = await requireQueueToken(tokenId);
  token.checkedInAt = new Date();
  await token.save();
  emit.toQueue(String(token.queueId), "queue:updated", { queueId: String(token.queueId) });
  return token;
}

/** Staff action: CALL NEXT. Selects the highest-priority, lowest-sequence WAITING token. */
export async function callNext(queueId: string, staffUserId: string) {
  const queue = await Queue.findById(queueId);
  if (!queue) throw new ApiError(404, "Queue not found");

  const priorityRank: Record<PriorityLevel, number> = { EMERGENCY: 0, URGENT: 1, PRIORITY: 2, NORMAL: 3 };

  const candidates = await QueueToken.find({ queueId, status: "WAITING" }).lean();
  if (candidates.length === 0) throw new ApiError(400, "No waiting patients in this queue");

  candidates.sort((a, b) => {
    const p = priorityRank[a.priority] - priorityRank[b.priority];
    if (p !== 0) return p;
    return a.sequenceNumber - b.sequenceNumber;
  });

  // Auto-transition any previous CALLED/IN_CONSULTATION tokens in this queue to clear the way.
  const activeTokens = await QueueToken.find({ queueId, status: { $in: ["CALLED", "IN_CONSULTATION"] } });
  for (const t of activeTokens) {
    const beforeStatus = t.status;
    if (t.status === "CALLED") {
      t.status = "NO_SHOW";
    } else if (t.status === "IN_CONSULTATION") {
      t.status = "COMPLETED";
      t.completedAt = new Date();
      await recalculateFacilityPressure(String(t.facilityId));
    }
    await t.save();

    await writeAuditLog({
      userId: staffUserId,
      action: t.status === "NO_SHOW" ? "TOKEN_NO_SHOW" : "TOKEN_COMPLETED",
      resource: "QueueToken",
      resourceId: t._id,
      facilityId: t.facilityId,
      oldValue: { status: beforeStatus },
      newValue: { status: t.status },
    });
  }

  const next = await QueueToken.findByIdAndUpdate(
    candidates[0]._id,
    { status: "CALLED", calledAt: new Date() },
    { new: true }
  );
  if (!next) throw new ApiError(404, "Token not found");

  queue.currentTokenNumber = next.sequenceNumber;
  await queue.save();

  emit.toQueue(String(queueId), "token:called", { tokenId: String(next._id), tokenCode: next.tokenCode });
  emit.toFacility(String(next.facilityId), "queue:updated", { queueId: String(queueId) });

  await notifyUser({
    userId: String(next.patientId),
    type: "TOKEN_CALLED",
    title: "You're being called",
    message: `Token ${next.tokenCode} - please proceed to the counter/consultation room now.`,
    relatedFacilityId: String(next.facilityId),
  });

  await writeAuditLog({
    userId: staffUserId,
    action: "TOKEN_CALLED",
    resource: "QueueToken",
    resourceId: next._id,
    facilityId: next.facilityId,
  });

  return next;
}

export async function markConsultationStarted(tokenId: string) {
  const token = await QueueToken.findByIdAndUpdate(
    tokenId,
    { status: "IN_CONSULTATION", consultationStartedAt: new Date() },
    { new: true }
  );
  if (!token) throw new ApiError(404, "Token not found");
  emit.toQueue(String(token.queueId), "queue:updated", { queueId: String(token.queueId) });
  return token;
}

export async function markCompleted(tokenId: string) {
  const token = await QueueToken.findByIdAndUpdate(
    tokenId,
    { status: "COMPLETED", completedAt: new Date() },
    { new: true }
  );
  if (!token) throw new ApiError(404, "Token not found");
  emit.toQueue(String(token.queueId), "queue:updated", { queueId: String(token.queueId) });
  await recalculateFacilityPressure(String(token.facilityId));
  return token;
}

export async function markSkippedOrNoShow(tokenId: string, status: "SKIPPED" | "NO_SHOW") {
  const token = await QueueToken.findByIdAndUpdate(tokenId, { status }, { new: true });
  if (!token) throw new ApiError(404, "Token not found");
  emit.toQueue(String(token.queueId), "queue:updated", { queueId: String(token.queueId) });
  return token;
}

export async function setPriority(params: {
  tokenId: string;
  priority: PriorityLevel;
  reason: string;
  staffUserId: string;
}) {
  const before = await requireQueueToken(params.tokenId);
  const oldPriority = before.priority;

  const token = await QueueToken.findByIdAndUpdate(
    params.tokenId,
    { priority: params.priority, priorityReason: params.reason, priorityAssignedBy: params.staffUserId },
    { new: true }
  );
  if (!token) throw new ApiError(404, "Token not found");

  emit.toQueue(String(token.queueId), "queue:updated", { queueId: String(token.queueId) });

  // Every priority override must generate an audit event - never silent.
  await writeAuditLog({
    userId: params.staffUserId,
    action: "QUEUE_PRIORITY_CHANGED",
    resource: "QueueToken",
    resourceId: token._id,
    facilityId: token.facilityId,
    oldValue: { priority: oldPriority },
    newValue: { priority: params.priority, reason: params.reason },
  });

  if (params.priority === "EMERGENCY") {
    emit.toFacility(String(token.facilityId), "facility:pressure-updated", { emergencyOverride: true });
  }

  return token;
}

export async function listQueueTokens(queueId: string) {
  return QueueToken.find({ queueId }).sort({ sequenceNumber: 1 });
}
