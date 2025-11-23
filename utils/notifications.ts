import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import {Platform} from "react-native";

// Configure how notifications should be displayed
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Request notification permissions from the user
 */
export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            console.log("Failed to get push token for push notification!");
            return null;
        }
    } else {
        console.log("Must use physical device for Push Notifications");
    }

    return token;
}

/**
 * Schedule a notification for a specific date/time
 */
export async function scheduleNotification(
    todoText: string,
    reminderDate: Date
): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
        content: {
            title: "Reminder 🔔",
            body: todoText,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
            date: reminderDate,
        },
    });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications (useful for cleanup)
 */
export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications (useful for debugging)
 */
export async function getAllScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
}