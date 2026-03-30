import * as admin from 'firebase-admin';
import { PrismaClient } from 'prisma/generated';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!admin.apps.length) {
  if (firebasePrivateKey && firebaseProjectId && firebaseClientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase initialized successfully.');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
    }
  } else {
    console.warn(
      '⚠️ Firebase credentials missing in .env file. Push notifications will not work.',
    );
  }
}

type NotificationType =
  | 'new_request'
  | 'request_accepted'
  | 'request_completed'
  | 'request_cancelled'
  | 'request_rejected'
  | 'request_feedback';

export class NotificationRepository {
  static async createNotification(payload: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: NotificationType;
    entity_id: string;
  }) {
    const { sender_id, receiver_id, text, type, entity_id } = payload;

    try {
      let notificationEvent = await prisma.notificationEvent.findFirst({
        where: { type, text },
      });

      if (!notificationEvent) {
        notificationEvent = await prisma.notificationEvent.create({
          data: { type, text },
        });
      }

      const newNotification = await prisma.notification.create({
        data: {
          sender_id,
          receiver_id,
          entity_id,
          notification_event_id: notificationEvent.id,
        },
      });

      this.sendPushNotification(receiver_id, type, text, entity_id);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  private static async sendPushNotification(
    receiverId: string,
    type: string,
    text: string,
    entityId: string,
  ) {
    if (!admin.apps.length) return;

    try {
      const user = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { fcm_token: true },
      });

      if (user?.fcm_token) {
        const message: admin.messaging.Message = {
          token: user.fcm_token,
          notification: {
            title: this.getNotificationTitle(type),
            body: text,
          },

          data: {
            entity_id: String(entityId),
            type: String(type),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        };

        await admin.messaging().send(message);
      } else {
      }
    } catch (error) {
      console.error('❌ Error sending FCM:', error);
    }
  }

  private static getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      new_request: 'New Request',
      request_accepted: 'Request Accepted',
      request_completed: 'Request Completed',
      request_cancelled: 'Request Cancelled',
      request_rejected: 'Request Rejected',
      request_feedback: 'Request Feedback',
    };
    return titles[type] || 'New Notification';
  }
}
