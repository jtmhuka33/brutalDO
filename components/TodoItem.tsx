import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
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
import ReminderPicker from "./ReminderPicker";
import { Todo } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// More varied, vibrant card colors
const CARD_COLORS = [
    "bg-neo-accent dark:bg-neo-accent",     // Yellow
    "bg-neo-secondary dark:bg-neo-secondary",  // Cyan
    "bg-neo-primary dark:bg-neo-primary",    // Neon Pink
    "bg-neo-purple dark:bg-neo-purple",     // Electric Purple
    "bg-neo-green dark:bg-neo-green",      // Matrix Green
    "bg-neo-orange dark:bg-neo-orange",     // Vivid Orange
];

interface TodoItemProps {
    item: Todo;
    index: number;
    onToggle: (id: string) => void;
    onEdit: (todo: Todo) => void;
    onDelete: (id: string) => void;
    onSetReminder: (id: string, date: Date) => void;
    onClearReminder: (id: string) => void;
}

export default function TodoItem({
                                     item,
                                     index,
                                     onToggle,
                                     onEdit,
                                     onDelete,
                                     onSetReminder,
                                     onClearReminder,
                                 }: TodoItemProps) {
    const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];
    const [showReminderPicker, setShowReminderPicker] = useState(false);

    // Animation for press feedback - bouncy and quick
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ],
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

    const handleSetReminder = useCallback((date: Date) => {
        onSetReminder(item.id, date);
        setShowReminderPicker(false);
    }, [onSetReminder, item.id]);

    const handleClearReminder = useCallback(() => {
        onClearReminder(item.id);
        setShowReminderPicker(false);
    }, [onClearReminder, item.id]);

    const toggleReminderPicker = useCallback(() => {
        setShowReminderPicker(prev => !prev);
    }, []);

    return (
        // Outer wrapper for layout animations (entering/exiting/layout)
        <Animated.View
            entering={FadeInDown.delay(index * 30)
                .duration(350)
                .springify()
                .damping(14)
                .stiffness(350)}
            exiting={SlideOutRight
                .duration(300)
                .springify()
                .damping(15)
                .stiffness(400)}
            layout={Layout.springify().damping(16).stiffness(380)}
            className="mb-6"
        >
            {/* Inner wrapper for animated styles with transform */}
            <Animated.View
                style={animatedStyle}
                className={cn(
                    "border-5 p-5 shadow-brutal",
                    item.completed
                        ? "bg-gray-300 dark:bg-neo-dark-surface border-black dark:border-gray-600"
                        : `${colorClass} border-black dark:border-neo-primary`,
                    "dark:shadow-brutal-dark",
                    // Add slight rotation for asymmetry
                    index % 3 === 0 && "-rotate-1",
                    index % 3 === 1 && "rotate-1",
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
                                    style={{ fontWeight: '900' }}
                                />
                            )}
                        </View>

                        <Text
                            className={cn(
                                "text-xl font-black uppercase flex-1 tracking-tight",
                                item.completed
                                    ? "line-through opacity-50 text-black dark:text-gray-400"
                                    : "text-black dark:text-black"
                            )}
                        >
                            {item.text}
                        </Text>
                    </TouchableOpacity>

                    {/* Action Buttons - more aggressive styling */}
                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={toggleReminderPicker}
                            className={cn(
                                "h-11 w-11 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                item.reminderDate
                                    ? "bg-neo-green"
                                    : "bg-neo-accent"
                            )}
                        >
                            <Ionicons
                                name={item.reminderDate ? "notifications-sharp" : "alarm-sharp"}
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

                {/* Reminder Picker */}
                {showReminderPicker && (
                    <ReminderPicker
                        reminderDate={item.reminderDate}
                        onSetReminder={handleSetReminder}
                        onClearReminder={handleClearReminder}
                    />
                )}
            </Animated.View>
        </Animated.View>
    );
}