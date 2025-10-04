import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { analytics } from './analytics';

export interface NotificationPermissionResult {
  granted: boolean;
  token?: string;
}

export const pushNotificationService = {
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on native platforms');
      return;
    }

    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      this.registerToken(token.value);
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      analytics.track('notification_received', {
        title: notification.title,
        type: notification.data.type,
      });
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      analytics.track('notification_opened', {
        title: notification.notification.title,
        type: notification.notification.data.type,
      });
    });
  },

  async requestPermission(): Promise<NotificationPermissionResult> {
    if (!Capacitor.isNativePlatform()) {
      return { granted: false };
    }

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return { granted: false };
    }

    await PushNotifications.register();
    return { granted: true };
  },

  async registerToken(token: string): Promise<void> {
    try {
      const { apiRequest } = await import('./queryClient');
      await apiRequest('POST', '/api/notifications/register', { token });
      console.log('Token registered with server');
    } catch (error) {
      console.error('Failed to register token:', error);
    }
  },

  async getDeliveredNotifications() {
    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    const notificationList = await PushNotifications.getDeliveredNotifications();
    return notificationList.notifications;
  },

  async removeAllDeliveredNotifications() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await PushNotifications.removeAllDeliveredNotifications();
  },
};
