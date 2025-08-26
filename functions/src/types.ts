export type UserRole = 'admin' | 'user';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  title: string;
  description?: string;
  dueAt?: FirebaseFirestore.Timestamp;
  status: TaskStatus;
  isAssigned: boolean;
  ownerId: string;
  assignedToId?: string;
  assignedById?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED';

export interface NotificationDoc {
  type: NotificationType;
  taskId?: string;
  title: string;
  message: string;
  fromUid: string;
  toUid: string;
  status: 'unread' | 'read';
  createdAt: FirebaseFirestore.Timestamp;
}