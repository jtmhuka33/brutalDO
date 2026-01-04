import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import Animated, {
    FadeInDown,
    FadeOut,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    runOnJS,
    FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Todo, getPriorityOption, getReminders } from "@/types/todo";
import { RecurrencePattern } from "@/types/recurrence";
import {
    getRecurrenceShortLabel,
    isRecurrenceActive,
    formatRecurrencePattern,
} from "@/utils/recurrence";
import { useBulkEdit } from "@/context/BulkEditContext";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const CARD_COLORS = [
    "bg-neo-accent dark:bg-neo-accent",
    "bg-neo-secondary dark:bg-neo-secondary",
    "bg-neo-primary dark:bg-neo-primary",
    "bg-neo-purple dark:bg-neo-purple",
    "bg-neo-green dark:bg-neo-green",
    "bg-neo-orange dark:bg-neo-orange",
];

const TIMING_CONFIG_FAST = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

interface TodoItemProps {
    item: Todo;
    index: number;
    onToggle: (id: string) => void;
    onEdit: (todo: Todo) => void;
    onDelete: (id: string) => void;
    onSetDueDate: (id: string, date: Date) => void;
    onClearDueDate: (id: string) => void;
    onSetRecurrence: (id: string, pattern: RecurrencePattern) => void;
    onClearRecurrence: (id: string) => void;
    onAddSubtask: (id: string, text: string) => void;
    onToggleSubtask: (id: string, subtaskId: string) => void;
    onDeleteSubtask: (id: string, subtaskId: string) => void;
}

