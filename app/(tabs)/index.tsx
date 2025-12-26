// app/(tabs)/index.tsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ZenModeButton from "@/components/ZenModeButton";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
    Keyboard,
    TouchableWithoutFeedback,
    Alert,
    Pressable,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
    Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import TodoItem from "@/components/TodoItem";
import ArchiveButton from "@/components/ArchiveButton";
import ArchiveModal from "@/components/ArchiveModal";
import { Todo, SortType } from "@/types/todo";
import { RecurrencePattern } from "@/types/recurrence";
import { DEFAULT_LIST_ID } from "@/types/todoList";
import { useTodoList } from "@/context/TodoListContext";
import {
    registerForPushNotificationsAsync,
    scheduleNotification,
    cancelNotification,
} from "@/utils/notifications";
import { createNextRecurringTodo, isRecurrenceActive } from "@/utils/recurrence";
import SortSelector from "@/components/SortSelector";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STORAGE_KEY = "@neo_brutal_todos_v2";
const SORT_STORAGE_KEY = "@neo_brutal_sort_v1";
const CARD_COLORS_COUNT = 6;

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

const AnimatedTouchableOpacity =
    Animated.createAnimatedComponent(TouchableOpacity);

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortType>("DEFAULT");
    const [showArchive, setShowArchive] = useState(false);
    const colorScheme = useColorScheme();
    const notificationListener = useRef<Notifications.EventSubscription>();
    const responseListener = useRef<Notifications.EventSubscription>();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const { selectedListId, selectedList } = useTodoList();

    const buttonScale = useSharedValue(1);
    const menuScale = useSharedValue(1);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const menuAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: menuScale.value }],
    }));

    // Initialize notifications
    useEffect(() => {
        registerForPushNotificationsAsync();

        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                console.log("Notification received:", notification);
            });

        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                console.log("Notification tapped:", response);
            });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const loadTodos = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setTodos(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to load todos");
        }
    }, []);

    const loadSortPreference = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(SORT_STORAGE_KEY);
            if (stored) setSortBy(stored as SortType);
        } catch (e) {
            console.error("Failed to load sort preference");
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadTodos();
            loadSortPreference();
        }, [loadTodos, loadSortPreference])
    );

    useEffect(() => {
        saveTodos(todos);
    }, [todos]);

    const saveTodos = async (newTodos: Todo[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
        } catch (e) {
            console.error("Failed to save todos");
        }
    };

    const handleSortChange = useCallback(async (newSort: SortType) => {
        setSortBy(newSort);
        try {
            await AsyncStorage.setItem(SORT_STORAGE_KEY, newSort);
        } catch (e) {
            console.error("Failed to save sort preference");
        }
    }, []);

    const handleOpenDrawer = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        menuScale.value = withTiming(0.9, TIMING_CONFIG, () => {
            menuScale.value = withTiming(1, TIMING_CONFIG);
        });
        navigation.dispatch(DrawerActions.openDrawer());
    }, [navigation]);

    const handleAddOrUpdate = useCallback(() => {
        if (!text.trim()) return;

        Keyboard.dismiss();

        buttonScale.value = withTiming(0.9, TIMING_CONFIG, () => {
            buttonScale.value = withTiming(1, TIMING_CONFIG);
        });

        if (editingId) {
            setTodos((prev) =>
                prev.map((t) =>
                    t.id === editingId ? { ...t, text: text.trim() } : t
                )
            );
            setEditingId(null);
        } else {
            const newTodo: Todo = {
                id: Date.now().toString(),
                text: text.trim(),
                completed: false,
                colorVariant: Math.floor(Math.random() * CARD_COLORS_COUNT),
                listId: selectedListId,
            };
            setTodos((prev) => [newTodo, ...prev]);
        }
        setText("");
    }, [text, editingId, selectedListId]);

    // Archive a task (complete and move to archive)
    const archiveTodo = useCallback(
        async (id: string) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo) return;

            // If this is a recurring task, create the next occurrence
            if (!todo.completed && isRecurrenceActive(todo.recurrence)) {
                const nextTodo = createNextRecurringTodo(
                    todo,
                    Math.floor(Math.random() * CARD_COLORS_COUNT)
                );

                if (nextTodo) {
                    await Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                    );

                    setTodos((prev) => {
                        const updated = prev.map((t) =>
                            t.id === id
                                ? { ...t, completed: true, archivedAt: new Date().toISOString() }
                                : t
                        );
                        return [nextTodo, ...updated];
                    });

                    Alert.alert(
                        "Task Completed! 🎉",
                        `Next "${todo.text}" scheduled for ${new Date(
                            nextTodo.dueDate!
                        ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                        })}`,
                        [{ text: "Got it!" }]
                    );
                    return;
                }
            }

            // Normal archive
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTodos((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? { ...t, completed: true, archivedAt: new Date().toISOString() }
                        : t
                )
            );
        },
        [todos]
    );

    // Restore a task from archive
    const restoreTodo = useCallback(async (id: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id
                    ? { ...t, completed: false, archivedAt: undefined }
                    : t
            )
        );
    }, []);

    const deleteTodo = useCallback(
        async (id: string) => {
            const todo = todos.find((t) => t.id === id);

            if (todo?.notificationId) {
                await cancelNotification(todo.notificationId);
            }

            setTodos((prev) => prev.filter((t) => t.id !== id));
        },
        [todos]
    );

    // Clear all archived items
    const clearAllArchived = useCallback(() => {
        setTodos((prev) => prev.filter((t) => !t.archivedAt));
    }, []);

    const startEditing = useCallback((todo: Todo) => {
        setText(todo.text);
        setEditingId(todo.id);
    }, []);

    const handleSetReminder = useCallback(
        async (id: string, date: Date) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo) return;

            if (date <= new Date()) {
                Alert.alert("Invalid Time", "Please select a time in the future.", [
                    { text: "OK" },
                ]);
                return;
            }

            if (todo.notificationId) {
                await cancelNotification(todo.notificationId);
            }

            const notificationId = await scheduleNotification(todo.text, date);

            setTodos((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                            ...t,
                            reminderDate: date.toISOString(),
                            notificationId,
                        }
                        : t
                )
            );
        },
        [todos]
    );

    const handleClearReminder = useCallback(
        async (id: string) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo || !todo.notificationId) return;

            await cancelNotification(todo.notificationId);

            setTodos((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                            ...t,
                            reminderDate: undefined,
                            notificationId: undefined,
                        }
                        : t
                )
            );
        },
        [todos]
    );

    const handleSetDueDate = useCallback((id: string, date: Date) => {
        const dueDate = new Date(date);
        dueDate.setHours(23, 59, 59, 999);

        setTodos((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                        ...t,
                        dueDate: dueDate.toISOString(),
                    }
                    : t
            )
        );
    }, []);

    const handleClearDueDate = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                        ...t,
                        dueDate: undefined,
                    }
                    : t
            )
        );
    }, []);

    const handleSetRecurrence = useCallback(
        (id: string, pattern: RecurrencePattern) => {
            setTodos((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                            ...t,
                            recurrence: pattern,
                            isRecurring: pattern.type !== "none",
                        }
                        : t
                )
            );
        },
        []
    );

    const handleClearRecurrence = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                        ...t,
                        recurrence: undefined,
                        isRecurring: false,
                    }
                    : t
            )
        );
    }, []);

    // Helper function to get date priority for sorting
    const getDatePriority = (todo: Todo): number => {
        if (!todo.dueDate) return 4; // No due date - lowest priority

        const dueDate = new Date(todo.dueDate);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        const diffDays = Math.floor((dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 0; // Overdue - highest priority
        if (diffDays === 0) return 1; // Today
        if (diffDays === 1) return 2; // Tomorrow
        return 3; // Future
    };

    // Filter and sort todos
    const { activeTodos, archivedTodos } = useMemo(() => {
        // Filter by list
        const listFiltered = todos.filter((t) => {
            const todoListId = t.listId || DEFAULT_LIST_ID;
            return todoListId === selectedListId;
        });

        // Separate active and archived
        const active = listFiltered.filter((t) => !t.archivedAt);
        const archived = listFiltered.filter((t) => t.archivedAt);

        // Sort active todos
        const sortedActive = active.sort((a, b) => {
            switch (sortBy) {
                case "ALPHA_ASC":
                    return a.text.localeCompare(b.text, undefined, { sensitivity: "base" });

                case "ALPHA_DESC":
                    return b.text.localeCompare(a.text, undefined, { sensitivity: "base" });

                case "DUE_ASC":
                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    return parseInt(b.id) - parseInt(a.id);

                case "DUE_DESC":
                    if (a.dueDate && b.dueDate) {
                        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    return parseInt(b.id) - parseInt(a.id);

                case "DEFAULT":
                default:
                    // Smart sorting: Overdue > Today > Tomorrow > Future > No date
                    const priorityA = getDatePriority(a);
                    const priorityB = getDatePriority(b);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    // Within same priority, sort by actual date
                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }

                    // If no due dates, sort by creation (newest first)
                    return parseInt(b.id) - parseInt(a.id);
            }
        });

        return {
            activeTodos: sortedActive,
            archivedTodos: archived,
        };
    }, [todos, selectedListId, sortBy]);

    const renderTodoItem = useCallback(
        ({ item, index }: { item: Todo; index: number }) => (
            <TodoItem
                item={item}
                index={index}
                onToggle={archiveTodo}
                onEdit={startEditing}
                onDelete={deleteTodo}
                onSetReminder={handleSetReminder}
                onClearReminder={handleClearReminder}
                onSetDueDate={handleSetDueDate}
                onClearDueDate={handleClearDueDate}
                onSetRecurrence={handleSetRecurrence}
                onClearRecurrence={handleClearRecurrence}
            />
        ),
        [
            archiveTodo,
            startEditing,
            deleteTodo,
            handleSetReminder,
            handleClearReminder,
            handleSetDueDate,
            handleClearDueDate,
            handleSetRecurrence,
            handleClearRecurrence,
        ]
    );

    const keyExtractor = useCallback((item: Todo) => item.id, []);

    const ListFooterComponent = useMemo(() => {
        if (archivedTodos.length === 0) return null;
        return (
            <View className="mt-4">
                <ArchiveButton
                    count={archivedTodos.length}
                    onPress={() => setShowArchive(true)}
                />
            </View>
        );
    }, [archivedTodos.length]);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 bg-neo-bg px-6 pt-8 dark:bg-neo-dark">
                <StatusBar style="auto" />

                {/* Header with Menu Button */}
                <Animated.View
                    entering={FadeIn.duration(300).easing(Easing.out(Easing.quad))}
                    className="mb-6 flex flex-row items-center justify-between"
                >
                    {/* Menu Button */}
                    <Animated.View style={menuAnimatedStyle}>
                        <Pressable
                            onPress={handleOpenDrawer}
                            className="mr-4 h-14 w-14 items-center justify-center border-5 border-black bg-neo-accent shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-primary dark:shadow-brutal-dark-sm"
                        >
                            <Ionicons
                                name="menu-sharp"
                                size={28}
                                color={colorScheme === "dark" ? "white" : "black"}
                            />
                        </Pressable>
                    </Animated.View>

                    {/* Title - Now shows current list name */}
                    <View className="flex-1 flex-row items-center gap-3">
                        <Text
                            className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight"
                            numberOfLines={1}
                        >
                            {selectedList?.name || "Inbox"}
                        </Text>
                    </View>

                    {/* Zen Mode Button */}
                    <ZenModeButton />
                </Animated.View>

                {/* Sort Selector */}
                <SortSelector activeSort={sortBy} onSortChange={handleSortChange} />

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="mb-8 flex-row gap-4"
                >
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder={
                            editingId ? "EDIT TASK..." : "WHAT'S THE TASK?!"
                        }
                        placeholderTextColor={
                            colorScheme === "dark" ? "#666" : "#999"
                        }
                        className="flex-1 border-5 border-black bg-white p-5 font-black text-lg text-black shadow-brutal dark:border-neo-primary dark:bg-neo-dark-surface dark:text-white dark:shadow-brutal-dark uppercase"
                        returnKeyType="done"
                        onSubmitEditing={handleAddOrUpdate}
                        submitBehavior="blurAndSubmit"
                    />
                    <AnimatedTouchableOpacity
                        onPress={handleAddOrUpdate}
                        style={buttonAnimatedStyle}
                        activeOpacity={0.9}
                        className={cn(
                            "items-center justify-center border-5 border-black px-7 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                            editingId ? "bg-neo-secondary" : "bg-neo-accent"
                        )}
                    >
                        <Ionicons
                            name={editingId ? "save-sharp" : "add-sharp"}
                            size={36}
                            color="black"
                        />
                    </AnimatedTouchableOpacity>
                </KeyboardAvoidingView>

                {/* List */}
                <FlatList
                    data={activeTodos}
                    extraData={sortBy}
                    keyExtractor={keyExtractor}
                    renderItem={renderTodoItem}
                    contentContainerStyle={{
                        paddingBottom: Math.max(insets.bottom, 24) + 24,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListFooterComponent={ListFooterComponent}
                    ListEmptyComponent={
                        <Animated.View
                            entering={FadeIn.duration(400).delay(200).easing(Easing.out(Easing.quad))}
                            className="mt-16 items-center justify-center border-5 border-dashed border-gray-400 p-12 dark:border-neo-primary rotate-2"
                        >
                            <Text className="text-3xl font-black text-gray-500 dark:text-gray-300 uppercase tracking-tight">
                                ALL CLEAR!
                            </Text>
                            <Text className="font-black text-gray-500 dark:text-gray-400 uppercase text-sm mt-2">
                                (Add a task!)
                            </Text>
                        </Animated.View>
                    }
                />

                {/* Archive Modal */}
                <ArchiveModal
                    visible={showArchive}
                    onClose={() => setShowArchive(false)}
                    archivedTodos={archivedTodos}
                    onRestore={restoreTodo}
                    onDelete={deleteTodo}
                    onClearAll={clearAllArchived}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}