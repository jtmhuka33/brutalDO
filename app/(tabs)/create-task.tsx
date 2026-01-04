import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Alert,
    useColorScheme,
    Platform,
    Keyboard,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, {
    FadeIn,
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

import DatePickerPanel from "@/components/DatePickerPanel";
import SubtaskList from "@/components/SubTaskList";
import PriorityPicker from "@/components/PriorityPicker";
import { Todo, Subtask, Priority, Reminder, getReminders } from "@/types/todo";
import { RecurrencePattern } from "@/types/recurrence";
import { useTodoList } from "@/context/TodoListContext";
import {
    cancelNotification,
    scheduleNotification,
} from "@/utils/notifications";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STORAGE_KEY = "@neo_brutal_todos_v2";
const CARD_COLORS_COUNT = 6;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function CreateTaskScreen() {
    const params = useLocalSearchParams<{ todoId?: string }>();
    const isEditing = !!params.todoId;

    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const { selectedListId } = useTodoList();
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

    const [taskTitle, setTaskTitle] = useState("");
    const [dueDate, setDueDate] = useState<string | undefined>();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [recurrence, setRecurrence] = useState<RecurrencePattern | undefined>();
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [priority, setPriority] = useState<Priority | undefined>();
    const [existingTodo, setExistingTodo] = useState<Todo | null>(null);
    const [isLoading, setIsLoading] = useState(isEditing);

    const createButtonScale = useSharedValue(1);

    const createButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: createButtonScale.value }],
    }));

    useEffect(() => {
        if (params.todoId) {
            loadExistingTodo(params.todoId);
        }
    }, [params.todoId]);

    const loadExistingTodo = async (todoId: string) => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const todos: Todo[] = JSON.parse(stored);
                const todo = todos.find((t) => t.id === todoId);
                if (todo) {
                    setExistingTodo(todo);
                    setTaskTitle(todo.text);
                    setDueDate(todo.dueDate);
                    // Load reminders (with migration from legacy format)
                    setReminders(getReminders(todo));
                    setRecurrence(todo.recurrence);
                    setSubtasks(todo.subtasks || []);
                    setPriority(todo.priority);
                }
            }
        } catch (e) {
            console.error("Failed to load todo:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }, []);

    const handleSetDueDate = useCallback((date: Date) => {
        const newDueDate = new Date(date);
        newDueDate.setHours(23, 59, 59, 999);
        setDueDate(newDueDate.toISOString());
    }, []);

    const handleClearDueDate = useCallback(() => {
        setDueDate(undefined);
    }, []);

    const handleAddReminder = useCallback(async (date: Date) => {
        if (date <= new Date()) {
            Alert.alert("Invalid Time", "Please select a time in the future.", [
                { text: "OK" },
            ]);
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newReminder: Reminder = {
            id: Date.now().toString(),
            date: date.toISOString(),
        };
        setReminders((prev) => [...prev, newReminder]);
    }, []);

    const handleRemoveReminder = useCallback((reminderId: string) => {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    }, []);

    const handleSetRecurrence = useCallback((pattern: RecurrencePattern) => {
        setRecurrence(pattern);
    }, []);

    const handleClearRecurrence = useCallback(() => {
        setRecurrence(undefined);
    }, []);

    const handleSetPriority = useCallback((newPriority: Priority) => {
        setPriority(newPriority === "none" ? undefined : newPriority);
    }, []);

    const handleAddSubtask = useCallback((text: string) => {
        const newSubtask: Subtask = {
            id: Date.now().toString(),
            text,
            completed: false,
        };
        setSubtasks((prev) => [...prev, newSubtask]);
    }, []);

    const handleToggleSubtask = useCallback((subtaskId: string) => {
        setSubtasks((prev) =>
            prev.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
            )
        );
    }, []);

    const handleDeleteSubtask = useCallback((subtaskId: string) => {
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    }, []);

    const handleCreateOrUpdate = useCallback(async () => {
        if (!taskTitle.trim()) {
            Alert.alert("Task Required", "Please enter a task title.", [
                { text: "OK" },
            ]);
            return;
        }

        Keyboard.dismiss();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            let todos: Todo[] = stored ? JSON.parse(stored) : [];

            // Cancel old notifications if editing
            if (existingTodo) {
                // Cancel legacy notification
                if (existingTodo.notificationId) {
                    await cancelNotification(existingTodo.notificationId);
                }
                // Cancel all existing reminder notifications
                const oldReminders = getReminders(existingTodo);
                for (const reminder of oldReminders) {
                    if (reminder.notificationId) {
                        await cancelNotification(reminder.notificationId);
                    }
                }
            }

            // Schedule new notifications for all reminders
            const scheduledReminders: Reminder[] = [];
            for (const reminder of reminders) {
                const reminderDate = new Date(reminder.date);
                if (reminderDate > new Date()) {
                    const notificationId = await scheduleNotification(
                        taskTitle.trim().toUpperCase(),
                        reminderDate
                    );
                    scheduledReminders.push({
                        ...reminder,
                        notificationId,
                    });
                } else {
                    // Keep past reminders but without notification
                    scheduledReminders.push({
                        ...reminder,
                        notificationId: undefined,
                    });
                }
            }

            if (isEditing && existingTodo) {
                todos = todos.map((t) =>
                    t.id === existingTodo.id
                        ? {
                            ...t,
                            text: taskTitle.trim().toUpperCase(),
                            dueDate,
                            // Clear legacy fields
                            reminderDate: undefined,
                            notificationId: undefined,
                            // Use new reminders array
                            reminders: scheduledReminders,
                            recurrence,
                            isRecurring: recurrence?.type !== "none" && !!recurrence,
                            subtasks,
                            priority,
                        }
                        : t
                );
            } else {
                const newTodo: Todo = {
                    id: Date.now().toString(),
                    text: taskTitle.trim().toUpperCase(),
                    completed: false,
                    colorVariant: Math.floor(Math.random() * CARD_COLORS_COUNT),
                    listId: selectedListId,
                    dueDate,
                    reminders: scheduledReminders,
                    recurrence,
                    isRecurring: recurrence?.type !== "none" && !!recurrence,
                    subtasks,
                    priority,
                };
                todos = [newTodo, ...todos];
            }

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)");
            }
        } catch (e) {
            console.error("Failed to save todo:", e);
            Alert.alert("Error", "Failed to save task. Please try again.", [
                { text: "OK" },
            ]);
        }
    }, [
        taskTitle,
        dueDate,
        reminders,
        recurrence,
        subtasks,
        priority,
        isEditing,
        existingTodo,
        selectedListId,
    ]);

    const handleCreateButtonPressIn = useCallback(() => {
        "worklet";
        createButtonScale.value = withTiming(0.95, TIMING_CONFIG);
    }, []);

    const handleCreateButtonPressOut = useCallback(() => {
        "worklet";
        createButtonScale.value = withTiming(1, TIMING_CONFIG);
    }, []);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-neo-bg dark:bg-neo-dark">
                <StatusBar style="auto" />
                <Text className="text-lg font-black uppercase text-gray-500 dark:text-gray-400">
                    Loading...
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-neo-bg dark:bg-neo-dark">
            <StatusBar style="auto" />

            {/* Header */}
            <Animated.View
                entering={FadeIn.duration(300)}
                className="flex-row items-center gap-4 px-6 pt-8 pb-4"
            >
                <Pressable
                    onPress={handleBack}
                    className="h-12 w-12 items-center justify-center border-5 border-black bg-white shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                >
                    <Ionicons name="arrow-back-sharp" size={24} color="#FF0055" />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">
                        {isEditing ? "Edit Task" : "New Task"}
                    </Text>
                </View>
            </Animated.View>

            <KeyboardAwareScrollView
                ref={scrollViewRef}
                className="flex-1 px-6"
                contentContainerStyle={{
                    paddingBottom: Math.max(insets.bottom, 24) + 100,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                enableAutomaticScroll={true}
                extraScrollHeight={Platform.OS === "ios" ? 120 : 80}
                extraHeight={Platform.OS === "ios" ? 120 : 80}
                keyboardOpeningTime={0}
                enableResetScrollToCoords={false}
            >
                {/* Task Title Input */}
                <Animated.View
                    entering={FadeInDown.delay(100).duration(300)}
                    className="mb-6"
                >
                    <Text className="mb-3 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                        Task Title
                    </Text>
                    <TextInput
                        ref={inputRef}
                        value={taskTitle}
                        onChangeText={setTaskTitle}
                        placeholder="WHAT'S THE TASK?!"
                        placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
                        className="border-5 border-black bg-white p-5 font-black text-lg uppercase text-black shadow-brutal dark:border-neo-primary dark:bg-neo-dark-surface dark:text-white dark:shadow-brutal-dark"
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                        autoFocus={!isEditing}
                    />
                </Animated.View>

                {/* Priority Section */}
                <Animated.View
                    entering={FadeInDown.delay(150).duration(300)}
                    className="mb-6"
                >
                    <PriorityPicker
                        priority={priority}
                        onSetPriority={handleSetPriority}
                    />
                </Animated.View>

                {/* Date, Reminder & Recurrence Section */}
                <Animated.View
                    entering={FadeInDown.delay(200).duration(300)}
                    className="mb-6"
                >
                    <DatePickerPanel
                        dueDate={dueDate}
                        reminders={reminders}
                        recurrence={recurrence}
                        onSetDueDate={handleSetDueDate}
                        onClearDueDate={handleClearDueDate}
                        onAddReminder={handleAddReminder}
                        onRemoveReminder={handleRemoveReminder}
                        onSetRecurrence={handleSetRecurrence}
                        onClearRecurrence={handleClearRecurrence}
                    />
                </Animated.View>

                {/* Subtasks Section */}
                <Animated.View
                    entering={FadeInDown.delay(300).duration(300)}
                    className="mb-6 border-5 border-black bg-white p-4 shadow-brutal dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark"
                >
                    <SubtaskList
                        subtasks={subtasks}
                        onAddSubtask={handleAddSubtask}
                        onToggleSubtask={handleToggleSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                    />
                </Animated.View>
            </KeyboardAwareScrollView>

            {/* Create/Update Button - Fixed at bottom */}
            <Animated.View
                entering={FadeIn.delay(400).duration(300)}
                className="absolute bottom-0 left-0 right-0 border-t-5 border-black bg-neo-bg px-6 pb-6 pt-4 dark:border-neo-primary dark:bg-neo-dark"
                style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
            >
                <AnimatedPressable
                    onPress={handleCreateOrUpdate}
                    onPressIn={handleCreateButtonPressIn}
                    onPressOut={handleCreateButtonPressOut}
                    style={createButtonAnimatedStyle}
                    disabled={!taskTitle.trim()}
                    className={cn(
                        "flex-row items-center justify-center gap-3 border-5 border-black p-5 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                        taskTitle.trim()
                            ? "bg-neo-green"
                            : "bg-gray-300 dark:bg-neo-dark-elevated opacity-50"
                    )}
                >
                    <Ionicons
                        name={isEditing ? "save-sharp" : "add-circle-sharp"}
                        size={28}
                        color={taskTitle.trim() ? "black" : "#999"}
                    />
                    <Text
                        className={cn(
                            "text-xl font-black uppercase tracking-tight",
                            taskTitle.trim()
                                ? "text-black"
                                : "text-gray-500 dark:text-gray-400"
                        )}
                    >
                        {isEditing ? "Save Changes" : "Create Task"}
                    </Text>
                </AnimatedPressable>
            </Animated.View>
        </View>
    );
}