const getDatePriority = (dueDate: string): number => {
    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
    const diffDays = Math.floor(
        (dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) return 0;
    if (diffDays === 0) return 1;
    if (diffDays === 1) return 2;
    return 3;
};

export default function TodoItem({
                                     item,
                                     index,
                                     onToggle,
                                     onEdit,
                                     onDelete,
                                     onToggleSubtask,
                                     onDeleteSubtask,
                                 }: TodoItemProps) {
    const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];
    const [showDetails, setShowDetails] = useState(false);
    const { isBulkMode, selectedIds, toggleSelection } = useBulkEdit();

    const isSelected = selectedIds.has(item.id);

    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const zenButtonScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const zenButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: zenButtonScale.value }],
    }));

    const handleToggle = useCallback(() => {
        onToggle(item.id);
    }, [onToggle, item.id]);

    const handlePress = useCallback(() => {
        scale.value = withTiming(0.98, TIMING_CONFIG_FAST, () => {
            scale.value = withTiming(1, TIMING_CONFIG_FAST);
        });
        runOnJS(handleToggle)();
    }, [handleToggle]);

    const handleBulkSelect = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleSelection(item.id);
    }, [toggleSelection, item.id]);

    const handleEditPress = useCallback(() => {
        opacity.value = withTiming(0.7, TIMING_CONFIG_FAST, () => {
            opacity.value = withTiming(1, TIMING_CONFIG_FAST);
        });
        runOnJS(onEdit)(item);
    }, [onEdit, item]);

    const handleDeletePress = useCallback(() => {
        opacity.value = withTiming(0.7, TIMING_CONFIG_FAST);
        runOnJS(onDelete)(item.id);
    }, [onDelete, item.id]);

    const toggleDetails = useCallback(async () => {
        if (!isBulkMode) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDetails((prev) => !prev);
        }
    }, [isBulkMode]);

    const handleSubtaskToggle = useCallback(
        async (subtaskId: string) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleSubtask(item.id, subtaskId);
        },
        [onToggleSubtask, item.id]
    );

    const handleSubtaskDelete = useCallback(
        async (subtaskId: string) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDeleteSubtask(item.id, subtaskId);
        },
        [onDeleteSubtask, item.id]
    );

    const handleStartZenMode = useCallback(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        zenButtonScale.value = withTiming(0.9, TIMING_CONFIG_FAST, () => {
            zenButtonScale.value = withTiming(1, TIMING_CONFIG_FAST);
        });
        router.push({
            pathname: "/(tabs)/zen",
            params: { taskId: item.id },
        });
    }, [item.id]);

    const formatDueDateBadge = (dateString: string) => {
        const priority = getDatePriority(dateString);
        switch (priority) {
            case 0:
                return "OVERDUE";
            case 1:
                return "TODAY";
            case 2:
                return "TOMORROW";
            default:
                return new Date(dateString)
                    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    .toUpperCase();
        }
    };

    const formatDueDateFull = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatReminderFull = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const isDueDateOverdue = (dateString: string) => getDatePriority(dateString) === 0;
    const isDueDateToday = (dateString: string) => getDatePriority(dateString) === 1;
    const isDueDateTomorrow = (dateString: string) => getDatePriority(dateString) === 2;
    const hasRecurrence = isRecurrenceActive(item.recurrence);
    const subtasks = item.subtasks || [];
    const subtaskCount = subtasks.length;
    const completedSubtasks = subtasks.filter((s) => s.completed).length;

    // Get reminders (with migration support)
    const reminders = getReminders(item);
    const reminderCount = reminders.length;
    const futureReminders = reminders.filter((r) => new Date(r.date) > new Date());

    // Priority
    const priorityOption = getPriorityOption(item.priority);
    const hasPriority = item.priority && item.priority !== "none";

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 30)
                .duration(250)
                .easing(Easing.out(Easing.quad))}
            exiting={FadeOut.duration(200).easing(Easing.in(Easing.quad))}
            layout={Layout.duration(250).easing(Easing.inOut(Easing.quad))}
            style={animatedStyle}
            className={cn(
                "mb-6 border-5 p-5 shadow-brutal",
                `${colorClass} border-black dark:border-neo-primary`,
                "dark:shadow-brutal-dark",
                index % 3 === 0 && "-rotate-1",
                index % 3 === 1 && "rotate-1",
                isBulkMode && isSelected && "ring-4 ring-neo-green ring-offset-2"
            )}
        >
            <View className="flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={isBulkMode ? handleBulkSelect : toggleDetails}
                    className="flex-1 flex-col gap-4"
                    activeOpacity={0.7}
                >
                    <View>
                        <Text className="text-md font-black uppercase tracking-tight text-black dark:text-black">
                            {item.text}
                        </Text>
                    </View>
                    <View className="flex flex-row">
                        {/* Bulk Select or Archive Checkbox */}
                        {isBulkMode ? (
                            <Pressable
                                className={cn(
                                    "h-10 w-10 border-5 border-black items-center justify-center shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                    isSelected
                                        ? "bg-neo-green"
                                        : "bg-white dark:bg-neo-dark-surface"
                                )}
                                onPress={handleBulkSelect}
                            >
                                {isSelected && (
                                    <Ionicons name="checkmark-sharp" size={24} color="black" />
                                )}
                            </Pressable>
                        ) : (
                            <Pressable
                                className="h-10 w-10 border-5 border-black bg-white items-center justify-center shadow-brutal-sm dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                                onPress={handlePress}
                            >
                                <Ionicons
                                    name="checkmark-sharp"
                                    size={24}
                                    color="#ccc"
                                    style={{ opacity: 0.3 }}
                                />
                            </Pressable>
                        )}
                        <View className="flex-1 gap-1 mx-auto">
                            <View className="flex-row flex-wrap mx-3 items-center gap-2 mt-1">
                                {/* Priority Badge */}
                                {hasPriority && (
                                    <View
                                        className={cn(
                                            "flex-row items-center gap-1 px-2 py-1 border-3 border-black",
                                            priorityOption.colorClass
                                        )}
                                    >
                                        <Ionicons
                                            name={priorityOption.icon as any}
                                            size={12}
                                            color={item.priority === "low" ? "black" : "white"}
                                        />
                                        <Text
                                            className={cn(
                                                "text-xs font-black uppercase tracking-tight",
                                                priorityOption.textColorClass
                                            )}
                                        >
                                            {priorityOption.shortLabel}
                                        </Text>
                                    </View>
                                )}
                                {item.dueDate && (
                                    <View
                                        className={cn(
                                            "flex-row items-center gap-1 px-2 py-1 border-3 border-black",
                                            isDueDateOverdue(item.dueDate)
                                                ? "bg-neo-primary"
                                                : isDueDateToday(item.dueDate)
                                                    ? "bg-neo-orange"
                                                    : isDueDateTomorrow(item.dueDate)
                                                        ? "bg-neo-accent"
                                                        : "bg-white dark:bg-neo-dark-surface"
                                        )}
                                    >
                                        <Ionicons
                                            name="calendar-sharp"
                                            size={12}
                                            color={
                                                isDueDateOverdue(item.dueDate) ||
                                                isDueDateToday(item.dueDate)
                                                    ? "white"
                                                    : "black"
                                            }
                                        />
                                        <Text
                                            className={cn(
                                                "text-xs font-black uppercase tracking-tight",
                                                isDueDateOverdue(item.dueDate) ||
                                                isDueDateToday(item.dueDate)
                                                    ? "text-white"
                                                    : "text-black dark:text-black"
                                            )}
                                        >
                                            {formatDueDateBadge(item.dueDate)}
                                        </Text>
                                    </View>
                                )}
                                {hasRecurrence && (
                                    <View className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-purple">
                                        <Ionicons name="repeat-sharp" size={12} color="white" />
                                        <Text className="text-xs font-black uppercase tracking-tight text-white">
                                            {getRecurrenceShortLabel(item.recurrence!)}
                                        </Text>
                                    </View>
                                )}
                                {/* Reminders badge - shows count */}
                                {reminderCount > 0 && (
                                    <View className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-green">
                                        <Ionicons name="alarm-sharp" size={12} color="black" />
                                        {reminderCount > 1 && (
                                            <Text className="text-xs font-black text-black">
                                                {futureReminders.length}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {/* Subtask badge */}
                                {subtaskCount > 0 && (
                                    <View className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-secondary">
                                        <Ionicons name="list-sharp" size={12} color="black" />
                                        <Text className="text-xs font-black text-black">
                                            {completedSubtasks}/{subtaskCount}
                                        </Text>
                                    </View>
                                )}
                                {!item.dueDate && !hasRecurrence && subtaskCount === 0 && !hasPriority && reminderCount === 0 && (
                                    <View className="flex-row mx-auto gap-1 opacity-50">
                                        <Ionicons
                                            name="calendar-outline"
                                            size={12}
                                            color="#666"
                                        />
                                        <Text className="text-xs font-black uppercase tracking-tight text-gray-600 dark:text-gray-600">
                                            NO DUE DATE
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        {/* Action Buttons - hidden in bulk mode */}
                        {!isBulkMode && (
                            <View className="flex-row gap-3">
                                <Pressable
                                    onPress={handleEditPress}
                                    className="h-11 w-11 items-center justify-center border-5 border-black bg-neo-secondary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                >
                                    <Ionicons name="pencil-sharp" size={20} color="black" />
                                </Pressable>
                                <Pressable
                                    onPress={handleDeletePress}
                                    className="h-11 w-11 items-center justify-center border-5 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                >
                                    <Ionicons name="trash-sharp" size={20} color="white" />
                                </Pressable>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Task Details Panel - Text Format */}
            {showDetails && !isBulkMode && (
                <Animated.View
                    entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
                    className="mt-4 border-t-4 border-dashed border-black/30 pt-4 dark:border-white/20"
                >
                    <Text className="mb-3 text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-700">
                        Task Details
                    </Text>

                    {/* Priority */}
                    <View className="mb-3 flex-row items-start gap-3">
                        <View className={cn(
                            "h-8 w-8 items-center justify-center border-3 border-black dark:border-neo-primary",
                            hasPriority ? priorityOption.colorClass : "bg-gray-300"
                        )}>
                            <Ionicons
                                name="flag-sharp"
                                size={16}
                                color={hasPriority && item.priority !== "low" ? "white" : "black"}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-600">
                                Priority
                            </Text>
                            <Text className="text-sm font-black uppercase text-black dark:text-black">
                                {hasPriority ? priorityOption.label : "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Due Date */}
                    <View className="mb-3 flex-row items-start gap-3">
                        <View className="h-8 w-8 items-center justify-center border-3 border-black bg-neo-accent dark:border-neo-primary">
                            <Ionicons name="calendar-sharp" size={16} color="black" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-600">
                                Due Date
                            </Text>
                            <Text className="text-sm font-black uppercase text-black dark:text-black">
                                {item.dueDate
                                    ? formatDueDateFull(item.dueDate)
                                    : "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Reminders - Multiple */}
                    <View className="mb-3 flex-row items-start gap-3">
                        <View className="h-8 w-8 items-center justify-center border-3 border-black bg-neo-green dark:border-neo-primary">
                            <Ionicons name="alarm-sharp" size={16} color="black" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-600">
                                Reminders ({reminderCount})
                            </Text>
                            {reminderCount > 0 ? (
                                <View className="mt-1 gap-1">
                                    {reminders.map((reminder, idx) => {
                                        const isPast = new Date(reminder.date) < new Date();
                                        return (
                                            <Text
                                                key={reminder.id}
                                                className={cn(
                                                    "text-sm font-black uppercase",
                                                    isPast
                                                        ? "text-gray-500 line-through dark:text-gray-500"
                                                        : "text-black dark:text-black"
                                                )}
                                            >
                                                {idx + 1}. {formatReminderFull(reminder.date)}
                                            </Text>
                                        );
                                    })}
                                </View>
                            ) : (
                                <Text className="text-sm font-black uppercase text-black dark:text-black">
                                    Not set
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Recurrence */}
                    <View className="mb-3 flex-row items-start gap-3">
                        <View className="h-8 w-8 items-center justify-center border-3 border-black bg-neo-purple dark:border-neo-primary">
                            <Ionicons name="repeat-sharp" size={16} color="white" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-600">
                                Repeat
                            </Text>
                            <Text className="text-sm font-black uppercase text-black dark:text-black">
                                {hasRecurrence
                                    ? formatRecurrencePattern(item.recurrence!)
                                    : "Does not repeat"}
                            </Text>
                        </View>
                    </View>

                    {/* Subtasks - Interactive */}
                    {subtaskCount > 0 && (
                        <View className="mb-3 flex-row items-start gap-3">
                            <View className="h-8 w-8 items-center justify-center border-3 border-black bg-neo-secondary dark:border-neo-primary">
                                <Ionicons name="list-sharp" size={16} color="black" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-600">
                                    Subtasks ({completedSubtasks}/{subtaskCount})
                                </Text>
                                <View className="mt-2 gap-2">
                                    {subtasks.map((subtask) => (
                                        <View
                                            key={subtask.id}
                                            className="flex-row items-center gap-3"
                                        >
                                            {/* Toggle Subtask Checkbox */}
                                            <Pressable
                                                onPress={() => handleSubtaskToggle(subtask.id)}
                                                className={cn(
                                                    "h-7 w-7 items-center justify-center border-3 border-black dark:border-neo-primary",
                                                    subtask.completed
                                                        ? "bg-neo-green"
                                                        : "bg-white dark:bg-neo-dark-surface"
                                                )}
                                            >
                                                {subtask.completed && (
                                                    <Ionicons
                                                        name="checkmark-sharp"
                                                        size={16}
                                                        color="black"
                                                    />
                                                )}
                                            </Pressable>

                                            {/* Subtask Text */}
                                            <Text
                                                className={cn(
                                                    "flex-1 text-sm font-black uppercase",
                                                    subtask.completed
                                                        ? "text-gray-500 line-through dark:text-gray-500"
                                                        : "text-black dark:text-black"
                                                )}
                                                numberOfLines={2}
                                            >
                                                {subtask.text}
                                            </Text>

                                            {/* Delete Subtask Button */}
                                            <Pressable
                                                onPress={() => handleSubtaskDelete(subtask.id)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                className="h-7 w-7 items-center justify-center border-3 border-black bg-neo-primary dark:border-neo-primary"
                                            >
                                                <Ionicons
                                                    name="close-sharp"
                                                    size={14}
                                                    color="white"
                                                />
                                            </Pressable>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Zen Mode Button */}
                    <Animated.View style={zenButtonAnimatedStyle}>
                        <Pressable
                            onPress={handleStartZenMode}
                            className="mt-4 flex-row items-center justify-center gap-3 border-5 border-black bg-neo-primary p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
                        >
                            <Ionicons name="leaf-sharp" size={24} color="white" />
                            <Text className="text-base font-black uppercase tracking-tight text-white">
                                Start Zen Mode
                            </Text>
                        </Pressable>
                    </Animated.View>

                    {/* Tap to edit hint */}
                    <View className="mt-4 flex-row items-center justify-center gap-2 border-3 border-dashed border-gray-400 bg-white/50 p-3 dark:border-neo-primary dark:bg-neo-dark-surface/50">
                        <Ionicons name="pencil-outline" size={16} color="#666" />
                        <Text className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-500">
                            Tap edit to modify task
                        </Text>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}