import { Injectable } from '@nestjs/common';
import { TajulStorage } from '../../../common/lib/Disk/TajulStorage';
import appConfig from '../../../config/app.config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const notifications = await this.prisma.notification.findMany({
        select: {
          id: true,
          sender_id: true,
          receiver_id: true,
          entity_id: true,
          created_at: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          notification_event: {
            select: {
              id: true,
              type: true,
              text: true,
            },
          },
        },
      });

      // add url to avatar
      if (notifications.length > 0) {
        for (const notification of notifications) {
          if (notification.sender && notification.sender.avatar) {
            notification.sender['avatar_url'] = TajulStorage.url(
              appConfig().storageUrl.avatar + '/' + notification.sender.avatar,
            );
          }

          if (notification.receiver && notification.receiver.avatar) {
            notification.receiver['avatar_url'] = TajulStorage.url(
              appConfig().storageUrl.avatar +
                '/' +
                notification.receiver.avatar,
            );
          }
        }
      }

      return {
        success: true,
        message: 'Notifications fetched successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.message,
      };
    }
  }

  async remove(id: string, user_id: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: {
          id: id,
        },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.delete({
        where: {
          id: id,
        },
      });

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeAll(user_id: string) {
    try {
      // check if notification exists
      const notifications = await this.prisma.notification.findMany({
        where: {
          OR: [{ receiver_id: user_id }, { receiver_id: null }],
        },
      });

      if (notifications.length == 0) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.deleteMany({
        where: {
          OR: [{ receiver_id: user_id }, { receiver_id: null }],
        },
      });

      return {
        success: true,
        message: 'All notifications deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
