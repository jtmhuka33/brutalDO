// components/DatePickerPanel.tsx
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, useColorScheme } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import Animated, {
    FadeIn,
    FadeOut,
    Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import RecurrencePicker from "./RecurrencePicker";
import MultiReminderPicker from "./MultiReminderPicker";
import { RecurrencePattern } from "@/types/recurrence";
import { Reminder } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface DatePickerPanelProps {
    reminders: Reminder[];
    dueDate?: string;
    recurrence?: RecurrencePattern;
    onAddReminder: (date: Date) => void;
    onRemoveReminder: (reminderId: string) => void;
    onSetDueDate: (date: Date) => void;
    onClearDueDate: () => void;
    onSetRecurrence: (pattern: RecurrencePattern) => void;
    onClearRecurrence: () => void;
}

export default function DatePickerPanel({
                                            reminders,
                                            dueDate,
                                            recurrence,
                                            onAddReminder,
                                            onRemoveReminder,
                                            onSetDueDate,
                                            onClearDueDate,
                                            onSetRecurrence,
                                            onClearRecurrence,
                                        }: DatePickerPanelProps) {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const colorScheme = useColorScheme();

    const showDueDatePicker = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDatePickerVisibility(true);
    }, []);

    const hideDatePicker = useCallback(() => {
        setDatePickerVisibility(false);
    }, []);

    const handleConfirm = useCallback(
        (date: Date) => {
            onSetDueDate(date);
            hideDatePicker();
        },
        [onSetDueDate, hideDatePicker]
    );

    const handleClearDueDate = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClearDueDate();
    }, [onClearDueDate]);

    const formatDueDate = (dateString: string) => {
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
        if (isTomorrow) return "TOMORROW";
        if (isYesterday) return "YESTERDAY";

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
        date.setHours(23, 59, 59, 999);
        return date < now;
    };

    return (
        <Animated.View
            entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
            exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
            className="mt-4 gap-3"
        >
            {/* Due Date Section */}
            <View className="gap-2">
                <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    Due Date
                </Text>

                {dueDate && (
                    <View
                        className={cn(
                            "flex-row items-center justify-between border-5 border-black p-4 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                            isDueDateOverdue(dueDate)
                                ? "bg-neo-primary"
                                : "bg-neo-accent"
                        )}
                    >
                        <View className="flex-row items-center gap-3 flex-1">
                            <Ionicons
                                name="calendar-sharp"
                                size={24}
                                color={isDueDateOverdue(dueDate) ? "white" : "black"}
                            />
                            <View className="flex-1">
                                <Text
                                    className={cn(
                                        "font-black uppercase text-sm tracking-tight",
                                        isDueDateOverdue(dueDate)
                                            ? "text-white"
                                            : "text-black"
                                    )}
                                >
                                    {formatDueDate(dueDate)}
                                </Text>
                                {isDueDateOverdue(dueDate) && (
                                    <Text className="text-xs font-black uppercase text-white/80">
                                        OVERDUE!
                                    </Text>
                                )}
                            </View>
                        </View>
                        <Pressable
                            onPress={handleClearDueDate}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className={cn(
                                "h-10 w-10 items-center justify-center border-4 border-black shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                isDueDateOverdue(dueDate)
                                    ? "bg-white"
                                    : "bg-neo-primary"
                            )}
                        >
                            <Ionicons
                                name="close-sharp"
                                size={20}
                                color={isDueDateOverdue(dueDate) ? "#FF0055" : "white"}
                            />
                        </Pressable>
                    </View>
                )}

                <Pressable
                    onPress={showDueDatePicker}
                    className={cn(
                        "flex-row items-center justify-center gap-3 border-5 border-black p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                        dueDate
                            ? "bg-gray-300 dark:bg-neo-dark-surface"
                            : "bg-neo-accent"
                    )}
                >
                    <Ionicons
                        name={dueDate ? "calendar-outline" : "calendar-sharp"}
                        size={24}
                        color="black"
                    />
                    <Text className="font-black uppercase tracking-tight text-black text-base">
                        {dueDate ? "CHANGE DUE DATE" : "SET DUE DATE"}
                    </Text>
                </Pressable>
            </View>

            {/* Recurrence Section */}
            <RecurrencePicker
                recurrence={recurrence}
                onSetRecurrence={onSetRecurrence}
                onClearRecurrence={onClearRecurrence}
            />

            {/* Multiple Reminders Section */}
            <View className="mt-2">
                <MultiReminderPicker
                    reminders={reminders}
                    onAddReminder={onAddReminder}
                    onRemoveReminder={onRemoveReminder}
                />
            </View>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
                isDarkModeEnabled={colorScheme === "dark"}
            />
        </Animated.View>
    );
}