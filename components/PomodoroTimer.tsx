import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelNotification, scheduleNotification } from "@/utils/notifications";
import { usePomodoro, PersistedTimerState } from "@/context/PomodoroContext";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface PomodoroTimerProps {
    selectedTask: string;
    taskId: string;
    onComplete: () => void;
    onCompleteTask: (taskId: string) => void;
}

const WORK_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes
const TIMER_STORAGE_KEY = "@pomodoro_timer_state";

type TimerState = "work" | "shortBreak" | "longBreak";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function PomodoroTimer({
                                          selectedTask,
                                          taskId,
                                          onCompleteTask,
                                      }: PomodoroTimerProps) {
    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [isRunning, setIsRunning] = useState(false);
    const [timerState, setTimerState] = useState<TimerState>("work");
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [notificationId, setNotificationId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Store the end time as state instead of ref for reactivity
    const [endTime, setEndTime] = useState<number | null>(null);

    const appStateRef = useRef(AppState.currentState);
    const { activeTimer, setActiveTimer, } = usePomodoro();

    const scale = useSharedValue(1);
    const progress = useSharedValue(1);
    const completeButtonScale = useSharedValue(1);

    const completeButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: completeButtonScale.value }],
    }));

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const getTimerDuration = useCallback((state: TimerState): number => {
        switch (state) {
            case "work":
                return WORK_TIME;
            case "shortBreak":
                return SHORT_BREAK;
            case "longBreak":
                return LONG_BREAK;
        }
    }, []);

    // Persist timer state to AsyncStorage and context
    const persistTimerState = useCallback(async (
        running: boolean,
        end: number | null,
        state: TimerState,
        sessions: number,
        notifId?: string | null
    ) => {
        if (!running || !end) {
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
            setActiveTimer(null);
            return;
        }

        const persistedState: PersistedTimerState = {
            endTime: end,
            timerState: state,
            sessionsCompleted: sessions,
            taskId,
            taskText: selectedTask,
            isRunning: true,
            notificationId: notifId || undefined,
        };

        try {
            await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(persistedState));
            setActiveTimer(persistedState);
        } catch (e) {
            console.error("Failed to persist timer state:", e);
        }
    }, [taskId, selectedTask, setActiveTimer]);

    // Load persisted timer state
    const loadPersistedState = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (!stored) return null;

            const state: PersistedTimerState = JSON.parse(stored);

            // Only restore if it's for the same task
            if (state.taskId !== taskId) {
                await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
                setActiveTimer(null);
                return null;
            }

            return state;
        } catch (e) {
            console.error("Failed to load timer state:", e);
            return null;
        }
    }, [taskId, setActiveTimer]);

    // Clear persisted state
    const clearPersistedState = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
            setActiveTimer(null);
        } catch (e) {
            console.error("Failed to clear timer state:", e);
        }
    }, [setActiveTimer]);

    // Handle timer completion
    const handleTimerComplete = useCallback(async (currentState: TimerState, currentSessions: number) => {
        setEndTime(null);
        setIsRunning(false);
        await clearPersistedState();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (currentState === "work") {
            const newSessionsCompleted = currentSessions + 1;
            setSessionsCompleted(newSessionsCompleted);

            const isLongBreak = newSessionsCompleted % 4 === 0;
            const nextState = isLongBreak ? "longBreak" : "shortBreak";
            setTimerState(nextState);
            setTimeLeft(getTimerDuration(nextState));

            Alert.alert(
                "Great work! 💪",
                `Time for a ${isLongBreak ? "long" : "short"} break!`,
                [{ text: "OK" }]
            );
        } else {
            setTimerState("work");
            setTimeLeft(WORK_TIME);

            Alert.alert(
                "Break's over! ⏰",
                "Ready for the next session?",
                [{ text: "Let's go!" }]
            );
        }
    }, [getTimerDuration, clearPersistedState]);

    useEffect(() => {
        if (!isRunning || !endTime) {
            return;
        }

        // Calculate and update time immediately
        const updateTime = () => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

            if (remaining <= 0) {
                handleTimerComplete(timerState, sessionsCompleted);
            } else {
                setTimeLeft(remaining);
            }

            return remaining;
        };

        // Update immediately
        const initialRemaining = updateTime();

        // Don't set interval if already complete
        if (initialRemaining <= 0) {
            return;
        }

        // Set up interval for subsequent updates
        const intervalId = setInterval(() => {
            const remaining = updateTime();
            if (remaining <= 0) {
                clearInterval(intervalId);
            }
        }, 1000);

        // Cleanup
        return () => {
            clearInterval(intervalId);
        };
    }, [isRunning, endTime, timerState, sessionsCompleted, handleTimerComplete]);

    // Handle app state changes (background/foreground)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: string) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextAppState;

            if (
                previousState.match(/inactive|background/) &&
                nextAppState === "active"
            ) {
                // App came to foreground - the useEffect above will handle updates
                // Just need to recalculate time if we were running
                if (isRunning && endTime) {
                    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                    if (remaining <= 0) {
                        handleTimerComplete(timerState, sessionsCompleted);
                    } else {
                        setTimeLeft(remaining);
                    }
                }
            } else if (nextAppState === "background" || nextAppState === "inactive") {
                // App going to background - persist state
                await persistTimerState(isRunning, endTime, timerState, sessionsCompleted, notificationId);
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, [isRunning, endTime, timerState, sessionsCompleted, notificationId, handleTimerComplete, persistTimerState]);

    // Initialize timer (check for persisted state)
    useEffect(() => {
        const initialize = async () => {
            // First check if we have an active timer from context
            if (activeTimer && activeTimer.taskId === taskId) {
                const remaining = Math.max(0, Math.ceil((activeTimer.endTime - Date.now()) / 1000));

                if (remaining > 0) {
                    setEndTime(activeTimer.endTime);
                    setTimerState(activeTimer.timerState);
                    setSessionsCompleted(activeTimer.sessionsCompleted);
                    setTimeLeft(remaining);
                    setIsRunning(true);
                    if (activeTimer.notificationId) {
                        setNotificationId(activeTimer.notificationId);
                    }
                    setIsInitialized(true);
                    return;
                } else {
                    // Timer would have completed
                    await clearPersistedState();
                    handleTimerComplete(activeTimer.timerState, activeTimer.sessionsCompleted);
                    setIsInitialized(true);
                    return;
                }
            }

            // Fallback to checking AsyncStorage directly
            const persistedState = await loadPersistedState();

            if (persistedState && persistedState.isRunning) {
                const remaining = Math.max(0, Math.ceil((persistedState.endTime - Date.now()) / 1000));

                if (remaining > 0) {
                    setEndTime(persistedState.endTime);
                    setTimerState(persistedState.timerState);
                    setSessionsCompleted(persistedState.sessionsCompleted);
                    setTimeLeft(remaining);
                    setIsRunning(true);
                    if (persistedState.notificationId) {
                        setNotificationId(persistedState.notificationId);
                    }
                } else {
                    // Timer would have completed while app was closed
                    await clearPersistedState();
                    setTimerState(persistedState.timerState);
                    setSessionsCompleted(persistedState.sessionsCompleted);
                    handleTimerComplete(persistedState.timerState, persistedState.sessionsCompleted);
                }
            }

            setIsInitialized(true);
        };

        initialize();
    }, []);

    // Cleanup notification on unmount
    useEffect(() => {
        return () => {
            // Don't cancel notification on unmount if timer is still running
            // The notification should still fire if app is closed
        };
    }, []);

    // Update progress bar
    useEffect(() => {
        const totalTime = getTimerDuration(timerState);
        progress.value = withTiming(timeLeft / totalTime, {
            duration: 300,
            easing: Easing.linear,
        });
    }, [timeLeft, timerState, getTimerDuration]);

    const scheduleTimerNotification = useCallback(async (duration: number, state: TimerState) => {
        if (notificationId) {
            await cancelNotification(notificationId);
        }

        const finishTime = new Date(Date.now() + duration * 1000);
        const message =
            state === "work"
                ? `Time for a break!`
                : "Break's over! Ready for the next session?";

        const id = await scheduleNotification(message, finishTime);
        setNotificationId(id);
        return id;
    }, [notificationId]);

    const startTimer = useCallback(async () => {
        const newEndTime = Date.now() + timeLeft * 1000;

        // Set state synchronously to trigger the useEffect interval
        setEndTime(newEndTime);
        setIsRunning(true);

        // Haptics and notifications can happen async
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const notifId = await scheduleTimerNotification(timeLeft, timerState);
        persistTimerState(true, newEndTime, timerState, sessionsCompleted, notifId);
    }, [timeLeft, timerState, sessionsCompleted, scheduleTimerNotification, persistTimerState]);

    const pauseTimer = useCallback(async () => {
        // Calculate remaining time before stopping
        if (endTime) {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
        }

        setEndTime(null);
        setIsRunning(false);

        if (notificationId) {
            await cancelNotification(notificationId);
            setNotificationId(null);
        }

        await clearPersistedState();
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [endTime, notificationId, clearPersistedState]);

    const resetTimer = useCallback(() => {
        Alert.alert(
            "Reset Timer?",
            "This will reset your current session.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        if (notificationId) {
                            await cancelNotification(notificationId);
                        }

                        setEndTime(null);
                        setIsRunning(false);
                        setTimerState("work");
                        setTimeLeft(WORK_TIME);
                        await clearPersistedState();
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    },
                },
            ]
        );
    }, [notificationId, clearPersistedState]);

    const handleCompleteTaskPress = useCallback(() => {
        Alert.alert(
            "Complete Task?",
            "This will mark the task as done and return to task selection.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Complete",
                    onPress: async () => {
                        if (notificationId) {
                            await cancelNotification(notificationId);
                        }
                        await clearPersistedState();
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onCompleteTask(taskId);
                    },
                },
            ]
        );
    }, [notificationId, onCompleteTask, taskId, clearPersistedState]);

    const handleMainButtonPressIn = useCallback(() => {
        'worklet';
        scale.value = withTiming(0.95, TIMING_CONFIG);
    }, []);

    const handleMainButtonPressOut = useCallback(() => {
        'worklet';
        scale.value = withTiming(1, TIMING_CONFIG);
    }, []);

    const handleCompleteButtonPressIn = useCallback(() => {
        'worklet';
        completeButtonScale.value = withTiming(0.95, TIMING_CONFIG);
    }, []);

    const handleCompleteButtonPressOut = useCallback(() => {
        'worklet';
        completeButtonScale.value = withTiming(1, TIMING_CONFIG);
    }, []);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getStateColor = () => {
        switch (timerState) {
            case "work":
                return "bg-neo-primary";
            case "shortBreak":
                return "bg-neo-green";
            case "longBreak":
                return "bg-neo-purple";
        }
    };

    const getStateLabel = () => {
        switch (timerState) {
            case "work":
                return "Focus Time";
            case "shortBreak":
                return "Short Break";
            case "longBreak":
                return "Long Break";
        }
    };

    const handleMainButtonPress = useCallback(() => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }, [isRunning, pauseTimer, startTimer]);

    // Show loading state while initializing
    if (!isInitialized) {
        return (
            <View className="flex-1 items-center justify-center">
                <Text className="text-lg font-black uppercase text-gray-500 dark:text-gray-400">
                    Loading...
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ gap: 32, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Timer State Label */}
            <View className={cn(
                "items-center justify-center border-5 border-black p-4 shadow-brutal dark:border-neo-primary dark:shadow-brutal-dark",
                getStateColor()
            )}>
                <Text className="text-lg font-black uppercase tracking-widest text-white">
                    {getStateLabel()}
                </Text>
            </View>

            {/* Main Timer Display */}
            <View className="items-center justify-center border-5 border-black bg-neo-accent p-12 shadow-brutal-lg dark:border-neo-primary dark:shadow-brutal-dark-lg">
                <Text className="text-7xl font-black tabular-nums tracking-tighter text-black">
                    {formatTime(timeLeft)}
                </Text>
            </View>

            {/* Progress Bar */}
            <View className="h-8 overflow-hidden border-5 border-black bg-white shadow-brutal-sm dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm">
                <Animated.View
                    style={progressStyle}
                    className={cn("h-full", getStateColor())}
                />
            </View>

            {/* Task Display with Complete Button */}
            <View className="flex-row gap-4">
                <View className="flex-1 border-5 border-black bg-neo-secondary p-4 shadow-brutal dark:border-neo-primary dark:shadow-brutal-dark">
                    <Text className="text-xs font-black uppercase tracking-widest text-black">
                        Current Task
                    </Text>
                    <Text className="mt-2 text-lg font-black uppercase text-black">
                        {selectedTask}
                    </Text>
                </View>

                {/* Complete Task Button */}
                <AnimatedPressable
                    onPress={handleCompleteTaskPress}
                    onPressIn={handleCompleteButtonPressIn}
                    onPressOut={handleCompleteButtonPressOut}
                    style={completeButtonAnimatedStyle}
                    className="items-center justify-center border-5 border-black bg-neo-green p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
                >
                    <Ionicons name="checkmark-done-sharp" size={28} color="black" />
                    <Text className="mt-1 text-xs font-black uppercase tracking-tight text-black">
                        Done
                    </Text>
                </AnimatedPressable>
            </View>

            {/* Controls */}
            <View className="flex-row gap-4">
                <AnimatedPressable
                    onPress={handleMainButtonPress}
                    onPressIn={handleMainButtonPressIn}
                    onPressOut={handleMainButtonPressOut}
                    style={animatedStyle}
                    className="flex-1 items-center justify-center border-5 border-black bg-neo-primary p-6 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
                >
                    <Ionicons
                        name={isRunning ? "pause-sharp" : "play-sharp"}
                        size={36}
                        color="white"
                    />
                    <Text className="mt-2 text-base font-black uppercase tracking-tight text-white">
                        {isRunning ? "PAUSE" : "START"}
                    </Text>
                </AnimatedPressable>

                <Pressable
                    onPress={resetTimer}
                    className="items-center justify-center border-5 border-black bg-white p-6 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark"
                >
                    <Ionicons name="refresh-sharp" size={36} color="#FF0055" />
                    <Text className="mt-2 text-base font-black uppercase tracking-tight text-black dark:text-white">
                        RESET
                    </Text>
                </Pressable>
            </View>

            {/* Sessions Counter */}
            <View className="flex-row items-center justify-center gap-2 border-5 border-dashed border-gray-400 p-4 dark:border-neo-primary">
                <Ionicons name="flame-sharp" size={20} color="#FF6B00" />
                <Text className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    Sessions: {sessionsCompleted}
                </Text>
            </View>
        </ScrollView>
    );
}