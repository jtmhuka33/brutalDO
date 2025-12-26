// components/TodoItem.tsx
import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Pressable, useColorScheme } from "react-native";
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
import DatePickerPanel from "./DatePickerPanel";
import { Todo } from "@/types/todo";
import { RecurrencePattern } from "@/types/recurrence";
import { getRecurrenceShortLabel, isRecurrenceActive } from "@/utils/recurrence";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// More varied, vibrant card colors
const CARD_COLORS = [
    "bg-neo-accent dark:bg-neo-accent", // Yellow
    "bg-neo-secondary dark:bg-neo-secondary", // Cyan
    "bg-neo-primary dark:bg-neo-primary", // Neon Pink
    "bg-neo-purple dark:bg-neo-purple", // Electric Purple
    "bg-neo-green dark:bg-neo-green", // Matrix Green
    "bg-neo-orange dark:bg-neo-orange", // Vivid Orange
];

const TIMING_CONFIG = {
    duration: 200,
    easing: Easing.out(Easing.quad),
};

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
}

// Helper function to get date priority
const getDatePriority = (dueDate: string): number => {
    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 0; // Overdue
    if (diffDays === 0) return 1; // Today
    if (diffDays === 1) return 2; // Tomorrow
    return 3; // Future
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
                                 }: TodoItemProps) {
    const colorScheme = useColorScheme();
    const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];
    const [showDatePicker, setShowDatePicker] = useState(false);

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
        (date: Date) => {
            onSetReminder(item.id, date);
        },
        [onSetReminder, item.id]
    );

    const handleClearReminder = useCallback(() => {
        onClearReminder(item.id);
    }, [onClearReminder, item.id]);

    const handleSetDueDate = useCallback(
        (date: Date) => {
            onSetDueDate(item.id, date);
        },
        [onSetDueDate, item.id]
    );

    const handleClearDueDate = useCallback(() => {
        onClearDueDate(item.id);
    }, [onClearDueDate, item.id]);

    const handleSetRecurrence = useCallback(
        (pattern: RecurrencePattern) => {
            onSetRecurrence(item.id, pattern);
        },
        [onSetRecurrence, item.id]
    );

    const handleClearRecurrence = useCallback(() => {
        onClearRecurrence(item.id);
    }, [onClearRecurrence, item.id]);

    const toggleDatePicker = useCallback(() => {
        setShowDatePicker((prev) => !prev);
    }, []);

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
                const date = new Date(dateString);
                return date
                    .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    })
                    .toUpperCase();
        }
    };

    const isDueDateOverdue = (dateString: string) => {
        return getDatePriority(dateString) === 0;
    };

    const isDueDateToday = (dateString: string) => {
        return getDatePriority(dateString) === 1;
    };

    const isDueDateTomorrow = (dateString: string) => {
        return getDatePriority(dateString) === 2;
    };

    const hasRecurrence = isRecurrenceActive(item.recurrence);

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
                index % 3 === 1 && "rotate-1"
            )}
        >
            <View className="flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={handlePress}
                    className="flex-1 flex-row items-center gap-4"
                    activeOpacity={0.7}
                >
                    {/* Archive Checkbox */}
                    <View
                        className="h-10 w-10 border-5 border-black bg-white items-center justify-center shadow-brutal-sm dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons
                            name="checkmark-sharp"
                            size={24}
                            color="#ccc"
                            style={{ opacity: 0.3 }}
                        />
                    </View>

                    <View className="flex-1 gap-1">
                        <Text
                            className="text-xl font-black uppercase tracking-tight text-black dark:text-black"
                        >
                            {item.text}
                        </Text>

                        {/* Badges Row */}
                        <View className="flex-row flex-wrap items-center gap-2 mt-1">
                            {/* Due Date Badge - with priority colors */}
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

                            {/* Recurrence Badge */}
                            {hasRecurrence && (
                                <View className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-purple">
                                    <Ionicons name="repeat-sharp" size={12} color="white" />
                                    <Text className="text-xs font-black uppercase tracking-tight text-white">
                                        {getRecurrenceShortLabel(item.recurrence!)}
                                    </Text>
                                </View>
                            )}

                            {/* Reminder indicator */}
                            {item.reminderDate && (
                                <View className="flex-row items-center gap-1 px-2 py-1 border-3 border-black bg-neo-green">
                                    <Ionicons name="alarm-sharp" size={12} color="black" />
                                </View>
                            )}

                            {/* No Due Date indicator */}
                            {!item.dueDate && !hasRecurrence && (
                                <View className="flex-row items-center gap-1 opacity-50">
                                    <Ionicons
                                        name="calendar-outline"
                                        size={12}
                                        color="#666"
                                    />
                                    <Text className="text-xs font-black uppercase tracking-tight text-gray-600 dark:text-gray-600">
                                        NO DATE
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={toggleDatePicker}
                        className={cn(
                            "h-11 w-11 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                            item.reminderDate || item.dueDate || hasRecurrence
                                ? "bg-neo-green"
                                : "bg-neo-accent"
                        )}
                    >
                        <Ionicons
                            name={
                                hasRecurrence
                                    ? "repeat-sharp"
                                    : item.reminderDate || item.dueDate
                                        ? "calendar-sharp"
                                        : "alarm-sharp"
                            }
                            size={20}
                            color="black"
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
            </View>

            {/* Date Picker Panel */}
            {showDatePicker && (
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