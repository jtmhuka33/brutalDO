import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
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

interface PomodoroContextType {
    activeTimer: PersistedTimerState | null;
    isCheckingTimer: boolean;
    clearActiveTimer: () => Promise<void>;
    setActiveTimer: (state: PersistedTimerState | null) => void;
    checkAndResumeTimer: () => Promise<boolean>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const [activeTimer, setActiveTimer] = useState<PersistedTimerState | null>(null);
    const [isCheckingTimer, setIsCheckingTimer] = useState(true);

    const clearActiveTimer = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (stored) {
                const state: PersistedTimerState = JSON.parse(stored);
                // Cancel any scheduled notification
                if (state.notificationId) {
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
                await clearActiveTimer();
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
        checkAndResumeTimer()
    }, []);

    return (
        <PomodoroContext.Provider
            value={{
                activeTimer,
                isCheckingTimer,
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