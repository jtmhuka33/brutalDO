import React, { useState, useCallback } from "react";
import { View, Text, Pressable, useColorScheme} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    FadeIn,
    FadeOut,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";
import { Reminder } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface MultiReminderPickerProps {
    reminders: Reminder[];
    onAddReminder: (date: Date) => void;
    onRemoveReminder: (reminderId: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function MultiReminderPicker({
                                                reminders,
                                                onAddReminder,
                                                onRemoveReminder,
                                            }: MultiReminderPickerProps) {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const colorScheme = useColorScheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        "worklet";
        scale.value = withTiming(0.96, TIMING_CONFIG);
    }, []);

    const handlePressOut = useCallback(() => {
        "worklet";
        scale.value = withTiming(1, TIMING_CONFIG);
    }, []);

    const showDatePicker = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDatePickerVisibility(true);
    }, []);

    const hideDatePicker = useCallback(() => {
        setDatePickerVisibility(false);
    }, []);

    const handleConfirm = useCallback(
        (date: Date) => {
            onAddReminder(date);
            hideDatePicker();
        },
        [onAddReminder, hideDatePicker]
    );

    const handleRemoveReminder = useCallback(
        async (reminderId: string) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRemoveReminder(reminderId);
        },
        [onRemoveReminder]
    );

    const formatReminderDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow =
            date.toDateString() ===
            new Date(now.getTime() + 86400000).toDateString();
        const isPast = date < now;

        const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        if (isPast) {
            return {
                label: `PAST - ${date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                })} ${timeStr}`,
                isPast: true,
            };
        }
        if (isToday) return { label: `TODAY ${timeStr}`, isPast: false };
        if (isTomorrow) return { label: `TOMORROW ${timeStr}`, isPast: false };

        return {
            label: date
                .toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                })
                .toUpperCase(),
            isPast: false,
        };
    };

    // Sort reminders by date
    const sortedReminders = [...reminders].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
        <View className="gap-2">
            <View className="flex-row items-center justify-between">
                <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    Reminders
                </Text>
                {reminders.length > 0 && (
                    <View className="flex-row items-center gap-1 border-2 border-black bg-neo-green px-2 py-0.5 dark:border-neo-primary">
                        <Ionicons name="notifications-sharp" size={10} color="black" />
                        <Text className="text-xs font-black text-black">
                            {reminders.length}
                        </Text>
                    </View>
                )}
            </View>

            {/* Existing Reminders List */}
            {sortedReminders.length > 0 && (
                <View className="gap-2">
                    {sortedReminders.map((reminder, index) => {
                        const { label, isPast } = formatReminderDate(reminder.date);
                        return (
                            <Animated.View
                                key={reminder.id}
                                entering={FadeIn.delay(index * 50).duration(200)}
                                exiting={FadeOut.duration(150)}
                                layout={Layout.duration(200).easing(Easing.inOut(Easing.quad))}
                                className={cn(
                                    "flex-row items-center justify-between border-5 border-black p-3 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                    isPast
                                        ? "bg-gray-400 dark:bg-gray-600"
                                        : "bg-neo-green"
                                )}
                            >
                                <View className="flex-row items-center gap-3 flex-1">
                                    <View
                                        className={cn(
                                            "h-8 w-8 items-center justify-center border-3 border-black dark:border-neo-primary",
                                            isPast ? "bg-gray-500" : "bg-white"
                                        )}
                                    >
                                        <Ionicons
                                            name={isPast ? "time-outline" : "notifications-sharp"}
                                            size={16}
                                            color={isPast ? "white" : "#FF0055"}
                                        />
                                    </View>
                                    <Text
                                        className={cn(
                                            "flex-1 font-black uppercase text-xs tracking-tight",
                                            isPast ? "text-white line-through" : "text-black"
                                        )}
                                        numberOfLines={1}
                                    >
                                        {label}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => handleRemoveReminder(reminder.id)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    className="h-8 w-8 items-center justify-center border-3 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                >
                                    <Ionicons name="close-sharp" size={16} color="white" />
                                </Pressable>
                            </Animated.View>
                        );
                    })}
                </View>
            )}

            {/* Add Reminder Button */}
            <AnimatedPressable
                onPress={showDatePicker}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={animatedStyle}
                className={cn(
                    "flex-row items-center justify-center gap-3 border-5 border-black p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                    reminders.length > 0
                        ? "bg-gray-300 dark:bg-neo-dark-surface"
                        : "bg-neo-secondary"
                )}
            >
                <Ionicons
                    name={reminders.length > 0 ? "add-sharp" : "alarm-sharp"}
                    size={24}
                    color={colorScheme === 'light' ? "black" : "white"}
                />
                <Text className={`font-black uppercase tracking-tight text-base ${colorScheme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {reminders.length > 0 ? "ADD ANOTHER REMINDER" : "SET REMINDER"}
                </Text>
            </AnimatedPressable>

            {/* Helper Text */}
            {reminders.length > 0 && (
                <Text className="text-center text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {reminders.length} reminder{reminders.length > 1 ? "s" : ""} set
                </Text>
            )}

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
                minimumDate={new Date()}
                isDarkModeEnabled={colorScheme === "dark"}
            />
        </View>
    );
}