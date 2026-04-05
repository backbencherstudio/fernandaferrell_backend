import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationRepository implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('🚀 Firebase Admin Initialized Successfully');
      } catch (error) {
        console.error('❌ Firebase Initialization Error:', error.message);
      }
    }
  }

  async createNotification(payload: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: string;
    entity_id: string;
  }) {
    const { sender_id, receiver_id, text, type, entity_id } = payload;

    console.log('--- 🆕 New Notification Request ---');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      // 1. Notification Event finding
      let notificationEvent = await this.prisma.notificationEvent.findFirst({
        where: { type, text },
      });

      if (!notificationEvent) {
        console.log(`📝 Creating new NotificationEvent for type: ${type}`);
        notificationEvent = await this.prisma.notificationEvent.create({
          data: { type, text },
        });
      }

      // 2. database save notification
      const notification = await this.prisma.notification.create({
        data: {
          sender_id,
          receiver_id,
          entity_id,
          notification_event_id: notificationEvent.id,
          latest_news: true,
          sign_of_disaster: true,
          message_news: true,
        },
        include: {
          notification_event: true,
        },
      });

      console.log('✅ Notification saved to DB:', notification.id);

      // ৩. FCM sending (Background process )
      this.sendFCM(receiver_id, type, text, entity_id);

      return notification;
    } catch (error) {
      console.error('❌ Database/Logic Error:', error);
      throw new InternalServerErrorException('Failed to process notification');
    }
  }

  private async sendFCM(
    receiverId: string,
    type: string,
    text: string,
    entityId: string,
  ) {
    console.log(`🔍 Attempting to send FCM to User: ${receiverId}`);

    if (!admin.apps.length) {
      console.error('⚠️ FCM skipped: Firebase Admin not initialized.');
      return;
    }

    try {
      // user and token finding
      const user = await this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { fcm_token: true },
      });

      if (!user?.fcm_token) {
        console.warn(`⚠️ FCM skipped: No token found for user ${receiverId}`);
        return;
      }

      // FCM message payload  making
      const message: admin.messaging.Message = {
        token: user.fcm_token,
        notification: {
          title: this.formatTitle(type),
          body: text,
        },
        data: {
          entity_id: String(entityId),
          type: String(type),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: { sound: 'default', badge: 1, contentAvailable: true },
          },
        },
      };

      console.log('📡 Sending FCM Message Payload');

      const response = await admin.messaging().send(message);
      console.log('🎉 FCM Sent Successfully! MessageID:', response);
    } catch (fcmError: any) {
      console.error('❌ FCM Send Error:', fcmError.message);

      //  token invalid then token remove from database
      const errorCode = fcmError.code;
      if (
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token'
      ) {
        console.warn(`🗑️ Removing invalid FCM token for User: ${receiverId}`);
        try {
          await this.prisma.user.update({
            where: { id: receiverId },
            data: { fcm_token: null },
          });
          console.log('✅ Database cleaned: Invalid token removed.');
        } catch (dbError) {
          console.error('❌ Failed to remove invalid token from DB:', dbError);
        }
      }
    }
  }

  private formatTitle(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
