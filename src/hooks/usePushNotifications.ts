import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // We only register push notifications on native devices and when a user is logged in
    if (!Capacitor.isNativePlatform() || !user) return;

    const registerPush = async () => {
      try {
        // Request permission to use push notifications
        // iOS will prompt user and return if they granted permission or not
        // Android will just grant without prompting (in older versions) or prompt in Android 13+
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          const newStatus = await PushNotifications.requestPermissions();
          if (newStatus.receive !== 'granted') {
            console.warn('User denied push notification permission');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission is not granted');
          return;
        }

        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        if (Capacitor.getPlatform() === 'android') {
          try {
            await PushNotifications.createChannel({
              id: 'tasty_bite_channel',
              name: 'Tasty Bite Notifications',
              description: 'General notifications for orders',
              importance: 5,
              visibility: 1,
            });
            console.log('Push channel created');
          } catch (channelErr) {
            console.error('Error creating push channel', channelErr);
          }
        }
      } catch (e) {
        console.error("Failed to register for push notifications:", e);
      }
    };

    // On success, we should be able to receive notifications
    const addListeners = async () => {
      await PushNotifications.addListener('registration', async (t: Token) => {
        console.log('Push registration success, token: ' + t.value);
        setToken(t.value);
        
        // Save the token to our Supabase database so our Edge Function can target it
        if (user) {
          const { error } = await supabase
            .from('user_push_tokens')
            .upsert({ 
              user_id: user.id, 
              token: t.value,
              device_type: Capacitor.getPlatform()
            }, { onConflict: 'user_id, token' });
            
          if (error) console.error("Error saving push token to DB:", error);
        }
      });

      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ', JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push received: ', JSON.stringify(notification));
        // You could show a local toast here if you want to double up, but we already have NotificationListener doing that
      });

      // Method called when tapping on a notification
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push action performed: ', JSON.stringify(notification));
      });
    };

    registerPush();
    addListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);

  return { token };
};
