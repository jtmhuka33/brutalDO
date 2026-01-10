import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import PomodoroTimer from "@/components/PomodoroTimer";
import { Todo, getPriorityOption, getReminders } from "@/types/todo";
import { DEFAULT_LIST_ID } from "@/types/todoList";
import { useTodoList } from "@/context/TodoListContext";
import { usePomodoro } from "@/context/PomodoroContext";
import { cancelNotification } from "@/utils/notifications";
import { createNextRecurringTodo, isRecurrenceActive } from "@/utils/recurrence";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STORAGE_KEY = "@neo_brutal_todos_v2";
const CARD_COLORS_COUNT = 6;

export default function ZenMode() {
    const params = useLocalSearchParams<{ taskId?: string }>();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
    const [timerStarted, setTimerStarted] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const insets = useSafeAreaInsets();
    const { selectedListId, selectedList, setSelectedListId } = useTodoList();
    const { activeTimer, clearActiveTimer, setActiveTimer } = usePomodoro();

    // Load task directly if taskId is provided
    const loadTaskById = useCallback(async (taskId: string) => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allTodos: Todo[] = JSON.parse(stored);
                const task = allTodos.find(t => t.id === taskId && !t.archivedAt);

                if (task) {
                    const taskListId = task.listId || DEFAULT_LIST_ID;
                    if (taskListId !== selectedListId) {
                        setSelectedListId(taskListId);
                    }

                    setSelectedTodo(task);
                    setTimerStarted(true);
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("Failed to load task by ID:", e);
            return false;
        }
    }, [selectedListId, setSelectedListId]);

    useEffect(() => {
        const initFromActiveTimerOrParams = async () => {
            // First check if there's an active timer
            if (activeTimer) {
                try {
                    const stored = await AsyncStorage.getItem(STORAGE_KEY);
                    if (stored) {
                        const allTodos: Todo[] = JSON.parse(stored);
                        const task = allTodos.find(t => t.id === activeTimer.taskId && !t.archivedAt);

                        if (task) {
                            const taskListId = task.listId || DEFAULT_LIST_ID;
                            if (taskListId !== selectedListId) {
                                setSelectedListId(taskListId);
                            }

                            setSelectedTodo(task);
                            setTimerStarted(true);
                            setIsInitializing(false);
                            return;
                        } else {
                            await clearActiveTimer();
                        }
                    }
                } catch (e) {
                    console.error("Failed to load task for active timer:", e);
                }
            }

            // Then check if a taskId was passed as a parameter
            if (params.taskId) {
                const loaded = await loadTaskById(params.taskId);
                if (loaded) {
                    setIsInitializing(false);
                    return;
                }
            }

            setIsInitializing(false);
        };

        initFromActiveTimerOrParams();
    }, [activeTimer, params.taskId]);

    useFocusEffect(
        useCallback(() => {
            if (!isInitializing && !timerStarted) {
                loadTodos();
            }
        }, [selectedListId, isInitializing, timerStarted])
    );

    const loadTodos = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allTodos: Todo[] = JSON.parse(stored);
                const activeTodos = allTodos.filter((t) => {
                    const todoListId = t.listId || DEFAULT_LIST_ID;
                    return !t.archivedAt && todoListId === selectedListId;
                });

                activeTodos.sort((a, b) => {
                    const priorityA = getDatePriority(a);
                    const priorityB = getDatePriority(b);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }

                    return parseInt(b.id) - parseInt(a.id);
                });

                setTodos(activeTodos);

                // Update selectedTodo if it exists in the refreshed list
                if (selectedTodo) {
                    const updatedTodo = activeTodos.find(t => t.id === selectedTodo.id);
                    if (updatedTodo) {
                        setSelectedTodo(updatedTodo);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load todos");
        }
    };

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

    const handleTaskSelect = async (todo: Todo) => {
        setSelectedTodo(todo);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleStartZen = async () => {
        if (!selectedTodo) return;
        setTimerStarted(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleComplete = async () => {
        setTimerStarted(false);
        setSelectedTodo(null);
        setActiveTimer(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleToggleSubtask = useCallback(async (subtaskId: string) => {
        if (!selectedTodo) return;

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allTodos: Todo[] = JSON.parse(stored);
                const updatedTodos = allTodos.map((t) =>
                    t.id === selectedTodo.id
                        ? {
                            ...t,
                            subtasks: (t.subtasks || []).map((s) =>
                                s.id === subtaskId ? { ...s, completed: !s.completed } : s
                            ),
                        }
                        : t
                );

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTodos));

                // Update local state
                const updatedTodo = updatedTodos.find(t => t.id === selectedTodo.id);
                if (updatedTodo) {
                    setSelectedTodo(updatedTodo);
                }

                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (e) {
            console.error("Failed to toggle subtask");
        }
    }, [selectedTodo]);

    const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
        if (!selectedTodo) return;

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allTodos: Todo[] = JSON.parse(stored);
                const updatedTodos = allTodos.map((t) =>
                    t.id === selectedTodo.id
                        ? {
                            ...t,
                            subtasks: (t.subtasks || []).filter((s) => s.id !== subtaskId),
                        }
                        : t
                );

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTodos));

                const updatedTodo = updatedTodos.find(t => t.id === selectedTodo.id);
                if (updatedTodo) {
                    setSelectedTodo(updatedTodo);
                }

                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } catch (e) {
            console.error("Failed to delete subtask");
        }
    }, [selectedTodo]);

    const handleCompleteTask = async (taskId: string) => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allTodos: Todo[] = JSON.parse(stored);

                const todo = allTodos.find((t) => t.id === taskId);
                if (!todo) return;

                // Cancel legacy notification
                if (todo.notificationId) {
                    await cancelNotification(todo.notificationId);
                }

                // Cancel all reminder notifications (including migrated legacy)
                const reminders = getReminders(todo);
                for (const reminder of reminders) {
                    if (reminder.notificationId) {
                        await cancelNotification(reminder.notificationId);
                    }
                }

                let updatedTodos: Todo[];

                if (isRecurrenceActive(todo.recurrence)) {
                    const nextTodo = createNextRecurringTodo(
                        todo,
                        Math.floor(Math.random() * CARD_COLORS_COUNT)
                    );

                    if (nextTodo) {
                        updatedTodos = allTodos.map((t) =>
                            t.id === taskId
                                ? { ...t, completed: true, archivedAt: new Date().toISOString() }
                                : t
                        );
                        updatedTodos = [nextTodo, ...updatedTodos];

                        setTimeout(() => {
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
                        }, 300);
                    } else {
                        updatedTodos = allTodos.map((t) =>
                            t.id === taskId
                                ? { ...t, completed: true, archivedAt: new Date().toISOString() }
                                : t
                        );
                    }
                } else {
                    updatedTodos = allTodos.map((t) =>
                        t.id === taskId
                            ? { ...t, completed: true, archivedAt: new Date().toISOString() }
                            : t
                    );
                }

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTodos));

                const activeTodos = updatedTodos.filter((t) => {
                    const todoListId = t.listId || DEFAULT_LIST_ID;
                    return !t.archivedAt && todoListId === selectedListId;
                });

                activeTodos.sort((a, b) => {
                    const priorityA = getDatePriority(a);
                    const priorityB = getDatePriority(b);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }

                    return parseInt(b.id) - parseInt(a.id);
                });

                setTodos(activeTodos);
            }
        } catch (e) {
            console.error("Failed to complete todo");
        }

        setTimerStarted(false);
        setSelectedTodo(null);
        setActiveTimer(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Navigate back to main screen after completing task
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)/");
        }
    };

    const handleBack = async () => {
        if (timerStarted && activeTimer) {
            Alert.alert(
                "Leave Timer?",
                "Your timer is still running. It will continue in the background.",
                [
                    { text: "Stay", style: "cancel" },
                    {
                        text: "Leave",
                        onPress: () => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/(tabs)/");
                            }
                        },
                    },
                ]
            );
        } else {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)/");
            }
        }
    };

    const getRecurrenceLabel = (todo: Todo): string | null => {
        if (!isRecurrenceActive(todo.recurrence)) return null;

        switch (todo.recurrence?.type) {
            case "daily":
                return "DAILY";
            case "weekdays":
                return "M-F";
            case "weekly":
                return "WEEKLY";
            case "biweekly":
                return "2 WEEKS";
            case "monthly":
                return "MONTHLY";
            case "yearly":
                return "YEARLY";
            case "custom":
                if (todo.recurrence.interval && todo.recurrence.unit) {
                    return `${todo.recurrence.interval}${todo.recurrence.unit.charAt(0).toUpperCase()}`;
                }
                return "CUSTOM";
            default:
                return null;
        }
    };

    const getDueDateLabel = (todo: Todo): { label: string; isUrgent: boolean } | null => {
        if (!todo.dueDate) return null;

        const priority = getDatePriority(todo);

        switch (priority) {
            case 0:
                return { label: "OVERDUE", isUrgent: true };
            case 1:
                return { label: "TODAY", isUrgent: true };
            case 2:
                return { label: "TOMORROW", isUrgent: false };
            default:
                const date = new Date(todo.dueDate);
                return {
                    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
                    isUrgent: false
                };
        }
    };

    if (isInitializing) {
        return (
            <View className="flex-1 items-center justify-center bg-neo-bg dark:bg-neo-dark">
                <StatusBar style="auto" />
                <Text className="text-lg font-black uppercase text-gray-500 dark:text-gray-400">
                    Loading...
                </Text>
            </View>
        );
    }

    // If timer is started (either from param or active timer), show the timer
    if (timerStarted && selectedTodo) {
        return (
            <View
                className="flex-1 bg-neo-bg px-6 pt-8 dark:bg-neo-dark"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
                <StatusBar style="auto" />

                <PomodoroTimer
                    selectedTask={selectedTodo.text}
                    taskId={selectedTodo.id}
                    subtasks={selectedTodo.subtasks || []}
                    onComplete={handleComplete}
                    onCompleteTask={handleCompleteTask}
                    onToggleSubtask={handleToggleSubtask}
                    onDeleteSubtask={handleDeleteSubtask}
                    onBack={handleBack}
                />
            </View>
        );
    }

    // Fallback: Show task selection if no task was provided or found
    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 bg-neo-bg dark:bg-neo-dark">
                <StatusBar style="auto" />

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 32,
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

                    {/* Current List Indicator */}
                    <View className="mb-6 flex-row items-center gap-2">
                        <Ionicons name="folder-sharp" size={16} color="#FF0055" />
                        <Text className="text-sm font-black uppercase tracking-widest text-neo-primary">
                            {selectedList?.name || "Inbox"}
                        </Text>
                    </View>

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
                                {todos.map((todo, index) => {
                                    const recurrenceLabel = getRecurrenceLabel(todo);
                                    const dueDateInfo = getDueDateLabel(todo);

                                    return (
                                        <Pressable
                                            key={todo.id}
                                            onPress={() => handleTaskSelect(todo)}
                                            className={cn(
                                                "border-5 border-black p-5 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                                selectedTodo?.id === todo.id
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
                                                        selectedTodo?.id === todo.id
                                                            ? "bg-white dark:bg-neo-dark-surface"
                                                            : "bg-white dark:bg-neo-dark-surface"
                                                    )}
                                                >
                                                    {selectedTodo?.id === todo.id && (
                                                        <Ionicons
                                                            name="checkmark-sharp"
                                                            size={20}
                                                            color="#FF0055"
                                                        />
                                                    )}
                                                </View>
                                                <View className="flex-1">
                                                    <Text
                                                        className={cn(
                                                            "text-lg font-black uppercase tracking-tight",
                                                            selectedTodo?.id === todo.id
                                                                ? "text-white"
                                                                : "text-black dark:text-white"
                                                        )}
                                                    >
                                                        {todo.text}
                                                    </Text>

                                                    {/* Badges Row */}
                                                    <View className="flex-row flex-wrap items-center gap-2 mt-1">
                                                        {/* Due Date Badge */}
                                                        {dueDateInfo && (
                                                            <View
                                                                className={cn(
                                                                    "flex-row items-center gap-1 px-2 py-0.5 border-2",
                                                                    selectedTodo?.id === todo.id
                                                                        ? "border-white/50"
                                                                        : dueDateInfo.isUrgent
                                                                            ? "border-neo-primary bg-neo-primary/10"
                                                                            : "border-gray-400"
                                                                )}
                                                            >
                                                                <Ionicons
                                                                    name="calendar-sharp"
                                                                    size={10}
                                                                    color={
                                                                        selectedTodo?.id === todo.id
                                                                            ? "white"
                                                                            : dueDateInfo.isUrgent
                                                                                ? "#FF0055"
                                                                                : "#666"
                                                                    }
                                                                />
                                                                <Text
                                                                    className={cn(
                                                                        "text-xs font-black uppercase",
                                                                        selectedTodo?.id === todo.id
                                                                            ? "text-white/80"
                                                                            : dueDateInfo.isUrgent
                                                                                ? "text-neo-primary"
                                                                                : "text-gray-500"
                                                                    )}
                                                                >
                                                                    {dueDateInfo.label}
                                                                </Text>
                                                            </View>
                                                        )}

                                                        {/* Recurrence indicator */}
                                                        {recurrenceLabel && (
                                                            <View className="flex-row items-center gap-1">
                                                                <Ionicons
                                                                    name="repeat-sharp"
                                                                    size={12}
                                                                    color={
                                                                        selectedTodo?.id === todo.id
                                                                            ? "white"
                                                                            : "#B000FF"
                                                                    }
                                                                />
                                                                <Text
                                                                    className={cn(
                                                                        "text-xs font-black uppercase",
                                                                        selectedTodo?.id === todo.id
                                                                            ? "text-white/80"
                                                                            : "text-neo-purple"
                                                                    )}
                                                                >
                                                                    {recurrenceLabel}
                                                                </Text>
                                                            </View>
                                                        )}

                                                        {/* Subtasks indicator */}
                                                        {(todo.subtasks?.length || 0) > 0 && (
                                                            <View className="flex-row items-center gap-1">
                                                                <Ionicons
                                                                    name="list-sharp"
                                                                    size={12}
                                                                    color={
                                                                        selectedTodo?.id === todo.id
                                                                            ? "white"
                                                                            : "#00FFF0"
                                                                    }
                                                                />
                                                                <Text
                                                                    className={cn(
                                                                        "text-xs font-black uppercase",
                                                                        selectedTodo?.id === todo.id
                                                                            ? "text-white/80"
                                                                            : "text-neo-secondary"
                                                                    )}
                                                                >
                                                                    {todo.subtasks?.filter(s => s.completed).length}/{todo.subtasks?.length}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {/* Priority Badge */}
                                                        {todo.priority && todo.priority !== "none" && (() => {
                                                            const priorityOption = getPriorityOption(todo.priority);
                                                            return (
                                                                <View
                                                                    className={cn(
                                                                        "flex-row items-center gap-1 px-2 py-0.5 border-2",
                                                                        selectedTodo?.id === todo.id
                                                                            ? "border-white/50"
                                                                            : `border-black ${priorityOption.colorClass}`
                                                                    )}
                                                                >
                                                                    <Ionicons
                                                                        name={priorityOption.icon as any}
                                                                        size={10}
                                                                        color={
                                                                            selectedTodo?.id === todo.id
                                                                                ? "white"
                                                                                : todo.priority === "low"
                                                                                    ? "black"
                                                                                    : "white"
                                                                        }
                                                                    />
                                                                    <Text
                                                                        className={cn(
                                                                            "text-xs font-black uppercase",
                                                                            selectedTodo?.id === todo.id
                                                                                ? "text-white/80"
                                                                                : priorityOption.textColorClass
                                                                        )}
                                                                    >
                                                                        {priorityOption.shortLabel}
                                                                    </Text>
                                                                </View>
                                                            );
                                                        })()}
                                                    </View>
                                                </View>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </Animated.View>

                    {/* Start Button */}
                    <Animated.View entering={FadeIn.delay(400).duration(400)}>
                        <Pressable
                            onPress={handleStartZen}
                            disabled={!selectedTodo}
                            className={cn(
                                "items-center justify-center border-5 border-black p-8 shadow-brutal-lg active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-lg",
                                selectedTodo
                                    ? "bg-neo-primary"
                                    : "bg-gray-300 dark:bg-neo-dark-surface"
                            )}
                        >
                            <Text
                                className={cn(
                                    "text-3xl font-black uppercase tracking-tight",
                                    selectedTodo ? "text-white" : "text-gray-500"
                                )}
                            >
                                Start Zen Mode
                            </Text>
                            {selectedTodo && (
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