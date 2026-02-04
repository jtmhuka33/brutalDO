import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import {Platform} from "react-native";

// Configure how notifications should be displayed
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions from the user
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
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
            return false;
        }

        return true;
    } else {
        console.log("Must use physical device for Push Notifications");
        return false;
    }
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
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
        },
    });
}

export type PomodoroTimerState = "work" | "shortBreak" | "longBreak";

export interface PomodoroNotificationData {
    type: "pomodoro";
    taskId: string;
    nextTimerState: PomodoroTimerState;
    sessionsCompleted: number;
    [key: string]: unknown; // Allow index signature for Record<string, unknown> compatibility
}

/**
 * Schedule a pomodoro notification with task data for deep linking
 */
export async function schedulePomodoroNotification(
    message: string,
    triggerDate: Date,
    taskId: string,
    nextTimerState: PomodoroTimerState,
    sessionsCompleted: number
): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
        content: {
            title: "Pomodoro Timer ⏱️",
            body: message,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
                type: "pomodoro",
                taskId,
                nextTimerState,
                sessionsCompleted,
            } as PomodoroNotificationData,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
        },
    });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}