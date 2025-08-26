"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTaskStatusChanged = exports.onTaskCreated = exports.saveFcmToken = exports.updateAssignedTaskStatus = exports.assignTask = exports.setUserRole = exports.adminCreateUser = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_2 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const email_1 = require("./email");
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
const EMAIL_API_KEY = (0, params_1.defineSecret)('EMAIL_API_KEY');
function assertAdmin(ctx) {
    if (!ctx.auth || ctx.auth.token?.role !== 'admin') {
        throw new Error('unauthorized');
    }
}
function randomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 12; i++)
        pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
}
function minuteBucket(date) {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d.toISOString();
}
async function createNotificationIfAbsent(params) {
    const notifRef = db.collection('users').doc(params.toUid).collection('notifications').doc(params.dedupeKey);
    await db.runTransaction(async (tx) => {
        const existing = await tx.get(notifRef);
        if (!existing.exists) {
            tx.set(notifRef, {
                ...params.doc,
                createdAt: firestore_2.FieldValue.serverTimestamp(),
            });
        }
    });
}
async function sendPushToUser(uid, payload) {
    const userDoc = await db.collection('users').doc(uid).get();
    const tokens = userDoc.get('fcmTokens') || [];
    if (!tokens?.length)
        return;
    await messaging.sendEachForMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data,
        webpush: {
            fcmOptions: { link: payload.data?.url || '/app' }
        }
    });
}
exports.adminCreateUser = (0, https_1.onCall)({ secrets: [EMAIL_API_KEY] }, async (req) => {
    assertAdmin(req);
    const schema = zod_1.z.object({
        email: zod_1.z.string().email(),
        displayName: zod_1.z.string().min(1),
        role: zod_1.z.enum(['admin', 'user'])
    });
    const { email, displayName, role } = schema.parse(req.data || {});
    const tempPassword = randomPassword();
    const userRecord = await admin.auth().createUser({ email, displayName, password: tempPassword });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    const now = firestore_2.FieldValue.serverTimestamp();
    await db.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        role,
        createdAt: now,
        lastSeenAt: now,
        fcmTokens: [],
        settings: { notifications: { inApp: true, push: true, email: false } }
    }, { merge: true });
    const emailRes = await (0, email_1.sendInviteEmail)({ to: email, displayName, tempPassword });
    return { uid: userRecord.uid, tempPassword: emailRes.ok ? undefined : tempPassword, emailSent: emailRes.ok };
});
exports.setUserRole = (0, https_1.onCall)(async (req) => {
    assertAdmin(req);
    const schema = zod_1.z.object({ uid: zod_1.z.string().min(1), role: zod_1.z.enum(['admin', 'user']) });
    const { uid, role } = schema.parse(req.data || {});
    await admin.auth().setCustomUserClaims(uid, { role });
    await db.collection('users').doc(uid).set({ role }, { merge: true });
    return { ok: true };
});
exports.assignTask = (0, https_1.onCall)(async (req) => {
    assertAdmin(req);
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(1),
        description: zod_1.z.string().optional(),
        dueAt: zod_1.z.number().optional(),
        assignedToId: zod_1.z.string().min(1)
    });
    const { title, description, dueAt, assignedToId } = schema.parse(req.data || {});
    const callerUid = req.auth.uid;
    const now = firestore_2.FieldValue.serverTimestamp();
    const docRef = db.collection('tasks').doc();
    const task = {
        title,
        description,
        dueAt: dueAt ? firestore_2.Timestamp.fromMillis(dueAt) : undefined,
        status: 'todo',
        isAssigned: true,
        ownerId: callerUid,
        assignedToId,
        assignedById: callerUid,
        createdAt: now,
        updatedAt: now,
    };
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
exports.updateAssignedTaskStatus = (0, https_1.onCall)(async (req) => {
    if (!req.auth)
        throw new Error('unauthenticated');
    const schema = zod_1.z.object({ taskId: zod_1.z.string().min(1), status: zod_1.z.enum(['todo', 'in_progress', 'done']) });
    const { taskId, status } = schema.parse(req.data || {});
    const uid = req.auth.uid;
    const taskRef = db.collection('tasks').doc(taskId);
    const snap = await taskRef.get();
    if (!snap.exists)
        throw new Error('not_found');
    const data = snap.data();
    if (!data.isAssigned || data.assignedToId !== uid)
        throw new Error('forbidden');
    const oldStatus = data.status;
    const allowed = (oldStatus === 'todo' && (status === 'in_progress' || status === 'done')) || (oldStatus === 'in_progress' && status === 'done') || (oldStatus === status);
    if (!allowed)
        throw new Error('invalid_transition');
    await taskRef.update({ status, updatedAt: firestore_2.FieldValue.serverTimestamp() });
    // Notify admins
    const admins = await db.collection('users').where('role', '==', 'admin').get();
    const promises = [];
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
exports.saveFcmToken = (0, https_1.onCall)(async (req) => {
    if (!req.auth)
        throw new Error('unauthenticated');
    const schema = zod_1.z.object({ token: zod_1.z.string().min(10) });
    const { token } = schema.parse(req.data || {});
    const uid = req.auth.uid;
    await db.collection('users').doc(uid).set({ fcmTokens: admin.firestore.FieldValue.arrayUnion(token) }, { merge: true });
    return { ok: true };
});
exports.onTaskCreated = (0, firestore_1.onDocumentCreated)('tasks/{taskId}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
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
exports.onTaskStatusChanged = (0, firestore_1.onDocumentUpdated)('tasks/{taskId}', async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after)
        return;
    if (!after.isAssigned)
        return;
    if (before.status === after.status)
        return;
    const admins = await db.collection('users').where('role', '==', 'admin').get();
    const promises = [];
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
