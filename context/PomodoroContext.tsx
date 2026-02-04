import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { cancelNotification } from "@/utils/notifications";

const TIMER_STORAGE_KEY = "@pomodoro_timer_state";
const TODO_STORAGE_KEY = "@neo_brutal_todos_v2";

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

    const checkAndResumeTimer = useCallback(async (): Promise<boolean> => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (!stored) {
                setIsCheckingTimer(false);
                return false;
            }

            const state: PersistedTimerState = JSON.parse(stored);

            // Check if the task still exists
            const todosStored = await AsyncStorage.getItem(TODO_STORAGE_KEY);
            if (todosStored) {
                const todos = JSON.parse(todosStored);
                const taskExists = todos.some((t: any) => t.id === state.taskId && !t.archivedAt);

                if (!taskExists) {
                    // Task was deleted or archived, clear the timer
                    await clearActiveTimer();
                    setIsCheckingTimer(false);
                    return false;
                }
            }

            const remaining = Math.ceil((state.endTime - Date.now()) / 1000);

            if (remaining <= 0) {
                // Timer completed while app was closed
                // Don't cancel notification - let it show so user can tap it
                await clearActiveTimer(false);
                setIsCheckingTimer(false);

                // Show completion message after a short delay to ensure UI is ready
                setTimeout(() => {
                    const message = state.timerState === "work"
                        ? "Your focus session completed! Time for a break."
                        : "Your break is over! Ready for the next session?";

                    Alert.alert(
                        "Timer Completed! ⏰",
                        message,
                        [{ text: "Got it!" }]
                    );
                }, 500);

                return false;
            }

            // Timer is still active, set the state
            setActiveTimer(state);
            setIsCheckingTimer(false);
            return true;
        } catch (e) {
            console.error("Failed to check timer state:", e);
            setIsCheckingTimer(false);
            return false;
        }
    }, [clearActiveTimer]);

    useEffect(() => {
        const initialize = async () => {
            // First, check for initial notification that launched the app
            const lastResponse = await Notifications.getLastNotificationResponseAsync();
            if (lastResponse) {
                const data = lastResponse.notification.request.content.data as Record<string, unknown>;
                if (data?.type === "pomodoro" && data?.taskId) {
                    // Clear any stale timer state since timer has completed
                    await clearActiveTimer();
                    setInitialNotification({
                        taskId: data.taskId as string,
                        initialTimerState: data.nextTimerState as string,
                        initialSessionsCompleted: data.sessionsCompleted as number,
                    });
                    setIsCheckingTimer(false);
                    return;
                }
            }

            // No notification launched the app - check for active timer to resume
            await checkAndResumeTimer();
        };

        initialize();

        // Set up listener for notifications while app is running
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as Record<string, unknown>;
            if (data?.type === "pomodoro" && data?.taskId) {
                setInitialNotification({
                    taskId: data.taskId as string,
                    initialTimerState: data.nextTimerState as string,
                    initialSessionsCompleted: data.sessionsCompleted as number,
                });
            }
        });

        return () => {
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

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