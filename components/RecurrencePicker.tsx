import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
    useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
    SlideInDown,
    SlideOutDown,
    Easing,
} from "react-native-reanimated";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";

import {
    RecurrencePattern,
    RecurrenceType,
    RECURRENCE_OPTIONS,
    DAYS_OF_WEEK,
} from "@/types/recurrence";
import { formatRecurrencePattern } from "@/utils/recurrence";
import { useSubscription } from "@/context/SubscriptionContext";
import { canSetRecurrenceInterval } from "@/utils/featureGates";
import PaywallSheet from "./PaywallSheet";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface RecurrencePickerProps {
    recurrence?: RecurrencePattern;
    onSetRecurrence: (pattern: RecurrencePattern) => void;
    onClearRecurrence: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

const INTERVAL_UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
    daily: { singular: "day", plural: "days" },
    weekly: { singular: "week", plural: "weeks" },
    monthly: { singular: "month", plural: "months" },
};

export default function RecurrencePicker({
                                             recurrence,
                                             onSetRecurrence,
                                             onClearRecurrence,
                                         }: RecurrencePickerProps) {
    const [showModal, setShowModal] = useState(false);
    const [selectedType, setSelectedType] = useState<RecurrenceType>("once");
    const [interval, setInterval] = useState(1);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const colorScheme = useColorScheme();
    const { isPremium } = useSubscription();

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

    const openModal = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Initialize state from existing recurrence
        if (recurrence && recurrence.type !== "once") {
            setSelectedType(recurrence.type);
            setInterval(recurrence.interval || 1);
            setSelectedDays(recurrence.daysOfWeek || []);
            setStartDate(recurrence.startDate ? new Date(recurrence.startDate) : null);
            setEndDate(recurrence.endDate ? new Date(recurrence.endDate) : null);
        } else {
            setSelectedType("once");
            setInterval(1);
            setSelectedDays([]);
            setStartDate(null);
            setEndDate(null);
        }
        setShowModal(true);
    }, [recurrence]);

    const closeModal = useCallback(() => {
        setShowModal(false);
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
    }, []);

    const handleSelectType = useCallback(
        async (type: RecurrenceType) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (type === "once") {
                onClearRecurrence();
                closeModal();
                return;
            }

            setSelectedType(type);

            // Initialize day picker with today if switching to weekly with no days
            if (type === "weekly" && selectedDays.length === 0) {
                const today = new Date().getDay();
                setSelectedDays([today]);
            }
        },
        [onClearRecurrence, closeModal, selectedDays]
    );

    const handleToggleDay = useCallback(async (day: number) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDays(prev => {
            if (prev.includes(day)) {
                if (prev.length === 1) return prev;
                return prev.filter(d => d !== day);
            } else {
                return [...prev, day].sort((a, b) => a - b);
            }
        });
    }, []);

    const handleIncrementInterval = useCallback(async () => {
        if (!canSetRecurrenceInterval(isPremium)) {
            setShowPaywall(true);
            return;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setInterval(prev => Math.min(prev + 1, 30));
    }, [isPremium]);

    const handleDecrementInterval = useCallback(async () => {
        if (!canSetRecurrenceInterval(isPremium)) {
            setShowPaywall(true);
            return;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setInterval(prev => Math.max(prev - 1, 1));
    }, [isPremium]);

    const handleSave = useCallback(async () => {
        if (selectedType === "once") return;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const pattern: RecurrencePattern = {
            type: selectedType,
            interval: interval,
            ...(selectedType === "weekly" && selectedDays.length > 0 && { daysOfWeek: selectedDays }),
            ...(startDate && { startDate: startDate.toISOString() }),
            ...(endDate && { endDate: endDate.toISOString() }),
        };
        onSetRecurrence(pattern);
        closeModal();
    }, [selectedType, interval, selectedDays, startDate, endDate, onSetRecurrence, closeModal]);

    const handleStartDateConfirm = useCallback((date: Date) => {
        setStartDate(date);
        setShowStartDatePicker(false);
    }, []);

    const handleEndDateConfirm = useCallback((date: Date) => {
        setEndDate(date);
        setShowEndDatePicker(false);
    }, []);

    const clearStartDate = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStartDate(null);
    }, []);

    const clearEndDate = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEndDate(null);
    }, []);

    const hasRecurrence = recurrence && recurrence.type !== "once";
    const showConfigSection = selectedType !== "once";
    const showDayPicker = selectedType === "weekly";

    const intervalUnitLabel = useMemo(() => {
        const labels = INTERVAL_UNIT_LABELS[selectedType];
        if (!labels) return "";
        return interval === 1 ? labels.singular : labels.plural;
    }, [selectedType, interval]);

    return (
        <View className="gap-2">
            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                Repeat
            </Text>

            {/* Current Recurrence Display */}
            {hasRecurrence && (
                <Animated.View
                    entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
                    className="flex-row items-center justify-between border-5 border-black bg-neo-purple p-4 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm"
                >
                    <View className="flex-row items-center gap-3 flex-1">
                        <Ionicons name="repeat-sharp" size={24} color="white" />
                        <View className="flex-1">
                            <Text className="font-black uppercase text-white text-sm tracking-tight">
                                {formatRecurrencePattern(recurrence)}
                            </Text>
                            {recurrence.startDate && (
                                <Text className="text-xs font-black uppercase text-white/70">
                                    From{" "}
                                    {new Date(recurrence.startDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </Text>
                            )}
                            {recurrence.endDate && (
                                <Text className="text-xs font-black uppercase text-white/70">
                                    Until{" "}
                                    {new Date(recurrence.endDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Pressable
                        onPress={onClearRecurrence}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="close-sharp" size={20} color="white" />
                    </Pressable>
                </Animated.View>
            )}

            {/* Set/Change Recurrence Button */}
            <AnimatedPressable
                onPress={openModal}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={animatedStyle}
                className={cn(
                    "flex-row items-center justify-center gap-3 border-5 border-black p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                    hasRecurrence
                        ? "bg-gray-300 dark:bg-neo-dark-surface"
                        : "bg-neo-purple"
                )}
            >
                <Ionicons
                    name={hasRecurrence ? "repeat-outline" : "repeat-sharp"}
                    size={24}
                    color={colorScheme === 'light' ? "black" : "white"}
                />
                <Text
                    className={cn(
                        "font-black uppercase tracking-tight text-base",
                        hasRecurrence ? "text-black dark:text-white" : "text-white"
                    )}
                >
                    {hasRecurrence ? "CHANGE REPEAT" : "SET REPEAT"}
                </Text>
            </AnimatedPressable>

            {/* Recurrence Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="none"
                onRequestClose={closeModal}
            >
                <View className="flex-1 bg-black/60 justify-end">
                    {/* Backdrop */}
                    <Pressable
                        onPress={closeModal}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />

                    <Animated.View
                        entering={SlideInDown.duration(250).easing(Easing.out(Easing.quad))}
                        exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.quad))}
                    >
                        <View className="bg-neo-bg dark:bg-neo-dark border-t-5 border-black dark:border-neo-primary">
                            {/* Header */}
                            <View className="flex-row items-center justify-between border-b-5 border-black dark:border-neo-primary bg-neo-accent p-4">
                                <Text className="text-xl font-black uppercase tracking-tight text-black">
                                    Repeat
                                </Text>
                                <Pressable
                                    onPress={closeModal}
                                    className="h-10 w-10 items-center justify-center border-4 border-black bg-white"
                                >
                                    <Ionicons name="close-sharp" size={20} color="black" />
                                </Pressable>
                            </View>

                            {/* Content */}
                            <ScrollView
                                className="max-h-[500px]"
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View className="gap-3 p-4">
                                    {/* Type Selection */}
                                    {RECURRENCE_OPTIONS.map((option, index) => {
                                        const isSelected = selectedType === option.type;

                                        return (
                                            <Pressable
                                                key={option.type}
                                                onPress={() => handleSelectType(option.type)}
                                                className={cn(
                                                    "flex-row items-center gap-4 border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                                    isSelected
                                                        ? "bg-neo-purple"
                                                        : "bg-white dark:bg-neo-dark-surface",
                                                    index % 2 === 0 && "-rotate-1",
                                                    index % 2 === 1 && "rotate-1"
                                                )}
                                            >
                                                <View
                                                    className={cn(
                                                        "h-10 w-10 items-center justify-center border-4 border-black dark:border-neo-primary",
                                                        isSelected
                                                            ? "bg-white dark:bg-neo-dark"
                                                            : "bg-neo-accent"
                                                    )}
                                                >
                                                    <Ionicons
                                                        name={option.icon as keyof typeof Ionicons.glyphMap}
                                                        size={20}
                                                        color={isSelected ? "#B000FF" : "black"}
                                                    />
                                                </View>
                                                <View className="flex-1">
                                                    <Text
                                                        className={cn(
                                                            "text-base font-black uppercase tracking-tight",
                                                            isSelected
                                                                ? "text-white"
                                                                : "text-black dark:text-white"
                                                        )}
                                                    >
                                                        {option.label}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <View className="h-8 w-8 items-center justify-center border-3 border-black bg-white dark:border-neo-primary">
                                                        <Ionicons name="checkmark-sharp" size={16} color="#B000FF" />
                                                    </View>
                                                )}
                                            </Pressable>
                                        );
                                    })}

                                    {/* Configuration Section (shown when a repeating type is selected) */}
                                    {showConfigSection && (
                                        <View className="mt-2 gap-4 border-t-4 border-dashed border-gray-300 pt-4 dark:border-gray-600">
                                            {/* Interval Picker */}
                                            {isPremium ? (
                                                <View>
                                                    <Text className="mb-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                        Repeat Every
                                                    </Text>
                                                    <View className="flex-row items-center gap-3">
                                                        <Pressable
                                                            onPress={handleDecrementInterval}
                                                            className={cn(
                                                                "h-14 w-14 items-center justify-center border-5 border-black shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                                                interval > 1
                                                                    ? "bg-neo-primary"
                                                                    : "bg-gray-300 dark:bg-neo-dark-surface"
                                                            )}
                                                        >
                                                            <Ionicons
                                                                name="remove-sharp"
                                                                size={24}
                                                                color={interval > 1 ? "white" : "#999"}
                                                            />
                                                        </Pressable>

                                                        <View className="flex-1 items-center justify-center border-5 border-black bg-white py-3 dark:border-neo-primary dark:bg-neo-dark-surface">
                                                            <Text className="text-2xl font-black text-black dark:text-white">
                                                                {interval}
                                                            </Text>
                                                            <Text className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                                {intervalUnitLabel}
                                                            </Text>
                                                        </View>

                                                        <Pressable
                                                            onPress={handleIncrementInterval}
                                                            className="h-14 w-14 items-center justify-center border-5 border-black bg-neo-green shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                                        >
                                                            <Ionicons name="add-sharp" size={24} color="black" />
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            ) : (
                                                <Pressable
                                                    onPress={() => setShowPaywall(true)}
                                                    className="flex-row items-center justify-center gap-3 border-5 border-neo-purple/50 bg-neo-purple/10 p-4"
                                                >
                                                    <Ionicons name="lock-closed-sharp" size={20} color="#B000FF" />
                                                    <Text className="font-black uppercase text-neo-purple">
                                                        Unlock Custom Intervals
                                                    </Text>
                                                    <View className="border-2 border-neo-purple bg-neo-purple/20 px-1.5 py-0.5">
                                                        <Text className="text-[10px] font-black uppercase text-neo-purple">
                                                            Premium
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            )}

                                            {/* Day of Week Picker (Weekly only) */}
                                            {showDayPicker && (
                                                <View>
                                                    <Text className="mb-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                        Select Days
                                                    </Text>
                                                    <View className="flex-row justify-between gap-1">
                                                        {DAYS_OF_WEEK.map((day, index) => {
                                                            const isSelected = selectedDays.includes(day.value);
                                                            return (
                                                                <Pressable
                                                                    key={day.value}
                                                                    onPress={() => handleToggleDay(day.value)}
                                                                    className={cn(
                                                                        "flex-1 aspect-square items-center justify-center border-4 border-black shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                                                        isSelected
                                                                            ? "bg-neo-purple"
                                                                            : "bg-white dark:bg-neo-dark-surface",
                                                                        index % 2 === 0 && "-rotate-2",
                                                                        index % 2 === 1 && "rotate-2"
                                                                    )}
                                                                >
                                                                    <Text
                                                                        className={cn(
                                                                            "text-sm font-black uppercase",
                                                                            isSelected
                                                                                ? "text-white"
                                                                                : "text-black dark:text-white"
                                                                        )}
                                                                    >
                                                                        {day.shortLabel}
                                                                    </Text>
                                                                </Pressable>
                                                            );
                                                        })}
                                                    </View>
                                                    <Text className="mt-1 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                                                        {selectedDays.length === 0
                                                            ? "Select at least one day"
                                                            : `${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""} selected`
                                                        }
                                                    </Text>

                                                    {/* Quick Select Buttons */}
                                                    <View className="flex-row gap-2 mt-2">
                                                        <Pressable
                                                            onPress={() => setSelectedDays([1, 2, 3, 4, 5])}
                                                            className="flex-1 items-center justify-center border-4 border-black bg-neo-secondary py-2 shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                                        >
                                                            <Text className="text-xs font-black uppercase text-black">M-F</Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => setSelectedDays([0, 6])}
                                                            className="flex-1 items-center justify-center border-4 border-black bg-neo-orange py-2 shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                                        >
                                                            <Text className="text-xs font-black uppercase text-white">Weekend</Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                                                            className="flex-1 items-center justify-center border-4 border-black bg-neo-green py-2 shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm"
                                                        >
                                                            <Text className="text-xs font-black uppercase text-black">All</Text>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Start Date */}
                                            <View>
                                                <Text className="mb-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                    Start Date (Optional)
                                                </Text>
                                                {startDate ? (
                                                    <View className="flex-row items-center gap-2">
                                                        <Pressable
                                                            onPress={() => setShowStartDatePicker(true)}
                                                            className="flex-1 flex-row items-center gap-2 border-4 border-black bg-neo-green p-3 dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="calendar-sharp" size={18} color="black" />
                                                            <Text className="font-black uppercase text-black text-sm">
                                                                {startDate.toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={clearStartDate}
                                                            className="h-12 w-12 items-center justify-center border-4 border-black bg-neo-primary dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="close-sharp" size={20} color="white" />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Pressable
                                                        onPress={() => setShowStartDatePicker(true)}
                                                        className="flex-row items-center justify-center gap-2 border-4 border-dashed border-gray-400 bg-transparent p-3 dark:border-neo-primary"
                                                    >
                                                        <Ionicons
                                                            name="calendar-outline"
                                                            size={18}
                                                            color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                                        />
                                                        <Text className="font-black uppercase text-gray-500 dark:text-gray-400 text-sm">
                                                            Set Start Date
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            </View>

                                            {/* End Date */}
                                            <View>
                                                <Text className="mb-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                    End Date (Optional)
                                                </Text>
                                                {endDate ? (
                                                    <View className="flex-row items-center gap-2">
                                                        <Pressable
                                                            onPress={() => setShowEndDatePicker(true)}
                                                            className="flex-1 flex-row items-center gap-2 border-4 border-black bg-neo-orange p-3 dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="calendar-sharp" size={18} color="white" />
                                                            <Text className="font-black uppercase text-white text-sm">
                                                                {endDate.toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={clearEndDate}
                                                            className="h-12 w-12 items-center justify-center border-4 border-black bg-neo-primary dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="close-sharp" size={20} color="white" />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Pressable
                                                        onPress={() => setShowEndDatePicker(true)}
                                                        className="flex-row items-center justify-center gap-2 border-4 border-dashed border-gray-400 bg-transparent p-3 dark:border-neo-primary"
                                                    >
                                                        <Ionicons
                                                            name="calendar-outline"
                                                            size={18}
                                                            color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                                        />
                                                        <Text className="font-black uppercase text-gray-500 dark:text-gray-400 text-sm">
                                                            Set End Date
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            </View>

                                            {/* Save Button */}
                                            <Pressable
                                                onPress={handleSave}
                                                disabled={showDayPicker && selectedDays.length === 0}
                                                className={cn(
                                                    "items-center justify-center border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                                    (showDayPicker && selectedDays.length === 0)
                                                        ? "bg-gray-300 dark:bg-neo-dark-surface opacity-50"
                                                        : "bg-neo-green"
                                                )}
                                            >
                                                <Text className={cn(
                                                    "text-lg font-black uppercase",
                                                    (showDayPicker && selectedDays.length === 0)
                                                        ? "text-gray-500"
                                                        : "text-black"
                                                )}>
                                                    Save Schedule
                                                </Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>

                            {/* Safe Area Bottom */}
                            <View className="h-8 bg-neo-bg dark:bg-neo-dark" />
                        </View>
                    </Animated.View>
                </View>

                {/* Start Date Picker */}
                <DateTimePickerModal
                    isVisible={showStartDatePicker}
                    mode="date"
                    onConfirm={handleStartDateConfirm}
                    onCancel={() => setShowStartDatePicker(false)}
                    isDarkModeEnabled={colorScheme === "dark"}
                />

                {/* End Date Picker */}
                <DateTimePickerModal
                    isVisible={showEndDatePicker}
                    mode="date"
                    onConfirm={handleEndDateConfirm}
                    onCancel={() => setShowEndDatePicker(false)}
                    minimumDate={startDate || new Date()}
                    isDarkModeEnabled={colorScheme === "dark"}
                />
            </Modal>

            {/* Paywall Sheet */}
            <PaywallSheet
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
                featureContext="custom recurrence intervals"
            />
        </View>
    );
}