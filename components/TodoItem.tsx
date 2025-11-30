import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Pressable, useColorScheme } from "react-native";
import Animated, {
    FadeInDown,
    Layout,
    SlideOutRight,
    withSpring,
    withSequence,
    useAnimatedStyle,
    useSharedValue,
    runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import DatePickerPanel from "./DatePickerPanel";
import { Todo } from "@/types/todo";

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
}

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
                                 }: TodoItemProps) {
    const colorScheme = useColorScheme();
    const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Animation for press feedback - bouncy and quick
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    }));

    const handleToggle = useCallback(() => {
        onToggle(item.id);
    }, [onToggle, item.id]);

    const handlePress = useCallback(() => {
        // Quick, snappy bounce using withSequence instead of setTimeout
        scale.value = withSequence(
            withSpring(0.95, {
                damping: 15,
                stiffness: 400,
            }),
            withSpring(1, {
                damping: 12,
                stiffness: 350,
            })
        );

        runOnJS(handleToggle)();
    }, [handleToggle]);

    const handleEditPress = useCallback(() => {
        rotation.value = withSequence(
            withSpring(-5, {
                damping: 10,
                stiffness: 300,
            }),
            withSpring(0, {
                damping: 10,
                stiffness: 300,
            })
        );
        // Delay the edit callback slightly
        runOnJS(onEdit)(item);
    }, [onEdit, item]);

    const handleDeletePress = useCallback(() => {
        rotation.value = withSpring(5, {
            damping: 10,
            stiffness: 300,
        });
        // Use withDelay pattern for the delete
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

    const toggleDatePicker = useCallback(() => {
        setShowDatePicker((prev) => !prev);
    }, []);

    const formatDueDateBadge = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow =
            date.toDateString() ===
            new Date(now.getTime() + 86400000).toDateString();
        const isYesterday =
            date.toDateString() ===
            new Date(now.getTime() - 86400000).toDateString();

        if (isToday) return "TODAY";
        if (isTomorrow) return "TMR";
        if (isYesterday) return "LATE";

        return date
            .toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            })
            .toUpperCase();
    };

    const isDueDateOverdue = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        // Set date to end of day for comparison
        date.setHours(23, 59, 59, 999);
        return date < now;
    };

    const isDueDateToday = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        return date.toDateString() === now.toDateString();
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 30)
                .duration(350)
                .springify()
                .damping(14)
                .stiffness(350)}
            exiting={SlideOutRight.duration(300)
                .springify()
                .damping(15)
                .stiffness(400)}
            layout={Layout.springify().damping(16).stiffness(380)}
            style={animatedStyle}
            className={cn(
                "mb-6 border-5 p-5 shadow-brutal",
                item.completed
                    ? "bg-gray-300 dark:bg-neo-dark-surface border-black dark:border-gray-600"
                    : `${colorClass} border-black dark:border-neo-primary`,
                "dark:shadow-brutal-dark",
                // Add slight rotation for asymmetry
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
                    {/* BRUTAL Checkbox */}
                    <View
                        className={cn(
                            "h-10 w-10 border-5 border-black bg-white items-center justify-center shadow-brutal-sm dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm",
                            item.completed && "bg-black dark:bg-neo-primary"
                        )}
                    >
                        {item.completed && (
                            <Ionicons
                                name="checkmark-sharp"
                                size={24}
                                color="white"
                                style={{ fontWeight: "900" }}
                            />
                        )}
                    </View>

                    <View className="flex-1 gap-1">
                        <Text
                            className={cn(
                                "text-xl font-black uppercase tracking-tight",
                                item.completed
                                    ? "line-through opacity-50 text-black dark:text-gray-400"
                                    : "text-black dark:text-black"
                            )}
                        >
                            {item.text}
                        </Text>

                        {/* Due Date Badge - inline display */}
                        {item.dueDate && !item.completed && (
                            <View className="flex-row items-center gap-2 mt-1">
                                <View
                                    className={cn(
                                        "flex-row items-center gap-1 px-2 py-1 border-3 border-black",
                                        isDueDateOverdue(item.dueDate)
                                            ? "bg-neo-primary"
                                            : isDueDateToday(item.dueDate)
                                                ? "bg-neo-orange"
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
                                                : "text-black dark:text-white"
                                        )}
                                    >
                                        {formatDueDateBadge(item.dueDate)}
                                    </Text>
                                </View>
                                {isDueDateOverdue(item.dueDate) && (
                                    <Text className="text-xs font-black uppercase text-neo-primary">
                                        OVERDUE!
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* No Due Date indicator */}
                        {!item.dueDate && !item.completed && (
                            <View className="flex-row items-center gap-1 mt-1 opacity-50">
                                <Ionicons
                                    name="calendar-outline"
                                    size={12}
                                    color={colorScheme === "dark" ? "#666" : "#999"}
                                />
                                <Text className="text-xs font-black uppercase tracking-tight text-gray-500 dark:text-gray-500">
                                    NO DUE DATE
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Action Buttons - more aggressive styling */}
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={toggleDatePicker}
                        className={cn(
                            "h-11 w-11 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                            item.reminderDate || item.dueDate
                                ? "bg-neo-green"
                                : "bg-neo-accent"
                        )}
                    >
                        <Ionicons
                            name={
                                item.reminderDate || item.dueDate
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
                    onSetReminder={handleSetReminder}
                    onClearReminder={handleClearReminder}
                    onSetDueDate={handleSetDueDate}
                    onClearDueDate={handleClearDueDate}
                />
            )}
        </Animated.View>
    );
}