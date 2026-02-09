import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UndoToast from "@/components/UndoToast";
import { useToast } from "@/context/ToastContext";
import BulkEditButton from "@/components/BulkEditButton";
import BulkActionBar from "@/components/BulkActionBar";
import {
    Alert,
    FlatList,
    Keyboard,
    Pressable,
    Text,
    useColorScheme,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, router } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import TodoItem from "@/components/TodoItem";
import ArchiveButton from "@/components/ArchiveButton";
import ArchiveModal from "@/components/ArchiveModal";
import {Todo, Subtask, getPriorityWeight, getReminders, SortType} from "@/types/todo";
import { RecurrencePattern } from "@/types/recurrence";
import { DEFAULT_LIST_ID } from "@/types/todoList";
import { useTodoList } from "@/context/TodoListContext";
import { useBulkEdit } from "@/context/BulkEditContext";
import {
    cancelNotification,
    registerForPushNotificationsAsync,
} from "@/utils/notifications";
import { createNextRecurringTodo, isRecurrenceActive } from "@/utils/recurrence";
import SortSelector from "@/components/SortSelector";
import { usePomodoro } from "@/context/PomodoroContext";


const STORAGE_KEY = "@neo_brutal_todos_v2";
const SORT_STORAGE_KEY = "@neo_brutal_sort_v1";
const CARD_COLORS_COUNT = 6;

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TodoApp() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [sortBy, setSortBy] = useState<SortType>("DEFAULT");
    const [showArchive, setShowArchive] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const colorScheme = useColorScheme();
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { showDeleteToast, toast } = useToast();
    const { activeTimer, clearActiveTimer } = usePomodoro();

    const { selectedListId, selectedList, lists } = useTodoList();
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

    const addButtonScale = useSharedValue(1);
    const menuScale = useSharedValue(1);

    const addButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: addButtonScale.value }],
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

    // Reload todos when lists change (e.g. after list deletion moves tasks to Inbox)
    useEffect(() => {
        if (!isInitialLoad) {
            loadTodos();
        }
    }, [lists]);

    useEffect(() => {
        registerForPushNotificationsAsync();

        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                console.log("Notification received:", notification);
            });

        // Note: Notification response handling (taps) is now done in PomodoroContext
        // to ensure proper navigation even when app is cold-started from notification

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
        };
    }, []);

    const loadTodos = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setTodos(JSON.parse(stored));
        } catch {
            console.error("Failed to load todos");
        }
    }, []);

    const loadSortPreference = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(SORT_STORAGE_KEY);
            if (stored) setSortBy(stored as SortType);
        } catch {
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
        } catch {
            console.error("Failed to save todos");
        }
    };

    const handleSortChange = useCallback(async (newSort: SortType) => {
        setSortBy(newSort);
        try {
            await AsyncStorage.setItem(SORT_STORAGE_KEY, newSort);
        } catch {
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

    const handleAddTask = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        addButtonScale.value = withTiming(0.9, TIMING_CONFIG, () => {
            addButtonScale.value = withTiming(1, TIMING_CONFIG);
        });
        router.push("/(tabs)/create-task");
    }, []);

    const handleEditTask = useCallback((todo: Todo) => {
        router.push({
            pathname: "/(tabs)/create-task",
            params: { todoId: todo.id },
        });
    }, []);

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

            if (activeTimer && activeTimer.taskId === id) {
                await clearActiveTimer();
            }

            if (todo.notificationId) {
                await cancelNotification(todo.notificationId);
            }
            const reminders = getReminders(todo);
            for (const reminder of reminders) {
                if (reminder.notificationId) {
                    await cancelNotification(reminder.notificationId);
                }
            }

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

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTodos((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? { ...t, completed: true, archivedAt: new Date().toISOString() }
                        : t
                )
            );
        },
        [todos, activeTimer, clearActiveTimer]
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

            const reminders = getReminders(todo);
            for (const reminder of reminders) {
                if (reminder.notificationId) {
                    await cancelNotification(reminder.notificationId);
                }
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

    const handleSetDueDate = useCallback((id: string, date: Date) => {
        const dueDate = new Date(date);
        dueDate.setHours(23, 59, 59, 999);

        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, dueDate: dueDate.toISOString() } : t))
        );
    }, []);

    const handleClearDueDate = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, dueDate: undefined } : t))
        );
    }, []);

    const handleSetRecurrence = useCallback((id: string, pattern: RecurrencePattern) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id
                    ? { ...t, recurrence: pattern, isRecurring: pattern.type !== "none" }
                    : t
            )
        );
    }, []);

    const handleClearRecurrence = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, recurrence: undefined, isRecurring: false } : t
            )
        );
    }, []);

    const getSmartSortWeight = (todo: Todo): number => {
        // Date weight: Overdue=0, Today=1, Tomorrow=3, Future=5, No date=7
        let dateWeight = 7;
        if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dueDateStart = new Date(
                dueDate.getFullYear(),
                dueDate.getMonth(),
                dueDate.getDate()
            );
            const diffDays = Math.floor(
                (dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffDays < 0) dateWeight = 0;
            else if (diffDays === 0) dateWeight = 1;
            else if (diffDays === 1) dateWeight = 3;
            else dateWeight = 5;
        }

        // Priority weight: High=2, Medium=4, Low=6, None=7
        let priorityWeight = 7;
        switch (todo.priority) {
            case "high": priorityWeight = 2; break;
            case "medium": priorityWeight = 4; break;
            case "low": priorityWeight = 6; break;
        }

        // Task lands in whichever bucket is more urgent
        return Math.min(dateWeight, priorityWeight);
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
                        return (
                            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
                        );
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    return parseInt(b.id) - parseInt(a.id);
                case "DUE_DESC":
                    if (a.dueDate && b.dueDate) {
                        return (
                            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
                        );
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    return parseInt(b.id) - parseInt(a.id);
                case "PRIORITY_DESC":
                    // High priority first (lower weight = higher priority)
                    const priorityDiffDesc = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                    if (priorityDiffDesc !== 0) return priorityDiffDesc;
                    // Secondary sort by due date
                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    return parseInt(b.id) - parseInt(a.id);
                case "PRIORITY_ASC":
                    // Low priority first (higher weight = lower priority)
                    const priorityDiffAsc = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
                    if (priorityDiffAsc !== 0) return priorityDiffAsc;
                    // Secondary sort by due date
                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    return parseInt(b.id) - parseInt(a.id);
                case "DEFAULT":
                default:
                    // Smart sort: Overdue → Today → High → Tomorrow → Medium → Future → Low → None
                    const weightA = getSmartSortWeight(a);
                    const weightB = getSmartSortWeight(b);
                    if (weightA !== weightB) return weightA - weightB;

                    // Within same bucket, sort by due date (earlier first)
                    if (a.dueDate && b.dueDate) {
                        const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        if (dateDiff !== 0) return dateDiff;
                    }
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;

                    // Then by priority (higher first)
                    const priDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                    if (priDiff !== 0) return priDiff;

                    // Finally by creation (newest first)
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
                onEdit={handleEditTask}
                onDelete={deleteTodo}
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
            handleEditTask,
            deleteTodo,
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
                <ArchiveButton
                    count={archivedTodos.length}
                    onPress={() => setShowArchive(true)}
                />
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

            {/* Add Task Button - hidden in bulk mode */}
            {!isBulkMode && (
                <AnimatedPressable
                    onPress={handleAddTask}
                    style={addButtonAnimatedStyle}
                    className="mb-8 flex-row items-center justify-center gap-3 border-5 border-black bg-neo-accent p-5 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:bg-neo-primary dark:shadow-brutal-dark"
                >
                    <Ionicons
                        name="add-sharp"
                        size={32}
                        color={colorScheme === "dark" ? "white" : "black"}
                    />
                    <Text className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                        Add Task
                    </Text>
                </AnimatedPressable>
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
                        entering={FadeIn.duration(400)
                            .delay(200)
                            .easing(Easing.out(Easing.quad))}
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