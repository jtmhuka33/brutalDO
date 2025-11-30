import React, { useState, useCallback } from "react";
import { View, Text, Pressable, useColorScheme } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ReminderPickerProps {
    reminderDate?: string;
    onSetReminder: (date: Date) => void;
    onClearReminder: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ReminderPicker({
                                           reminderDate,
                                           onSetReminder,
                                           onClearReminder,
                                       }: ReminderPickerProps) {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const colorScheme = useColorScheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        'worklet';
        scale.value = withSpring(0.92, {
            damping: 12,
            stiffness: 400,
        });
    }, []);

    const handlePressOut = useCallback(() => {
        'worklet';
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 350,
        });
    }, []);

    const showDatePicker = useCallback(() => {
        setDatePickerVisibility(true);
    }, []);

    const hideDatePicker = useCallback(() => {
        setDatePickerVisibility(false);
    }, []);

    const handleConfirm = useCallback((date: Date) => {
        onSetReminder(date);
        hideDatePicker();
    }, [onSetReminder, hideDatePicker]);

    const formatReminderDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow =
            date.toDateString() ===
            new Date(now.getTime() + 86400000).toDateString();

        const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        if (isToday) return `TODAY ${timeStr}`;
        if (isTomorrow) return `TOMORROW ${timeStr}`;

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <View className="mt-4 gap-3">
            {reminderDate && (
                <View className="flex-row items-center justify-between border-5 border-black bg-neo-green p-4 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm">
                    <View className="flex-row items-center gap-3 flex-1">
                        <Ionicons
                            name="notifications-sharp"
                            size={24}
                            color="black"
                        />
                        <Text className="flex-1 font-black uppercase text-black text-sm tracking-tight">
                            {formatReminderDate(reminderDate)}
                        </Text>
                    </View>
                    <Pressable
                        onPress={onClearReminder}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="close-sharp" size={20} color="white" />
                    </Pressable>
                </View>
            )}

            <AnimatedPressable
                onPress={showDatePicker}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={animatedStyle}
                className={cn(
                    "flex-row items-center justify-center gap-3 border-5 border-black bg-neo-secondary p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                    reminderDate && "bg-gray-300 dark:bg-neo-dark-surface"
                )}
            >
                <Ionicons
                    name={reminderDate ? "time-sharp" : "alarm-sharp"}
                    size={24}
                    color="black"
                />
                <Text className="font-black uppercase tracking-tight text-black text-base">
                    {reminderDate ? "CHANGE REMINDER" : "SET REMINDER"}
                </Text>
            </AnimatedPressable>

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