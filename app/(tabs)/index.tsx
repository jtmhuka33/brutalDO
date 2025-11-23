import React, { useEffect, useState, useMemo, useRef } from "react";
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
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeIn,
    BounceIn,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Notifications from "expo-notifications";

import TodoItem from "@/components/TodoItem";
import FilterTabs from "@/components/FilterTabs";
import { Todo, FilterType } from "@/types/todo";
import {
    registerForPushNotificationsAsync,
    scheduleNotification,
    cancelNotification,
} from "@/utils/notifications";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// --- Constants ---
const STORAGE_KEY = "@neo_brutal_todos_v2";

// Cycle through these for new items
const CARD_COLORS_COUNT = 6;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("ALL");
    const colorScheme = useColorScheme();
    const notificationListener = useRef<any>();
    const responseListener = useRef<any>();

    // Button animation
    const buttonScale = useSharedValue(1);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    // Initialize notifications
    useEffect(() => {
        registerForPushNotificationsAsync();

        // This listener is fired whenever a notification is received while the app is foregrounded
        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                console.log("Notification received:", notification);
            });

        // This listener is fired whenever a user taps on or interacts with a notification
        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                console.log("Notification tapped:", response);
            });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(
                    notificationListener.current
                );
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    // Load Todos on Mount
    useEffect(() => {
        loadTodos();
    }, []);

    // Save Todos whenever they change
    useEffect(() => {
        saveTodos(todos);
    }, [todos]);

    const loadTodos = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setTodos(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to load todos");
        }
    };

    const saveTodos = async (newTodos: Todo[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
        } catch (e) {
            console.error("Failed to save todos");
        }
    };

    const handleAddOrUpdate = () => {
        if (!text.trim()) return;

        // Dismiss keyboard
        Keyboard.dismiss();

        // Button bounce animation
        buttonScale.value = withSpring(0.85, {
            damping: 10,
            stiffness: 400,
        });

        setTimeout(() => {
            buttonScale.value = withSpring(1, {
                damping: 8,
                stiffness: 350,
            });
        }, 150);

        if (editingId) {
            // Edit existing
            setTodos((prev) =>
                prev.map((t) => (t.id === editingId ? { ...t, text: text.trim() } : t))
            );
            setEditingId(null);
        } else {
            // Add new
            const newTodo: Todo = {
                id: Date.now().toString(),
                text: text.trim(),
                completed: false,
                colorVariant: Math.floor(Math.random() * CARD_COLORS_COUNT),
            };
            setTodos((prev) => [newTodo, ...prev]);
        }
        setText("");
    };

    const toggleComplete = (id: string) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
        );
    };

    const deleteTodo = async (id: string) => {
        const todo = todos.find((t) => t.id === id);

        // Cancel notification if exists
        if (todo?.notificationId) {
            await cancelNotification(todo.notificationId);
        }

        setTodos((prev) => prev.filter((t) => t.id !== id));
    };

    const startEditing = (todo: Todo) => {
        setText(todo.text);
        setEditingId(todo.id);
    };

    const handleSetReminder = async (id: string, date: Date) => {
        const todo = todos.find((t) => t.id === id);
        if (!todo) return;

        // Check if date is in the future
        if (date <= new Date()) {
            Alert.alert(
                "Invalid Time",
                "Please select a time in the future.",
                [{ text: "OK" }]
            );
            return;
        }

        // Cancel existing notification if any
        if (todo.notificationId) {
            await cancelNotification(todo.notificationId);
        }

        // Schedule new notification
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
    };

    const handleClearReminder = async (id: string) => {
        const todo = todos.find((t) => t.id === id);
        if (!todo || !todo.notificationId) return;

        // Cancel the notification
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
    };

    // Filter Logic
    const filteredTodos = useMemo(() => {
        switch (filter) {
            case "TODO":
                return todos.filter((t) => !t.completed);
            case "DONE":
                return todos.filter((t) => t.completed);
            default:
                return todos;
        }
    }, [todos, filter]);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 bg-neo-bg px-6 pt-20 dark:bg-neo-dark">
                <StatusBar style="auto" />

                {/* Header - More aggressive typography */}
                <Animated.View
                    entering={FadeIn.duration(400).springify()}
                    className="mb-10 flex flex-row items-center justify-center gap-4"
                >
                    <Text
                        className="text-5xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight">
                        Brutal
                    </Text>
                    <View className="h-4 w-4 bg-neo-accent border-4 border-black rotate-45 dark:border-white" />
                    <Text
                        className="text-5xl font-black uppercase tracking-tighter text-neo-primary underline decoration-8 decoration-black dark:decoration-white leading-tight">
                        Do
                    </Text>
                </Animated.View>

                {/* Filter Tabs */}
                <FilterTabs activeFilter={filter} onFilterChange={setFilter} />

                {/* Input Area - More brutal */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="mb-8 flex-row gap-4"
                >
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder={editingId ? "EDIT TASK..." : "WHAT'S THE TASK?!"}
                        placeholderTextColor={colorScheme === 'dark' ? "#555" : "#999"}
                        className="flex-1 border-5 border-black bg-white p-5 font-black text-lg text-black shadow-brutal dark:border-white dark:bg-zinc-900 dark:text-white dark:shadow-brutal-dark uppercase"
                        returnKeyType="done"
                        onSubmitEditing={handleAddOrUpdate}
                        submitBehavior='blurAndSubmit'
                    />
                    <AnimatedTouchableOpacity
                        onPress={handleAddOrUpdate}
                        style={buttonAnimatedStyle}
                        activeOpacity={0.9}
                        className={cn(
                            "items-center justify-center border-5 border-black px-7 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-white dark:shadow-brutal-dark",
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
                    data={filteredTodos}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <TodoItem
                            item={item}
                            index={index}
                            onToggle={toggleComplete}
                            onEdit={startEditing}
                            onDelete={deleteTodo}
                            onSetReminder={handleSetReminder}
                            onClearReminder={handleClearReminder}
                        />
                    )}
                    contentContainerClassName="pb-24"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <Animated.View
                            entering={BounceIn.duration(500).springify().damping(12)}
                            className="mt-16 items-center justify-center border-5 border-dashed border-gray-400 p-12 dark:border-gray-600 rotate-2"
                        >
                            <Text
                                className="text-3xl font-black text-gray-500 dark:text-gray-600 uppercase tracking-tight">
                                {filter === 'TODO' ? "ALL CLEAR!" : "NOTHING YET"}
                            </Text>
                            <Text className="font-black text-gray-500 dark:text-gray-600 uppercase text-sm mt-2">
                                {filter === 'TODO' ? "(Chill time)" : "(Add a task!)"}
                            </Text>
                        </Animated.View>
                    }
                />
            </View>
        </TouchableWithoutFeedback>
    );
}