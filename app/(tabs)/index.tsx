import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import UndoToast from "@/components/UndoToast";
import {useToast} from "@/context/ToastContext";
import ZenModeButton from "@/components/ZenModeButton";
import BulkEditButton from "@/components/BulkEditButton";
import BulkActionBar from "@/components/BulkActionBar";
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    useColorScheme,
    View,
} from "react-native";
import Animated, {Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming,} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {StatusBar} from "expo-status-bar";
import {Ionicons} from "@expo/vector-icons";
import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import * as Notifications from "expo-notifications";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useNavigation, useFocusEffect} from "expo-router";
import {DrawerActions} from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import TodoItem from "@/components/TodoItem";
import ArchiveButton from "@/components/ArchiveButton";
import ArchiveModal from "@/components/ArchiveModal";
import {SortType, Todo, Subtask} from "@/types/todo";
import {RecurrencePattern} from "@/types/recurrence";
import {DEFAULT_LIST_ID} from "@/types/todoList";
import {useTodoList} from "@/context/TodoListContext";
import {useBulkEdit} from "@/context/BulkEditContext";
import {cancelNotification, registerForPushNotificationsAsync, scheduleNotification,} from "@/utils/notifications";
import {createNextRecurringTodo, isRecurrenceActive} from "@/utils/recurrence";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortType>("DEFAULT");
    const [showArchive, setShowArchive] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const colorScheme = useColorScheme();
    const notificationListener = useRef<Notifications.EventSubscription>();
    const responseListener = useRef<Notifications.EventSubscription>();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { showDeleteToast, toast } = useToast();
    const inputRef = useRef<TextInput>(null);

    const { selectedListId, selectedList } = useTodoList();
    const {
        isBulkMode,
        selectedIds,
        enterBulkMode,
        exitBulkMode,
        selectAll,
        deselectAll,
        deleteTasks,
        setTodosRef,
    } = useBulkEdit();

    const buttonScale = useSharedValue(1);
    const menuScale = useSharedValue(1);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const menuAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: menuScale.value }],
    }));

    // Keep bulk edit context in sync with todos
    useEffect(() => {
        setTodosRef(todos, setTodos);
    }, [todos, setTodosRef, setTodos]);

    // Exit bulk mode when switching lists
    useEffect(() => {
        if (isBulkMode) {
            exitBulkMode();
        }
    }, [selectedListId]);

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

    useEffect(() => {
        const initializeApp = async () => {
            await loadTodos();
            await loadSortPreference();
            setIsInitialLoad(false);
        };
        initializeApp();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (!isInitialLoad) {
                loadTodos();
            }
        }, [isInitialLoad, loadTodos])
    );

    useEffect(() => {
        if (!isInitialLoad) {
            saveTodos(todos);
        }
    }, [todos, isInitialLoad]);

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
        Keyboard.dismiss();
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        menuScale.value = withTiming(0.9, TIMING_CONFIG, () => {
            menuScale.value = withTiming(1, TIMING_CONFIG);
        });
        navigation.dispatch(DrawerActions.openDrawer());
    }, [navigation]);

    const handleToggleBulkMode = useCallback(() => {
        if (isBulkMode) {
            exitBulkMode();
        } else {
            enterBulkMode();
        }
    }, [isBulkMode, enterBulkMode, exitBulkMode]);

    const handleBulkDelete = useCallback(async () => {
        const deletedTodos = await deleteTasks();
        exitBulkMode();

        if (deletedTodos.length > 0) {
            showDeleteToast(
                deletedTodos[0],
                `${deletedTodos.length} task${deletedTodos.length > 1 ? "s" : ""} deleted`
            );
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, [deleteTasks, exitBulkMode, showDeleteToast]);

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
                text: text.trim().toUpperCase(),
                completed: false,
                colorVariant: Math.floor(Math.random() * CARD_COLORS_COUNT),
                listId: selectedListId,
            };
            setTodos((prev) => [newTodo, ...prev]);
        }
        setText("");
    }, [text, editingId, selectedListId]);

    const handleAddSubtask = useCallback((todoId: string, text: string) => {
        const newSubtask: Subtask = {
            id: Date.now().toString(),
            text,
            completed: false,
        };
        setTodos((prev) =>
            prev.map((t) =>
                t.id === todoId
                    ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
                    : t
            )
        );
    }, []);

    const handleToggleSubtask = useCallback((todoId: string, subtaskId: string) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === todoId
                    ? {
                        ...t,
                        subtasks: (t.subtasks || []).map((s) =>
                            s.id === subtaskId ? { ...s, completed: !s.completed } : s
                        ),
                    }
                    : t
            )
        );
    }, []);

    const handleDeleteSubtask = useCallback((todoId: string, subtaskId: string) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === todoId
                    ? { ...t, subtasks: (t.subtasks || []).filter((s) => s.id !== subtaskId) }
                    : t
            )
        );
    }, []);

    const archiveTodo = useCallback(
        async (id: string) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo) return;

            if (!todo.completed && isRecurrenceActive(todo.recurrence)) {
                const nextTodo = createNextRecurringTodo(
                    todo,
                    Math.floor(Math.random() * CARD_COLORS_COUNT)
                );

                if (nextTodo) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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

    const restoreTodo = useCallback(async (id: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, completed: false, archivedAt: undefined } : t
            )
        );
    }, []);

    const deleteTodo = useCallback(
        async (id: string) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo) return;

            if (todo.notificationId) {
                await cancelNotification(todo.notificationId);
            }

            setTodos((prev) => prev.filter((t) => t.id !== id));
            showDeleteToast(todo);
        },
        [todos, showDeleteToast]
    );

    const restoreDeletedTodo = useCallback(() => {
        const deletedTodo = toast.deletedTodo;
        if (deletedTodo) {
            setTodos((prev) => {
                if (prev.some((t) => t.id === deletedTodo.id)) {
                    return prev;
                }
                return [...prev, deletedTodo];
            });
        }
    }, [toast.deletedTodo]);

    const clearAllArchived = useCallback(() => {
        setTodos((prev) => prev.filter((t) => !t.archivedAt));
    }, []);

    const startEditing = useCallback((todo: Todo) => {
        setText(todo.text);
        setEditingId(todo.id);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSetReminder = useCallback(
        async (id: string, date: Date) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo) return;

            if (date <= new Date()) {
                Alert.alert("Invalid Time", "Please select a time in the future.", [{ text: "OK" }]);
                return;
            }

            if (todo.notificationId) {
                await cancelNotification(todo.notificationId);
            }

            const notificationId = await scheduleNotification(todo.text, date);

            setTodos((prev) =>
                prev.map((t) =>
                    t.id === id ? { ...t, reminderDate: date.toISOString(), notificationId } : t
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
                    t.id === id ? { ...t, reminderDate: undefined, notificationId: undefined } : t
                )
            );
        },
        [todos]
    );

    const handleSetDueDate = useCallback((id: string, date: Date) => {
        const dueDate = new Date(date);
        dueDate.setHours(23, 59, 59, 999);

        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, dueDate: dueDate.toISOString() } : t))
        );
    }, []);

    const handleClearDueDate = useCallback((id: string) => {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: undefined } : t)));
    }, []);

    const handleSetRecurrence = useCallback((id: string, pattern: RecurrencePattern) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, recurrence: pattern, isRecurring: pattern.type !== "none" } : t
            )
        );
    }, []);

    const handleClearRecurrence = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, recurrence: undefined, isRecurring: false } : t))
        );
    }, []);

    const getDatePriority = (todo: Todo): number => {
        if (!todo.dueDate) return 4;
        const dueDate = new Date(todo.dueDate);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const diffDays = Math.floor((dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 0;
        if (diffDays === 0) return 1;
        if (diffDays === 1) return 2;
        return 3;
    };

    const { activeTodos, archivedTodos } = useMemo(() => {
        const listFiltered = todos.filter((t) => {
            const todoListId = t.listId || DEFAULT_LIST_ID;
            return todoListId === selectedListId;
        });

        const active = listFiltered.filter((t) => !t.archivedAt);
        const archived = listFiltered.filter((t) => t.archivedAt);

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
                    const priorityA = getDatePriority(a);
                    const priorityB = getDatePriority(b);
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    return parseInt(b.id) - parseInt(a.id);
            }
        });

        return { activeTodos: sortedActive, archivedTodos: archived };
    }, [todos, selectedListId, sortBy]);

    const handleSelectAll = useCallback(() => {
        const allIds = activeTodos.map((t) => t.id);
        selectAll(allIds);
    }, [activeTodos, selectAll]);

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
                onAddSubtask={handleAddSubtask}
                onToggleSubtask={handleToggleSubtask}
                onDeleteSubtask={handleDeleteSubtask}
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
            handleAddSubtask,
            handleToggleSubtask,
            handleDeleteSubtask,
        ]
    );

    const keyExtractor = useCallback((item: Todo) => item.id, []);

    const ListFooterComponent = useMemo(() => {
        if (archivedTodos.length === 0 || isBulkMode) return null;
        return (
            <View className="mt-4">
                <ArchiveButton count={archivedTodos.length} onPress={() => setShowArchive(true)} />
            </View>
        );
    }, [archivedTodos.length, isBulkMode]);

    const handleScrollBeginDrag = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    return (
        <View className="flex-1 bg-neo-bg px-6 pt-8 dark:bg-neo-dark">
            <StatusBar style="auto" />

            {/* Header */}
            <Animated.View
                entering={FadeIn.duration(300).easing(Easing.out(Easing.quad))}
                className="mb-6 flex flex-row items-center justify-between"
            >
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

                <View className="flex-1 flex-row items-center gap-3">
                    <Text
                        className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight"
                        numberOfLines={1}
                    >
                        {selectedList?.name || "Inbox"}
                    </Text>
                </View>

                {/* Bulk Edit Button */}
                <BulkEditButton
                    isActive={isBulkMode}
                    onToggle={handleToggleBulkMode}
                    selectedCount={selectedIds.size}
                />

                {/* Zen Mode Button */}
                <ZenModeButton />
            </Animated.View>

            {/* Sort Selector OR Bulk Action Bar */}
            {isBulkMode ? (
                <BulkActionBar
                    selectedCount={selectedIds.size}
                    onDelete={handleBulkDelete}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={deselectAll}
                    totalCount={activeTodos.length}
                />
            ) : (
                <SortSelector activeSort={sortBy} onSortChange={handleSortChange} />
            )}

            {/* Input Area - hidden in bulk mode */}
            {!isBulkMode && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="mb-8 flex-row gap-4"
                >
                    <TextInput
                        ref={inputRef}
                        value={text}
                        onChangeText={setText}
                        placeholder={editingId ? "EDIT TASK..." : "WHAT'S THE TASK?!"}
                        placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
                        className="flex-1 border-5 border-black bg-white p-5 font-black text-lg text-black shadow-brutal dark:border-neo-primary dark:bg-neo-dark-surface dark:text-white dark:shadow-brutal-dark uppercase"
                        returnKeyType="done"
                        onSubmitEditing={handleAddOrUpdate}
                        submitBehavior="blurAndSubmit"
                    />
                    <AnimatedPressable
                        onPress={handleAddOrUpdate}
                        style={buttonAnimatedStyle}
                        className={cn(
                            "items-center justify-center border-5 border-black px-7 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                            editingId ? "bg-neo-secondary" : "bg-neo-accent"
                        )}
                    >
                        <Ionicons name={editingId ? "save-sharp" : "add-sharp"} size={36} color="black" />
                    </AnimatedPressable>
                </KeyboardAvoidingView>
            )}

            {/* List */}
            <FlatList
                data={activeTodos}
                extraData={[sortBy, isBulkMode, selectedIds]}
                keyExtractor={keyExtractor}
                renderItem={renderTodoItem}
                contentContainerStyle={{
                    paddingBottom: Math.max(insets.bottom, 24) + 24,
                    flexGrow: 1,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onScrollBeginDrag={handleScrollBeginDrag}
                removeClippedSubviews={false}
                scrollEventThrottle={16}
                ListFooterComponent={ListFooterComponent}
                ListEmptyComponent={
                    <Animated.View
                        entering={FadeIn.duration(400).delay(200).easing(Easing.out(Easing.quad))}
                        className="mt-16 items-center justify-center border-5 border-dashed border-gray-400 p-12 dark:border-neo-primary rotate-2"
                    >
                        <Text className="text-3xl font-black text-gray-500 dark:text-gray-300 uppercase tracking-tight">
                            ALL CLEAR!
                        </Text>
                    </Animated.View>
                }
            />

            <ArchiveModal
                visible={showArchive}
                onClose={() => setShowArchive(false)}
                archivedTodos={archivedTodos}
                onRestore={restoreTodo}
                onDelete={deleteTodo}
                onClearAll={clearAllArchived}
            />
            <UndoToast onUndo={restoreDeletedTodo} />
        </View>
    );
}