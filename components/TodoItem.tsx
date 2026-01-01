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
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";
import DatePickerPanel from "./DatePickerPanel";
import SubtaskList from "./SubTaskList";
import { Todo } from "@/types/todo";
import { RecurrencePattern } from "@/types/recurrence";
import { getRecurrenceShortLabel, isRecurrenceActive } from "@/utils/recurrence";
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
    onSetReminder: (id: string, date: Date) => void;
    onClearReminder: (id: string) => void;
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
    const dueDateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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
                                     onSetReminder,
                                     onClearReminder,
                                     onSetDueDate,
                                     onClearDueDate,
                                     onSetRecurrence,
                                     onClearRecurrence,
                                     onAddSubtask,
                                     onToggleSubtask,
                                     onDeleteSubtask,
                                 }: TodoItemProps) {
    const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSubtasks, setShowSubtasks] = useState(false);
    const { isBulkMode, selectedIds, toggleSelection } = useBulkEdit();

    const isSelected = selectedIds.has(item.id);

    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
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

    const handleSetReminder = useCallback(
        (date: Date) => onSetReminder(item.id, date),
        [onSetReminder, item.id]
    );

    const handleClearReminder = useCallback(() => {
        onClearReminder(item.id);
    }, [onClearReminder, item.id]);

    const handleSetDueDate = useCallback(
        (date: Date) => onSetDueDate(item.id, date),
        [onSetDueDate, item.id]
    );

    const handleClearDueDate = useCallback(() => {
        onClearDueDate(item.id);
    }, [onClearDueDate, item.id]);

    const handleSetRecurrence = useCallback(
        (pattern: RecurrencePattern) => onSetRecurrence(item.id, pattern),
        [onSetRecurrence, item.id]
    );

    const handleClearRecurrence = useCallback(() => {
        onClearRecurrence(item.id);
    }, [onClearRecurrence, item.id]);

    const handleAddSubtask = useCallback(
        (text: string) => onAddSubtask(item.id, text),
        [onAddSubtask, item.id]
    );

    const handleToggleSubtask = useCallback(
        (subtaskId: string) => onToggleSubtask(item.id, subtaskId),
        [onToggleSubtask, item.id]
    );

    const handleDeleteSubtask = useCallback(
        (subtaskId: string) => onDeleteSubtask(item.id, subtaskId),
        [onDeleteSubtask, item.id]
    );

    const toggleDatePicker = useCallback(() => {
        if (!isBulkMode) {
            setShowDatePicker((prev) => !prev);
            setShowSubtasks(false);
        }
    }, [isBulkMode]);

    const toggleSubtasks = useCallback(async () => {
        if (!isBulkMode) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSubtasks((prev) => !prev);
            setShowDatePicker(false);
        }
    }, [isBulkMode]);

    const formatDueDateBadge = (dateString: string) => {
        const priority = getDatePriority(dateString);
        switch (priority) {
            case 0: return "OVERDUE";
            case 1: return "TODAY";
            case 2: return "TOMORROW";
            default:
                return new Date(dateString)
                    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    .toUpperCase();
        }
    };

    const isDueDateOverdue = (dateString: string) => getDatePriority(dateString) === 0;
    const isDueDateToday = (dateString: string) => getDatePriority(dateString) === 1;
    const isDueDateTomorrow = (dateString: string) => getDatePriority(dateString) === 2;
    const hasRecurrence = isRecurrenceActive(item.recurrence);
    const subtasks = item.subtasks || [];
    const subtaskCount = subtasks.length;
    const completedSubtasks = subtasks.filter((s) => s.completed).length;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 30).duration(250).easing(Easing.out(Easing.quad))}
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
                    onPress={isBulkMode ? handleBulkSelect : toggleDatePicker}
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
                                    isSelected ? "bg-neo-green" : "bg-white dark:bg-neo-dark-surface"
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
                                                isDueDateOverdue(item.dueDate) || isDueDateToday(item.dueDate)
                                                    ? "white"
                                                    : "black"
                                            }
                                        />
                                        <Text
                                            className={cn(
                                                "text-xs font-black uppercase tracking-tight",
                                                isDueDateOverdue(item.dueDate) || isDueDateToday(item.dueDate)
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
                                {item.reminderDate && (
                                    <View className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-green">
                                        <Ionicons name="alarm-sharp" size={12} color="black" />
                                    </View>
                                )}
                                {/* Subtask badge */}
                                {subtaskCount > 0 && (
                                    <Pressable
                                        onPress={toggleSubtasks}
                                        className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-secondary"
                                    >
                                        <Ionicons name="list-sharp" size={12} color="black" />
                                        <Text className="text-xs font-black text-black">
                                            {completedSubtasks}/{subtaskCount}
                                        </Text>
                                    </Pressable>
                                )}
                                {!item.dueDate && !hasRecurrence && subtaskCount === 0 && (
                                    <View className="flex-row mx-auto gap-1 opacity-50">
                                        <Ionicons name="calendar-outline" size={12} color="#666" />
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
                                {/* Subtasks button */}
                                <Pressable
                                    onPress={toggleSubtasks}
                                    className={cn(
                                        "h-11 w-11 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                        showSubtasks ? "bg-neo-green" : "bg-white dark:bg-neo-dark-surface"
                                    )}
                                >
                                    <Ionicons
                                        name="list-sharp"
                                        size={20}
                                        color={showSubtasks ? "black" : "#FF0055"}
                                    />
                                </Pressable>
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

            {/* Subtasks Panel */}
            {showSubtasks && !isBulkMode && (
                <SubtaskList
                    subtasks={subtasks}
                    onAddSubtask={handleAddSubtask}
                    onToggleSubtask={handleToggleSubtask}
                    onDeleteSubtask={handleDeleteSubtask}
                />
            )}

            {showDatePicker && !isBulkMode && (
                <DatePickerPanel
                    reminderDate={item.reminderDate}
                    dueDate={item.dueDate}
                    recurrence={item.recurrence}
                    onSetReminder={handleSetReminder}
                    onClearReminder={handleClearReminder}
                    onSetDueDate={handleSetDueDate}
                    onClearDueDate={handleClearDueDate}
                    onSetRecurrence={handleSetRecurrence}
                    onClearRecurrence={handleClearRecurrence}
                />
            )}
        </Animated.View>
    );
}