import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelNotification, scheduleNotification } from "@/utils/notifications";
import { usePomodoro, PersistedTimerState } from "@/context/PomodoroContext";
import { useSettings } from "@/context/SettingsContext";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { Subtask } from "@/types/todo";
import SubtaskItem from "./SubTaskItem";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface PomodoroTimerProps {
    selectedTask: string;
    taskId: string;
    subtasks: Subtask[];
    onComplete: () => void;
    onCompleteTask: (taskId: string) => void;
    onToggleSubtask: (subtaskId: string) => void;
    onDeleteSubtask: (subtaskId: string) => void;
    onBack: () => void;
}

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
                                          subtasks,
                                          onCompleteTask,
                                          onToggleSubtask,
                                          onDeleteSubtask,
                                          onBack,
                                      }: PomodoroTimerProps) {
    const { settings } = useSettings();
    const pomodoroSettings = settings.pomodoro;

    // Convert minutes to seconds
    const WORK_TIME = pomodoroSettings.workDuration * 60;
    const SHORT_BREAK = pomodoroSettings.shortBreakDuration * 60;
    const LONG_BREAK = pomodoroSettings.longBreakDuration * 60;
    const SESSIONS_BEFORE_LONG_BREAK = pomodoroSettings.sessionsBeforeLongBreak;

    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [isRunning, setIsRunning] = useState(false);
    const [timerState, setTimerState] = useState<TimerState>("work");
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [notificationId, setNotificationId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const [endTime, setEndTime] = useState<number | null>(null);

    const appStateRef = useRef(AppState.currentState);
    const { activeTimer, setActiveTimer, } = usePomodoro();

    const scale = useSharedValue(1);
    const completeButtonScale = useSharedValue(1);
    const skipButtonScale = useSharedValue(1);

    const completeButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: completeButtonScale.value }],
    }));

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const skipButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: skipButtonScale.value }],
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
    }, [WORK_TIME, SHORT_BREAK, LONG_BREAK]);

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

    const loadPersistedState = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (!stored) return null;

            const state: PersistedTimerState = JSON.parse(stored);

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

    const clearPersistedState = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
            setActiveTimer(null);
        } catch (e) {
            console.error("Failed to clear timer state:", e);
        }
    }, [setActiveTimer]);

    const handleTimerComplete = useCallback(async (currentState: TimerState, currentSessions: number) => {
        setEndTime(null);
        setIsRunning(false);
        await clearPersistedState();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (currentState === "work") {
            const newSessionsCompleted = currentSessions + 1;
            setSessionsCompleted(newSessionsCompleted);

            const isLongBreak = newSessionsCompleted % SESSIONS_BEFORE_LONG_BREAK === 0;
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
    }, [getTimerDuration, clearPersistedState, WORK_TIME, SESSIONS_BEFORE_LONG_BREAK]);

    useEffect(() => {
        if (!isRunning || !endTime) {
            return;
        }

        const updateTime = () => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

            if (remaining <= 0) {
                handleTimerComplete(timerState, sessionsCompleted);
            } else {
                setTimeLeft(remaining);
            }

            return remaining;
        };

        const initialRemaining = updateTime();

        if (initialRemaining <= 0) {
            return;
        }

        const intervalId = setInterval(() => {
            const remaining = updateTime();
            if (remaining <= 0) {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [isRunning, endTime, timerState, sessionsCompleted, handleTimerComplete]);

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextAppState;

            if (
                previousState.match(/inactive|background/) &&
                nextAppState === "active"
            ) {
                if (isRunning && endTime) {
                    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                    if (remaining <= 0) {
                        await handleTimerComplete(timerState, sessionsCompleted);
                    } else {
                        setTimeLeft(remaining);
                    }
                }
            } else if (nextAppState === "background" || nextAppState === "inactive") {
                await persistTimerState(isRunning, endTime, timerState, sessionsCompleted, notificationId);
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, [isRunning, endTime, timerState, sessionsCompleted, notificationId, handleTimerComplete, persistTimerState]);

    useEffect(() => {
        const initialize = async () => {
            // First check if there's an active timer
            if (activeTimer && activeTimer.taskId === taskId) {
                try {
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
                        await clearPersistedState();
                        await handleTimerComplete(activeTimer.timerState, activeTimer.sessionsCompleted);
                        setIsInitialized(true);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to load task for active timer:", e);
                }
            }

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
                    await clearPersistedState();
                    setTimerState(persistedState.timerState);
                    setSessionsCompleted(persistedState.sessionsCompleted);
                    await handleTimerComplete(persistedState.timerState, persistedState.sessionsCompleted);
                }
            } else {
                // Initialize with fresh values from settings
                setTimeLeft(WORK_TIME);
            }

            setIsInitialized(true);
        };

        initialize();
    }, []);

    // Update timeLeft when settings change and timer is not running
    useEffect(() => {
        if (isInitialized && !isRunning) {
            setTimeLeft(getTimerDuration(timerState));
        }
    }, [pomodoroSettings, isInitialized, isRunning, timerState, getTimerDuration]);

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

        setEndTime(newEndTime);
        setIsRunning(true);

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const notifId = await scheduleTimerNotification(timeLeft, timerState);
        await persistTimerState(true, newEndTime, timerState, sessionsCompleted, notifId);
    }, [timeLeft, timerState, sessionsCompleted, scheduleTimerNotification, persistTimerState]);

    const pauseTimer = useCallback(async () => {
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
    }, [notificationId, clearPersistedState, WORK_TIME]);

    const skipSession = useCallback(() => {
        const currentStateLabel = timerState === "work"
            ? "focus session"
            : timerState === "shortBreak"
                ? "short break"
                : "long break";

        const nextStateLabel = timerState === "work"
            ? (sessionsCompleted + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? "long break" : "short break"
            : "focus session";

        Alert.alert(
            "Skip Session?",
            `Skip the current ${currentStateLabel} and move to ${nextStateLabel}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Skip",
                    onPress: async () => {
                        // Cancel any pending notification
                        if (notificationId) {
                            await cancelNotification(notificationId);
                            setNotificationId(null);
                        }

                        // Clear running state
                        setEndTime(null);
                        setIsRunning(false);
                        await clearPersistedState();

                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                        // Transition to next state
                        if (timerState === "work") {
                            const newSessionsCompleted = sessionsCompleted + 1;
                            setSessionsCompleted(newSessionsCompleted);

                            const isLongBreak = newSessionsCompleted % SESSIONS_BEFORE_LONG_BREAK === 0;
                            const nextState = isLongBreak ? "longBreak" : "shortBreak";
                            setTimerState(nextState);
                            setTimeLeft(getTimerDuration(nextState));
                        } else {
                            setTimerState("work");
                            setTimeLeft(WORK_TIME);
                        }
                    },
                },
            ]
        );
    }, [timerState, sessionsCompleted, notificationId, clearPersistedState, getTimerDuration, WORK_TIME, SESSIONS_BEFORE_LONG_BREAK]);

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

    const handleSkipButtonPressIn = useCallback(() => {
        'worklet';
        skipButtonScale.value = withTiming(0.95, TIMING_CONFIG);
    }, []);

    const handleSkipButtonPressOut = useCallback(() => {
        'worklet';
        skipButtonScale.value = withTiming(1, TIMING_CONFIG);
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
                return "FOCUS";
            case "shortBreak":
                return "SHORT BREAK";
            case "longBreak":
                return "LONG BREAK";
        }
    };

    const handleMainButtonPress = useCallback(() => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }, [isRunning, pauseTimer, startTimer]);

    const completedSubtasks = subtasks.filter((s) => s.completed).length;
    const totalSubtasks = subtasks.length;

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
            contentContainerStyle={{ gap: 24, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Header with Back Button and Task Title */}
            <View className="flex-row items-center gap-4">
                <Pressable
                    onPress={onBack}
                    className="h-12 w-12 items-center justify-center border-5 border-black bg-white shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                >
                    <Ionicons name="arrow-back-sharp" size={24} color="#FF0055" />
                </Pressable>
                <View className="flex-1 border-5 border-black bg-neo-secondary p-4 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm">
                    <Text className="text-lg font-black uppercase tracking-tight text-black" numberOfLines={2}>
                        {selectedTask}
                    </Text>
                </View>
            </View>

            {/* Subtasks Section */}
            {totalSubtasks > 0 && (
                <View className="border-5 border-black bg-white p-4 shadow-brutal dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                            Subtasks
                        </Text>
                        <View className="flex-row items-center gap-1 border-3 border-black bg-neo-accent px-2 py-1 dark:border-neo-primary">
                            <Text className="text-xs font-black text-black">
                                {completedSubtasks}/{totalSubtasks}
                            </Text>
                        </View>
                    </View>
                    {subtasks.map((subtask, index) => (
                        <SubtaskItem
                            key={subtask.id}
                            subtask={subtask}
                            index={index}
                            onToggle={onToggleSubtask}
                            onDelete={onDeleteSubtask}
                        />
                    ))}
                </View>
            )}

            {/* Timer State Label */}
            <View className={cn(
                "items-center justify-center border-5 border-black py-3 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                getStateColor()
            )}>
                <Text className="text-lg font-black uppercase tracking-widest text-white">
                    {getStateLabel()}
                </Text>
            </View>

            {/* Main Timer Display */}
            <View className={cn(
                "items-center justify-center border-5 border-black p-12 shadow-brutal-lg dark:border-neo-primary dark:shadow-brutal-dark-lg",
                getStateColor()
            )}>
                <Text className="text-7xl font-black tabular-nums tracking-tighter text-white">
                    {formatTime(timeLeft)}
                </Text>
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

            {/* Skip Session Button */}
            <AnimatedPressable
                onPress={skipSession}
                onPressIn={handleSkipButtonPressIn}
                onPressOut={handleSkipButtonPressOut}
                style={skipButtonAnimatedStyle}
                className="flex-row items-center justify-center gap-3 border-5 border-black bg-neo-orange p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
            >
                <Ionicons name="play-skip-forward-sharp" size={24} color="white" />
                <Text className="text-base font-black uppercase tracking-tight text-white">
                    Skip Session
                </Text>
            </AnimatedPressable>

            {/* Complete Task Button */}
            <AnimatedPressable
                onPress={handleCompleteTaskPress}
                onPressIn={handleCompleteButtonPressIn}
                onPressOut={handleCompleteButtonPressOut}
                style={completeButtonAnimatedStyle}
                className="flex-row items-center justify-center gap-3 border-5 border-black bg-neo-green p-5 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
            >
                <Ionicons name="checkmark-done-sharp" size={28} color="black" />
                <Text className="text-lg font-black uppercase tracking-tight text-black">
                    Complete Task
                </Text>
            </AnimatedPressable>

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