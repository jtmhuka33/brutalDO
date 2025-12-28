// components/PomodoroTimer.tsx
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Alert, AppState, Pressable, ScrollView, Text, View} from "react-native";
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming,} from "react-native-reanimated";
import {Ionicons} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {cancelNotification, scheduleNotification} from "@/utils/notifications";
import {twMerge} from "tailwind-merge";
import {clsx} from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface PomodoroTimerProps {
    selectedTask: string;
    taskId: string;
    onComplete: () => void;
    onCompleteTask: (taskId: string) => void;
}

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes
const TIMER_STORAGE_KEY = "@pomodoro_timer_state";

type TimerState = "work" | "shortBreak" | "longBreak";

interface PersistedTimerState {
    endTime: number;
    timerState: TimerState;
    sessionsCompleted: number;
    taskId: string;
    isRunning: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function PomodoroTimer({
                                          selectedTask,
                                          taskId,
                                          onComplete,
                                          onCompleteTask,
                                      }: PomodoroTimerProps) {
    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [isRunning, setIsRunning] = useState(false);
    const [timerState, setTimerState] = useState<TimerState>("work");
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [notificationId, setNotificationId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const endTimeRef = useRef<number | null>(null);
    const appStateRef = useRef(AppState.currentState);

    // Use refs for values accessed in callbacks to avoid stale closures
    const isRunningRef = useRef(isRunning);
    const timerStateRef = useRef(timerState);
    const sessionsCompletedRef = useRef(sessionsCompleted);

    // Keep refs in sync with state
    useEffect(() => {
        isRunningRef.current = isRunning;
    }, [isRunning]);

    useEffect(() => {
        timerStateRef.current = timerState;
    }, [timerState]);

    useEffect(() => {
        sessionsCompletedRef.current = sessionsCompleted;
    }, [sessionsCompleted]);

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

    // Persist timer state to AsyncStorage
    const persistTimerState = useCallback(async () => {
        if (!isRunningRef.current || !endTimeRef.current) {
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
            return;
        }

        const state: PersistedTimerState = {
            endTime: endTimeRef.current,
            timerState: timerStateRef.current,
            sessionsCompleted: sessionsCompletedRef.current,
            taskId,
            isRunning: true,
        };

        try {
            await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error("Failed to persist timer state:", e);
        }
    }, [taskId]);

    // Load persisted timer state
    const loadPersistedState = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (!stored) return null;

            const state: PersistedTimerState = JSON.parse(stored);

            // Only restore if it's for the same task
            if (state.taskId !== taskId) {
                await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
                return null;
            }

            return state;
        } catch (e) {
            console.error("Failed to load timer state:", e);
            return null;
        }
    }, [taskId]);

    // Clear persisted state
    const clearPersistedState = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
        } catch (e) {
            console.error("Failed to clear timer state:", e);
        }
    }, []);

    // Calculate remaining time from end time
    const calculateRemainingTime = useCallback((): number => {
        if (!endTimeRef.current) return 0;
        return Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    }, []);

    // Handle timer completion
    const handleTimerComplete = useCallback(async () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        endTimeRef.current = null;
        setIsRunning(false);
        await clearPersistedState();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (timerStateRef.current === "work") {
            const newSessionsCompleted = sessionsCompletedRef.current + 1;
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

    // Start the interval timer
    const startInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            const remaining = calculateRemainingTime();

            if (remaining <= 0) {
                handleTimerComplete();
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);
    }, [calculateRemainingTime, handleTimerComplete]);

    // Handle app state changes (background/foreground)
    const handleAppStateChange = useCallback(async (nextAppState: string) => {
        const previousState = appStateRef.current;
        appStateRef.current = nextAppState;

        if (
            previousState.match(/inactive|background/) &&
            nextAppState === "active"
        ) {
            // App came to foreground
            if (isRunningRef.current && endTimeRef.current) {
                const remaining = calculateRemainingTime();

                if (remaining <= 0) {
                    handleTimerComplete();
                } else {
                    setTimeLeft(remaining);
                    startInterval();
                }
            }
        } else if (nextAppState === "background" || nextAppState === "inactive") {
            // App going to background
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            // Persist state for potential app termination
            await persistTimerState();
        }
    }, [calculateRemainingTime, handleTimerComplete, startInterval, persistTimerState]);

    // Set up AppState listener
    useEffect(() => {
        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, [handleAppStateChange]);

    // Initialize timer (check for persisted state)
    useEffect(() => {
        const initialize = async () => {
            const persistedState = await loadPersistedState();

            if (persistedState && persistedState.isRunning) {
                const remaining = Math.max(0, Math.ceil((persistedState.endTime - Date.now()) / 1000));

                if (remaining > 0) {
                    endTimeRef.current = persistedState.endTime;
                    setTimerState(persistedState.timerState);
                    setSessionsCompleted(persistedState.sessionsCompleted);
                    setTimeLeft(remaining);
                    setIsRunning(true);
                    startInterval();
                } else {
                    // Timer would have completed while app was closed
                    await clearPersistedState();
                    setTimerState(persistedState.timerState);
                    setSessionsCompleted(persistedState.sessionsCompleted);
                    handleTimerComplete();
                }
            }

            setIsInitialized(true);
        };

        initialize();
    }, [loadPersistedState, clearPersistedState, startInterval, handleTimerComplete]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (notificationId) cancelNotification(notificationId);
        };
    }, [notificationId]);

    // Update progress bar
    useEffect(() => {
        const totalTime = getTimerDuration(timerState);
        progress.value = withTiming(timeLeft / totalTime, {
            duration: 300,
            easing: Easing.linear,
        });
    }, [timeLeft, timerState, getTimerDuration]);

    const scheduleTimerNotification = useCallback(async (duration: number) => {
        if (notificationId) {
            await cancelNotification(notificationId);
        }

        const finishTime = new Date(Date.now() + duration * 1000);
        const message =
            timerStateRef.current === "work"
                ? `Time for a break!`
                : "Break's over! Ready for the next session?";

        const id = await scheduleNotification(message, finishTime);
        setNotificationId(id);
    }, [notificationId]);

    const startTimer = useCallback(async () => {
        getTimerDuration(timerState);
        endTimeRef.current = Date.now() + timeLeft * 1000;

        setIsRunning(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await scheduleTimerNotification(timeLeft);

        startInterval();
        await persistTimerState();
    }, [timerState, timeLeft, getTimerDuration, scheduleTimerNotification, startInterval, persistTimerState]);

    const pauseTimer = useCallback(async () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const remaining = calculateRemainingTime();
        setTimeLeft(remaining);

        endTimeRef.current = null;
        setIsRunning(false);

        if (notificationId) {
            await cancelNotification(notificationId);
            setNotificationId(null);
        }

        await clearPersistedState();
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [notificationId, calculateRemainingTime, clearPersistedState]);

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
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        if (notificationId) {
                            await cancelNotification(notificationId);
                        }

                        endTimeRef.current = null;
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
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
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