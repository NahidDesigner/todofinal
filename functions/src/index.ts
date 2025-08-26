import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { sendInviteEmail } from './email';
import { NotificationDoc, Task, TaskStatus, UserRole } from './types';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const EMAIL_API_KEY = defineSecret('EMAIL_API_KEY');

function assertAdmin(ctx: any) {
  if (!ctx.auth || ctx.auth.token?.role !== 'admin') {
    throw new Error('unauthorized');
  }
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random()*chars.length)];
  return pwd;
}

function minuteBucket(date: Date): string {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d.toISOString();
}

async function createNotificationIfAbsent(params: {
  toUid: string;
  dedupeKey: string;
  doc: Omit<NotificationDoc, 'createdAt'>;
}) {
  const notifRef = db.collection('users').doc(params.toUid).collection('notifications').doc(params.dedupeKey);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(notifRef);
    if (!existing.exists) {
      tx.set(notifRef, {
        ...params.doc,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

async function sendPushToUser(uid: string, payload: { notification: { title: string; body: string }, data?: Record<string,string> }) {
  const userDoc = await db.collection('users').doc(uid).get();
  const tokens: string[] = userDoc.get('fcmTokens') || [];
  if (!tokens?.length) return;
  await messaging.sendEachForMulticast({
    tokens,
    notification: payload.notification,
    data: payload.data,
    webpush: {
      fcmOptions: { link: payload.data?.url || '/app' }
    }
  });
}

export const adminCreateUser = onCall({ secrets: [EMAIL_API_KEY] }, async (req) => {
  assertAdmin(req);
  const schema = z.object({
    email: z.string().email(),
    displayName: z.string().min(1),
    role: z.enum(['admin', 'user'])
  });
  const { email, displayName, role } = schema.parse(req.data || {});
  const tempPassword = randomPassword();
  const userRecord = await admin.auth().createUser({ email, displayName, password: tempPassword });
  await admin.auth().setCustomUserClaims(userRecord.uid, { role });
  const now = FieldValue.serverTimestamp();
  await db.collection('users').doc(userRecord.uid).set({
    email,
    displayName,
    role,
    createdAt: now,
    lastSeenAt: now,
    fcmTokens: [],
    settings: { notifications: { inApp: true, push: true, email: false } }
  }, { merge: true });

  const emailRes = await sendInviteEmail({ to: email, displayName, tempPassword });
  return { uid: userRecord.uid, tempPassword: emailRes.ok ? undefined : tempPassword, emailSent: emailRes.ok };
});

export const setUserRole = onCall(async (req) => {
  assertAdmin(req);
  const schema = z.object({ uid: z.string().min(1), role: z.enum(['admin', 'user']) });
  const { uid, role } = schema.parse(req.data || {});
  await admin.auth().setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).set({ role }, { merge: true });
  return { ok: true };
});

export const assignTask = onCall(async (req) => {
  assertAdmin(req);
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueAt: z.number().optional(),
    assignedToId: z.string().min(1)
  });
  const { title, description, dueAt, assignedToId } = schema.parse(req.data || {});
  const callerUid = req.auth!.uid;
  const now = FieldValue.serverTimestamp();
  const docRef = db.collection('tasks').doc();
  const task: Partial<Task> = {
    title,
    description,
    dueAt: dueAt ? Timestamp.fromMillis(dueAt) : undefined,
    status: 'todo',
    isAssigned: true,
    ownerId: callerUid,
    assignedToId,
    assignedById: callerUid,
    createdAt: now as any,
    updatedAt: now as any,
  } as any;
  await docRef.set(task);

  // Notify assignee (idempotent)
  const dedupeKey = `${docRef.id}:assigned:${minuteBucket(new Date())}`;
  await createNotificationIfAbsent({
    toUid: assignedToId,
    dedupeKey,
    doc: {
      type: 'TASK_ASSIGNED',
      taskId: docRef.id,
      title: 'New task assigned',
      message: title,
      fromUid: callerUid,
      toUid: assignedToId,
      status: 'unread'
    }
  });
  await sendPushToUser(assignedToId, { notification: { title: 'New task assigned', body: title }, data: { url: `/app` } });

  return { taskId: docRef.id };
});

export const updateAssignedTaskStatus = onCall(async (req) => {
  if (!req.auth) throw new Error('unauthenticated');
  const schema = z.object({ taskId: z.string().min(1), status: z.enum(['todo','in_progress','done']) });
  const { taskId, status } = schema.parse(req.data || {});
  const uid = req.auth.uid;
  const taskRef = db.collection('tasks').doc(taskId);
  const snap = await taskRef.get();
  if (!snap.exists) throw new Error('not_found');
  const data = snap.data() as any;
  if (!data.isAssigned || data.assignedToId !== uid) throw new Error('forbidden');
  const oldStatus = data.status as TaskStatus;
  const allowed = (oldStatus === 'todo' && (status === 'in_progress' || status === 'done')) || (oldStatus === 'in_progress' && status === 'done') || (oldStatus === status);
  if (!allowed) throw new Error('invalid_transition');
  await taskRef.update({ status, updatedAt: FieldValue.serverTimestamp() });

  // Notify admins
  const admins = await db.collection('users').where('role', '==', 'admin').get();
  const promises: Promise<any>[] = [];
  for (const adminDoc of admins.docs) {
    const adminUid = adminDoc.id;
    const dedupeKey = `${taskId}:status:${status}:${minuteBucket(new Date())}`;
    promises.push(createNotificationIfAbsent({
      toUid: adminUid,
      dedupeKey,
      doc: {
        type: 'TASK_STATUS_CHANGED',
        taskId,
        title: 'Task status updated',
        message: `${data.title} → ${status}`,
        fromUid: uid,
        toUid: adminUid,
        status: 'unread'
      }
    }));
    promises.push(sendPushToUser(adminUid, { notification: { title: 'Task status updated', body: `${data.title} → ${status}` }, data: { url: `/app` } }));
  }
  await Promise.all(promises);
  return { ok: true };
});

export const saveFcmToken = onCall(async (req) => {
  if (!req.auth) throw new Error('unauthenticated');
  const schema = z.object({ token: z.string().min(10) });
  const { token } = schema.parse(req.data || {});
  const uid = req.auth.uid;
  await db.collection('users').doc(uid).set({ fcmTokens: admin.firestore.FieldValue.arrayUnion(token) }, { merge: true });
  return { ok: true };
});

export const onTaskCreated = onDocumentCreated('tasks/{taskId}', async (event) => {
  const data = event.data?.data() as any;
  if (!data) return;
  if (data.isAssigned && data.assignedToId) {
    const dedupeKey = `${event.params.taskId}:assigned:${minuteBucket(new Date())}`;
    await createNotificationIfAbsent({
      toUid: data.assignedToId,
      dedupeKey,
      doc: {
        type: 'TASK_ASSIGNED',
        taskId: event.params.taskId,
        title: 'New task assigned',
        message: data.title || 'A task was assigned to you',
        fromUid: data.assignedById || data.ownerId,
        toUid: data.assignedToId,
        status: 'unread'
      }
    });
    await sendPushToUser(data.assignedToId, { notification: { title: 'New task assigned', body: data.title || '' }, data: { url: `/app` } });
  }
});

export const onTaskStatusChanged = onDocumentUpdated('tasks/{taskId}', async (event) => {
  const before = event.data?.before?.data() as any;
  const after = event.data?.after?.data() as any;
  if (!before || !after) return;
  if (!after.isAssigned) return;
  if (before.status === after.status) return;

  const admins = await db.collection('users').where('role', '==', 'admin').get();
  const promises: Promise<any>[] = [];
  for (const adminDoc of admins.docs) {
    const adminUid = adminDoc.id;
    const dedupeKey = `${event.params.taskId}:status:${after.status}:${minuteBucket(new Date())}`;
    promises.push(createNotificationIfAbsent({
      toUid: adminUid,
      dedupeKey,
      doc: {
        type: 'TASK_STATUS_CHANGED',
        taskId: event.params.taskId,
        title: 'Task status updated',
        message: `${after.title} → ${after.status}`,
        fromUid: after.assignedToId,
        toUid: adminUid,
        status: 'unread'
      }
    }));
    promises.push(sendPushToUser(adminUid, { notification: { title: 'Task status updated', body: `${after.title} → ${after.status}` }, data: { url: `/app` } }));
  }
  await Promise.all(promises);
});