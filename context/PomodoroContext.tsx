import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { cancelNotification, cancelAllPomodoroNotifications } from "@/utils/notifications";

const TIMER_STORAGE_KEY = "@pomodoro_timer_state";

export type TimerState = "work" | "shortBreak" | "longBreak";

export interface PersistedTimerState {
    endTime: number;
    timerState: TimerState;
    sessionsCompleted: number;
    taskId: string;
    taskText: string;
    isRunning: boolean;
    notificationId?: string;
}

export interface InitialNotificationData {
    notificationId: string;
    taskId: string;
    initialTimerState: string;
    initialSessionsCompleted: number;
}

interface PomodoroContextType {
    activeTimer: PersistedTimerState | null;
    isCheckingTimer: boolean;
    initialNotification: InitialNotificationData | null;
    clearInitialNotification: () => void;
    clearActiveTimer: (cancelScheduledNotification?: boolean) => Promise<void>;
    setActiveTimer: (state: PersistedTimerState | null) => void;
    checkAndResumeTimer: () => Promise<boolean>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const [activeTimer, setActiveTimer] = useState<PersistedTimerState | null>(null);
    const [isCheckingTimer, setIsCheckingTimer] = useState(true);
    const [initialNotification, setInitialNotification] = useState<InitialNotificationData | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const lastHandledNotificationRef = useRef<string | null>(null);
    const hasInitializedRef = useRef(false);

    const clearInitialNotification = useCallback(() => {
        setInitialNotification(null);
    }, []);

    const clearActiveTimer = useCallback(async (cancelScheduledNotification: boolean = true) => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (stored) {
                const state: PersistedTimerState = JSON.parse(stored);
                // Only cancel notification if explicitly requested
                // Don't cancel when timer naturally expires - let the notification show
                if (cancelScheduledNotification && state.notificationId) {
                    await cancelNotification(state.notificationId);
                }
            }
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
            setActiveTimer(null);
        } catch (e) {
            console.error("Failed to clear timer state:", e);
        }
    }, []);

    const clearTimerOnStartup = useCallback(async (): Promise<void> => {
        try {
            // Clear any persisted timer state - timer should not survive app kill
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
            setActiveTimer(null);

            // Cancel all pomodoro notifications that may have been scheduled
            await cancelAllPomodoroNotifications();

            setIsCheckingTimer(false);
        } catch (e) {
            console.error("Failed to clear timer state on startup:", e);
            setIsCheckingTimer(false);
        }
    }, []);

    // Keep checkAndResumeTimer for API compatibility but it now just clears state
    const checkAndResumeTimer = useCallback(async (): Promise<boolean> => {
        await clearTimerOnStartup();
        return false;
    }, [clearTimerOnStartup]);

    // Helper to handle notification response
    const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
        const notificationId = response.notification.request.identifier;

        // Avoid handling the same notification twice
        if (lastHandledNotificationRef.current === notificationId) {
            return;
        }

        const data = response.notification.request.content.data as Record<string, unknown>;
        if (data?.type === "pomodoro" && data?.taskId) {
            lastHandledNotificationRef.current = notificationId;
            setInitialNotification({
                notificationId,
                taskId: data.taskId as string,
                initialTimerState: data.nextTimerState as string,
                initialSessionsCompleted: data.sessionsCompleted as number,
            });
        }
    }, []);

    useEffect(() => {
        const initialize = async () => {
            // Prevent double initialization (React Strict Mode, etc.)
            if (hasInitializedRef.current) {
                return;
            }
            hasInitializedRef.current = true;

            // First, check for notification that launched the app (cold start)
            const lastResponse = await Notifications.getLastNotificationResponseAsync();
            if (lastResponse) {
                handleNotificationResponse(lastResponse);
            }

            // Clear any persisted timer state and notifications on app startup
            // Timer should not survive app kill
            await clearTimerOnStartup();
        };

        initialize();

        // Set up listener for notifications while app is running
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            handleNotificationResponse(response);
        });

        // Also check for notification responses when app comes back from background
        // This handles cases where the listener might miss the response
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === "active"
            ) {
                // App came to foreground - check for any pending notification response
                const lastResponse = await Notifications.getLastNotificationResponseAsync();
                if (lastResponse) {
                    handleNotificationResponse(lastResponse);
                }
            }
            appStateRef.current = nextAppState;
        };

        const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            if (responseListener.current) {
                responseListener.current.remove();
            }
            appStateSubscription.remove();
        };
    }, [handleNotificationResponse]);

    return (
        <PomodoroContext.Provider
            value={{
                activeTimer,
                isCheckingTimer,
                initialNotification,
                clearInitialNotification,
                clearActiveTimer,
                setActiveTimer,
                checkAndResumeTimer,
            }}
        >
            {children}
        </PomodoroContext.Provider>
    );
}

export function usePomodoro() {
    const context = useContext(PomodoroContext);
    if (!context) {
        throw new Error("usePomodoro must be used within a PomodoroProvider");
    }
    return context;
}