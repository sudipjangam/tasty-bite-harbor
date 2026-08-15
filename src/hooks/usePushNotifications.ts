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

    // On success, we should be able to receive notifications
    const addListeners = async () => {
      // Clear existing listeners to prevent duplicates if the hook re-runs
      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener('registration', async (t: Token) => {
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

          if (error) {
            console.error("Error saving push token to DB:", error);
          } else {
          }
        }
      });

      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ', JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      });

      // Method called when tapping on a notification
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      });

    };

    const registerPush = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          const newStatus = await PushNotifications.requestPermissions();
          if (newStatus.receive !== 'granted') {
            console.warn('User denied push notification permission');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission is not granted:', permStatus.receive);
          return;
        }

        if (Capacitor.getPlatform() === 'android') {
          try {
            await PushNotifications.createChannel({
              id: 'swadeshi_solutions_channel_silent',
              name: 'Swadeshi Solutions Notifications (Silent)',
              description: 'General notifications for orders (No Sound)',
              importance: 3,
              visibility: 1,
            });
          } catch (channelErr) {
            console.error('Error creating push channel', channelErr);
          }
        }

        // Register with Apple / Google to receive push via APNS/FCM
        // We MUST call this AFTER adding listeners to ensure we catch the 'registration' event
        await PushNotifications.register();
      } catch (e) {
        console.error("Failed to register for push notifications:", e);
      }
    };

    // Sequence is critical: Listeners FIRST, then Register
    const init = async () => {
      await addListeners();
      await registerPush();
    };

    init();

    return () => {
      PushNotifications.removeAllListeners();
    };

  }, [user]);

  return { token };
};
