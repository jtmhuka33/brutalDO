import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PomodoroTimer from "@/components/PomodoroTimer";
import { Todo } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STORAGE_KEY = "@neo_brutal_todos_v2";

export default function ZenMode() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [sessionCount, setSessionCount] = useState(4);
    const [timerStarted, setTimerStarted] = useState(false);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadTodos();
    }, []);

    const loadTodos = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allTodos: Todo[] = JSON.parse(stored);
                // Only show incomplete tasks
                setTodos(allTodos.filter((t) => !t.completed));
            }
        } catch (e) {
            console.error("Failed to load todos");
        }
    };

    const handleTaskSelect = async (task: string) => {
        setSelectedTask(task);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSessionChange = async (increment: boolean) => {
        setSessionCount((prev) => {
            const newCount = increment ? prev + 1 : prev - 1;
            return Math.max(1, Math.min(12, newCount));
        });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleStartZen = async () => {
        if (!selectedTask) return;
        setTimerStarted(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleComplete = async () => {
        setTimerStarted(false);
        setSelectedTask(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleBack = () => {
        router.back();
    };

    if (timerStarted && selectedTask) {
        return (
            <View className="flex-1 bg-neo-bg px-6 pt-20 dark:bg-neo-dark">
                <StatusBar style="auto" />

                {/* Back Button */}
                <Pressable
                    onPress={handleBack}
                    className="mb-8 self-start border-5 border-black bg-white p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                >
                    <Ionicons name="arrow-back-sharp" size={24} color="#FF0055" />
                </Pressable>

                <PomodoroTimer
                    selectedTask={selectedTask}
                    totalSessions={sessionCount}
                    onComplete={handleComplete}
                />
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 bg-neo-bg dark:bg-neo-dark">
                <StatusBar style="auto" />

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 80,
                        paddingBottom: Math.max(insets.bottom, 24) + 24
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="mb-10 flex-row items-center justify-between">
                        <Pressable
                            onPress={handleBack}
                            className="border-5 border-black bg-white p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                        >
                            <Ionicons name="arrow-back-sharp" size={24} color="#FF0055" />
                        </Pressable>

                        <View className="flex-row items-center gap-3">
                            <Text className="text-4xl font-black uppercase tracking-tighter text-black dark:text-white">
                                Zen Mode
                            </Text>
                            <Ionicons name="leaf-sharp" size={32} color="#FF0055" />
                        </View>
                    </View>

                    {/* Description */}
                    <Animated.View
                        entering={FadeIn.delay(100).duration(400)}
                        className="mb-8 border-5 border-black bg-neo-secondary p-4 shadow-brutal dark:border-neo-primary dark:shadow-brutal-dark"
                    >
                        <Text className="text-base font-black uppercase text-black">
                            Focus deeply on one task using the Pomodoro Technique
                        </Text>
                    </Animated.View>

                    {/* Session Counter */}
                    <Animated.View
                        entering={FadeIn.delay(200).duration(400)}
                        className="mb-8"
                    >
                        <Text className="mb-4 text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                            Number of Sessions
                        </Text>

                        <View className="flex-row items-center gap-4">
                            <Pressable
                                onPress={() => handleSessionChange(false)}
                                disabled={sessionCount <= 1}
                                className={cn(
                                    "h-16 w-16 items-center justify-center border-5 border-black shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                    sessionCount <= 1
                                        ? "bg-gray-300 dark:bg-neo-dark-surface"
                                        : "bg-neo-primary"
                                )}
                            >
                                <Ionicons
                                    name="remove-sharp"
                                    size={32}
                                    color={sessionCount <= 1 ? "gray" : "white"}
                                />
                            </Pressable>

                            <View className="flex-1 items-center justify-center border-5 border-black bg-neo-accent p-4 shadow-brutal dark:border-neo-primary dark:shadow-brutal-dark">
                                <Text className="text-5xl font-black tabular-nums text-black">
                                    {sessionCount}
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => handleSessionChange(true)}
                                disabled={sessionCount >= 12}
                                className={cn(
                                    "h-16 w-16 items-center justify-center border-5 border-black shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                    sessionCount >= 12
                                        ? "bg-gray-300 dark:bg-neo-dark-surface"
                                        : "bg-neo-primary"
                                )}
                            >
                                <Ionicons
                                    name="add-sharp"
                                    size={32}
                                    color={sessionCount >= 12 ? "gray" : "white"}
                                />
                            </Pressable>
                        </View>

                        <Text className="mt-3 text-center text-xs font-black uppercase text-gray-600 dark:text-gray-400">
                            {sessionCount * 25} minutes of focus time
                        </Text>
                    </Animated.View>

                    {/* Task Selection */}
                    <Animated.View
                        entering={FadeIn.delay(300).duration(400)}
                        className="mb-8"
                    >
                        <Text className="mb-4 text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                            Select a Task
                        </Text>

                        {todos.length === 0 ? (
                            <View className="items-center justify-center border-5 border-dashed border-gray-400 p-12 dark:border-neo-primary">
                                <Ionicons name="checkbox-outline" size={48} color="gray" />
                                <Text className="mt-4 text-center text-lg font-black uppercase text-gray-500 dark:text-gray-400">
                                    No tasks available
                                </Text>
                                <Text className="mt-2 text-center text-sm font-black uppercase text-gray-500 dark:text-gray-500">
                                    Go back and add some!
                                </Text>
                            </View>
                        ) : (
                            <View className="gap-4">
                                {todos.map((todo, index) => (
                                    <Pressable
                                        key={todo.id}
                                        onPress={() => handleTaskSelect(todo.text)}
                                        className={cn(
                                            "border-5 border-black p-5 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                            selectedTask === todo.text
                                                ? "bg-neo-primary"
                                                : "bg-white dark:bg-neo-dark-surface",
                                            index % 3 === 0 && "-rotate-1",
                                            index % 3 === 1 && "rotate-1"
                                        )}
                                    >
                                        <View className="flex-row items-center gap-4">
                                            <View
                                                className={cn(
                                                    "h-8 w-8 items-center justify-center border-4 border-black dark:border-neo-primary",
                                                    selectedTask === todo.text
                                                        ? "bg-white dark:bg-neo-dark-surface"
                                                        : "bg-white dark:bg-neo-dark-surface"
                                                )}
                                            >
                                                {selectedTask === todo.text && (
                                                    <Ionicons
                                                        name="checkmark-sharp"
                                                        size={20}
                                                        color="#FF0055"
                                                    />
                                                )}
                                            </View>
                                            <Text
                                                className={cn(
                                                    "flex-1 text-lg font-black uppercase tracking-tight",
                                                    selectedTask === todo.text
                                                        ? "text-white"
                                                        : "text-black dark:text-white"
                                                )}
                                            >
                                                {todo.text}
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </Animated.View>

                    {/* Start Button */}
                    <Animated.View entering={FadeIn.delay(400).duration(400)}>
                        <Pressable
                            onPress={handleStartZen}
                            disabled={!selectedTask}
                            className={cn(
                                "items-center justify-center border-5 border-black p-8 shadow-brutal-lg active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-lg",
                                selectedTask
                                    ? "bg-neo-primary"
                                    : "bg-gray-300 dark:bg-neo-dark-surface"
                            )}
                        >
                            <Text
                                className={cn(
                                    "text-3xl font-black uppercase tracking-tight",
                                    selectedTask ? "text-white" : "text-gray-500"
                                )}
                            >
                                Start Zen Mode
                            </Text>
                            {selectedTask && (
                                <Text className="mt-2 text-sm font-black uppercase text-white">
                                    Let's focus! 🧘
                                </Text>
                            )}
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </View>
        </TouchableWithoutFeedback>
    );
}