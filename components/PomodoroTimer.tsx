// components/PomodoroTimer.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, AppState, Alert, ScrollView } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { scheduleNotification, cancelNotification } from "@/utils/notifications";
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

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

type TimerState = "work" | "shortBreak" | "longBreak";

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

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const appState = useRef(AppState.currentState);

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

    const handleAppStateChange = useCallback(async (nextAppState: string) => {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === "active"
        ) {
            // App came to foreground - recalculate time
            if (isRunning && startTimeRef.current) {
                const now = Date.now();
                const elapsed = Math.floor((now - startTimeRef.current) / 1000);
                const newTimeLeft = Math.max(0, timeLeft - elapsed);

                if (newTimeLeft > 0) {
                    setTimeLeft(newTimeLeft);
                    startTimeRef.current = now;
                }
            }
        }

        appState.current = nextAppState;
    }, [isRunning, timeLeft]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, [handleAppStateChange]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (notificationId) cancelNotification(notificationId);
        };
    }, [notificationId]);

    useEffect(() => {
        const totalTime = getTimerDuration(timerState);
        progress.value = withTiming(timeLeft / totalTime, {
            duration: 300,
            easing: Easing.linear,
        });
    }, [timeLeft, timerState, getTimerDuration]);

    const scheduleTimerNotification = useCallback(async () => {
        if (notificationId) {
            await cancelNotification(notificationId);
        }

        const finishTime = new Date(Date.now() + timeLeft * 1000);
        const message =
            timerState === "work"
                ? `Time for a break!`
                : "Break's over! Ready for the next session?";

        const id = await scheduleNotification(message, finishTime);
        setNotificationId(id);
    }, [notificationId, timeLeft, timerState]);

    const handleTimerComplete = useCallback(async () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setIsRunning(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (timerState === "work") {
            // Work session completed
            const newSessionsCompleted = sessionsCompleted + 1;
            setSessionsCompleted(newSessionsCompleted);

            // Every 4th session gets a long break
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
            // Break completed - start next work session
            setTimerState("work");
            setTimeLeft(WORK_TIME);

            Alert.alert(
                "Break's over! ⏰",
                "Ready for the next session?",
                [{ text: "Let's go!" }]
            );
        }
    }, [timerState, sessionsCompleted, getTimerDuration]);

    const startTimer = useCallback(async () => {
        setIsRunning(true);
        startTimeRef.current = Date.now();
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (appState.current !== "active") {
            await scheduleTimerNotification();
        }

        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimerComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [scheduleTimerNotification, handleTimerComplete]);

    const pauseTimer = useCallback(async () => {
        setIsRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (notificationId) {
            await cancelNotification(notificationId);
            setNotificationId(null);
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [notificationId]);

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
                        setIsRunning(false);
                        setTimerState("work");
                        setTimeLeft(WORK_TIME);
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    },
                },
            ]
        );
    }, [notificationId]);

    const handleCompleteTaskPress = useCallback(() => {
        Alert.alert(
            "Complete Task?",
            "This will mark the task as done and return to task selection.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Complete",
                    onPress: async () => {
                        // Stop timer if running
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        if (notificationId) {
                            await cancelNotification(notificationId);
                        }
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onCompleteTask(taskId);
                    },
                },
            ]
        );
    }, [notificationId, onCompleteTask, taskId]);

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
        </ScrollView>
    );
}