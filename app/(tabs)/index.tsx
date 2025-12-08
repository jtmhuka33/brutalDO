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
    withSpring,
    withSequence,
    FadeIn,
    BounceIn,
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
import FilterTabs from "@/components/FilterTabs";
import { Todo, FilterType } from "@/types/todo";
import { DEFAULT_LIST_ID } from "@/types/todoList";
import { useTodoList } from "@/context/TodoListContext";
import {
    registerForPushNotificationsAsync,
    scheduleNotification,
    cancelNotification,
} from "@/utils/notifications";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STORAGE_KEY = "@neo_brutal_todos_v2";
const CARD_COLORS_COUNT = 6;

const AnimatedTouchableOpacity =
    Animated.createAnimatedComponent(TouchableOpacity);

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("ALL");
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
                Notifications.removeNotificationSubscription(
                    notificationListener.current
                );
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(
                    responseListener.current
                );
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

    useFocusEffect(
        useCallback(() => {
            loadTodos();
        }, [loadTodos])
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

    const handleOpenDrawer = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        menuScale.value = withSequence(
            withSpring(0.85, { damping: 10, stiffness: 400 }),
            withSpring(1, { damping: 8, stiffness: 350 })
        );
        navigation.dispatch(DrawerActions.openDrawer());
    }, [navigation]);

    const handleAddOrUpdate = useCallback(() => {
        if (!text.trim()) return;

        Keyboard.dismiss();

        buttonScale.value = withSequence(
            withSpring(0.85, { damping: 10, stiffness: 400 }),
            withSpring(1, { damping: 8, stiffness: 350 })
        );

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
                listId: selectedListId, // Assign to current list
            };
            setTodos((prev) => [newTodo, ...prev]);
        }
        setText("");
    }, [text, editingId, selectedListId]);

    const toggleComplete = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
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

    // Filter todos by selected list AND filter type
    const sortedAndFilteredTodos = useMemo(() => {
        // First filter by list
        let listFiltered = todos.filter((t) => {
            // Handle legacy todos without listId - assign to inbox
            const todoListId = t.listId || DEFAULT_LIST_ID;
            return todoListId === selectedListId;
        });

        // Then filter by completion status
        let filtered: Todo[];
        switch (filter) {
            case "TODO":
                filtered = listFiltered.filter((t) => !t.completed);
                break;
            case "DONE":
                filtered = listFiltered.filter((t) => t.completed);
                break;
            default:
                filtered = [...listFiltered];
        }

        // Sort
        return filtered.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;

            if (!a.completed && !b.completed) {
                if (a.dueDate && b.dueDate) {
                    const dateA = new Date(a.dueDate).getTime();
                    const dateB = new Date(b.dueDate).getTime();
                    return dateA - dateB;
                }
                if (a.dueDate && !b.dueDate) return -1;
                if (!a.dueDate && b.dueDate) return 1;
            }

            return parseInt(b.id) - parseInt(a.id);
        });
    }, [todos, filter, selectedListId]);

    const renderTodoItem = useCallback(
        ({ item, index }: { item: Todo; index: number }) => (
            <TodoItem
                item={item}
                index={index}
                onToggle={toggleComplete}
                onEdit={startEditing}
                onDelete={deleteTodo}
                onSetReminder={handleSetReminder}
                onClearReminder={handleClearReminder}
                onSetDueDate={handleSetDueDate}
                onClearDueDate={handleClearDueDate}
            />
        ),
        [
            toggleComplete,
            startEditing,
            deleteTodo,
            handleSetReminder,
            handleClearReminder,
            handleSetDueDate,
            handleClearDueDate,
        ]
    );

    const keyExtractor = useCallback((item: Todo) => item.id, []);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 bg-neo-bg px-6 pt-8 dark:bg-neo-dark">
                <StatusBar style="auto" />

                {/* Header with Menu Button */}
                <Animated.View
                    entering={FadeIn.duration(400).springify()}
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

                {/* Filter Tabs */}
                <FilterTabs activeFilter={filter} onFilterChange={setFilter} />

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
                    data={sortedAndFilteredTodos}
                    keyExtractor={keyExtractor}
                    renderItem={renderTodoItem}
                    contentContainerStyle={{
                        paddingBottom: Math.max(insets.bottom, 24) + 24,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <Animated.View
                            entering={BounceIn.duration(500)
                                .springify()
                                .damping(12)}
                            className="mt-16 items-center justify-center border-5 border-dashed border-gray-400 p-12 dark:border-neo-primary rotate-2"
                        >
                            <Text className="text-3xl font-black text-gray-500 dark:text-gray-300 uppercase tracking-tight">
                                {filter === "TODO"
                                    ? "ALL CLEAR!"
                                    : "NOTHING YET"}
                            </Text>
                            <Text className="font-black text-gray-500 dark:text-gray-400 uppercase text-sm mt-2">
                                {filter === "TODO"
                                    ? "(Chill time)"
                                    : "(Add a task!)"}
                            </Text>
                        </Animated.View>
                    }
                />
            </View>
        </TouchableWithoutFeedback>
    );
}