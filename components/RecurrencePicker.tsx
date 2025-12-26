// components/RecurrencePicker.tsx
import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    TextInput,
    ScrollView,
    useColorScheme,
    Platform,
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
    RecurrenceUnit,
    RECURRENCE_OPTIONS,
    RECURRENCE_UNIT_OPTIONS,
} from "@/types/recurrence";
import { formatRecurrencePattern } from "@/utils/recurrence";

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

export default function RecurrencePicker({
                                             recurrence,
                                             onSetRecurrence,
                                             onClearRecurrence,
                                         }: RecurrencePickerProps) {
    const [showModal, setShowModal] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [customInterval, setCustomInterval] = useState("1");
    const [customUnit, setCustomUnit] = useState<RecurrenceUnit>("days");
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [endDate, setEndDate] = useState<Date | null>(null);
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

    const openModal = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Reset custom state when opening modal
        if (recurrence?.type === "custom") {
            setCustomInterval(recurrence.interval?.toString() || "1");
            setCustomUnit(recurrence.unit || "days");
            setShowCustom(true);
        } else {
            setShowCustom(false);
            setCustomInterval("1");
            setCustomUnit("days");
        }
        if (recurrence?.endDate) {
            setEndDate(new Date(recurrence.endDate));
        } else {
            setEndDate(null);
        }
        setShowModal(true);
    }, [recurrence]);

    const closeModal = useCallback(() => {
        setShowModal(false);
        setShowCustom(false);
        setShowEndDatePicker(false);
    }, []);

    const handleSelectType = useCallback(
        async (type: RecurrenceType) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (type === "none") {
                onClearRecurrence();
                closeModal();
                return;
            }

            if (type === "custom") {
                setShowCustom(true);
                return;
            }

            const pattern: RecurrencePattern = {
                type,
                endDate: endDate?.toISOString(),
            };
            onSetRecurrence(pattern);
            closeModal();
        },
        [onSetRecurrence, onClearRecurrence, closeModal, endDate]
    );

    const handleSaveCustom = useCallback(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const interval = parseInt(customInterval, 10);
        if (isNaN(interval) || interval < 1) {
            return;
        }

        const pattern: RecurrencePattern = {
            type: "custom",
            interval,
            unit: customUnit,
            endDate: endDate?.toISOString(),
        };
        onSetRecurrence(pattern);
        closeModal();
    }, [customInterval, customUnit, endDate, onSetRecurrence, closeModal]);

    const handleOpenEndDatePicker = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEndDatePicker(true);
    }, []);

    const handleEndDateConfirm = useCallback((date: Date) => {
        setEndDate(date);
        setShowEndDatePicker(false);
    }, []);

    const handleEndDateCancel = useCallback(() => {
        setShowEndDatePicker(false);
    }, []);

    const clearEndDate = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEndDate(null);
    }, []);

    const hasRecurrence = recurrence && recurrence.type !== "none";

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
                    color={hasRecurrence ? "black" : "white"}
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
                <Pressable
                    onPress={closeModal}
                    className="flex-1 bg-black/60 justify-end"
                >
                    <Animated.View
                        entering={SlideInDown.duration(250).easing(Easing.out(Easing.quad))}
                        exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.quad))}
                    >
                        <Pressable onPress={() => {}}>
                            <View className="bg-neo-bg dark:bg-neo-dark border-t-5 border-black dark:border-neo-primary">
                                {/* Header */}
                                <View className="flex-row items-center justify-between border-b-5 border-black dark:border-neo-primary bg-neo-accent p-4">
                                    <Text className="text-xl font-black uppercase tracking-tight text-black">
                                        {showCustom ? "Custom Repeat" : "Repeat"}
                                    </Text>
                                    <Pressable
                                        onPress={showCustom ? () => setShowCustom(false) : closeModal}
                                        className="h-10 w-10 items-center justify-center border-4 border-black bg-white"
                                    >
                                        <Ionicons
                                            name={showCustom ? "arrow-back-sharp" : "close-sharp"}
                                            size={20}
                                            color="black"
                                        />
                                    </Pressable>
                                </View>

                                <ScrollView
                                    className="max-h-96"
                                    contentContainerStyle={{ padding: 16 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {showCustom ? (
                                        // Custom Recurrence Form
                                        <View className="gap-6">
                                            {/* Interval Input */}
                                            <View>
                                                <Text className="mb-3 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                    Every
                                                </Text>
                                                <View className="gap-4">
                                                    {/* Number Input */}
                                                    <TextInput
                                                        value={customInterval}
                                                        onChangeText={setCustomInterval}
                                                        keyboardType="number-pad"
                                                        className="border-5 border-black bg-white p-4 text-center text-2xl font-black text-black dark:border-neo-primary dark:bg-neo-dark-surface dark:text-white"
                                                        placeholder="1"
                                                        placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
                                                    />

                                                    {/* Unit Selection - 2x2 Grid */}
                                                    <View className="gap-3">
                                                        <View className="flex-row gap-3">
                                                            {RECURRENCE_UNIT_OPTIONS.slice(0, 2).map((option) => (
                                                                <Pressable
                                                                    key={option.unit}
                                                                    onPress={() => setCustomUnit(option.unit)}
                                                                    className={cn(
                                                                        "flex-1 items-center justify-center border-4 border-black p-4 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                                                        customUnit === option.unit
                                                                            ? "bg-neo-purple"
                                                                            : "bg-white dark:bg-neo-dark-surface"
                                                                    )}
                                                                >
                                                                    <Text
                                                                        className={cn(
                                                                            "text-sm font-black uppercase",
                                                                            customUnit === option.unit
                                                                                ? "text-white"
                                                                                : "text-black dark:text-white"
                                                                        )}
                                                                    >
                                                                        {parseInt(customInterval, 10) === 1
                                                                            ? option.singularLabel
                                                                            : option.label}
                                                                    </Text>
                                                                </Pressable>
                                                            ))}
                                                        </View>
                                                        <View className="flex-row gap-3">
                                                            {RECURRENCE_UNIT_OPTIONS.slice(2, 4).map((option) => (
                                                                <Pressable
                                                                    key={option.unit}
                                                                    onPress={() => setCustomUnit(option.unit)}
                                                                    className={cn(
                                                                        "flex-1 items-center justify-center border-4 border-black p-4 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                                                        customUnit === option.unit
                                                                            ? "bg-neo-purple"
                                                                            : "bg-white dark:bg-neo-dark-surface"
                                                                    )}
                                                                >
                                                                    <Text
                                                                        className={cn(
                                                                            "text-sm font-black uppercase",
                                                                            customUnit === option.unit
                                                                                ? "text-white"
                                                                                : "text-black dark:text-white"
                                                                        )}
                                                                    >
                                                                        {parseInt(customInterval, 10) === 1
                                                                            ? option.singularLabel
                                                                            : option.label}
                                                                    </Text>
                                                                </Pressable>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* End Date */}
                                            <View>
                                                <Text className="mb-3 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                    End Date (Optional)
                                                </Text>
                                                {endDate ? (
                                                    <View className="flex-row items-center gap-3">
                                                        <Pressable
                                                            onPress={handleOpenEndDatePicker}
                                                            className="flex-1 flex-row items-center gap-3 border-5 border-black bg-neo-orange p-4 dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="calendar-sharp" size={20} color="white" />
                                                            <Text className="font-black uppercase text-white">
                                                                {endDate.toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={clearEndDate}
                                                            className="h-14 w-14 items-center justify-center border-5 border-black bg-neo-primary dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="close-sharp" size={24} color="white" />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Pressable
                                                        onPress={handleOpenEndDatePicker}
                                                        className="flex-row items-center justify-center gap-3 border-5 border-dashed border-gray-400 bg-transparent p-4 dark:border-neo-primary"
                                                    >
                                                        <Ionicons
                                                            name="calendar-outline"
                                                            size={20}
                                                            color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                                        />
                                                        <Text className="font-black uppercase text-gray-500 dark:text-gray-400">
                                                            Set End Date
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            </View>

                                            {/* Save Button */}
                                            <Pressable
                                                onPress={handleSaveCustom}
                                                className="items-center justify-center border-5 border-black bg-neo-green p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark"
                                            >
                                                <Text className="text-lg font-black uppercase text-black">
                                                    Save Custom
                                                </Text>
                                            </Pressable>
                                        </View>
                                    ) : (
                                        // Recurrence Options
                                        <View className="gap-3">
                                            {RECURRENCE_OPTIONS.map((option, index) => {
                                                const isSelected = recurrence?.type === option.type;
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
                                                                name={option.icon as any}
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

                                            {/* End Date Option (when not custom) */}
                                            <View className="mt-4 border-t-4 border-dashed border-gray-300 pt-4 dark:border-gray-600">
                                                <Text className="mb-3 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                                                    End Date (Optional)
                                                </Text>
                                                {endDate ? (
                                                    <View className="flex-row items-center gap-3">
                                                        <Pressable
                                                            onPress={handleOpenEndDatePicker}
                                                            className="flex-1 flex-row items-center gap-3 border-5 border-black bg-neo-orange p-4 dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="calendar-sharp" size={20} color="white" />
                                                            <Text className="font-black uppercase text-white">
                                                                {endDate.toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={clearEndDate}
                                                            className="h-14 w-14 items-center justify-center border-5 border-black bg-neo-primary dark:border-neo-primary"
                                                        >
                                                            <Ionicons name="close-sharp" size={24} color="white" />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Pressable
                                                        onPress={handleOpenEndDatePicker}
                                                        className="flex-row items-center justify-center gap-3 border-5 border-dashed border-gray-400 bg-transparent p-4 dark:border-neo-primary"
                                                    >
                                                        <Ionicons
                                                            name="calendar-outline"
                                                            size={20}
                                                            color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                                        />
                                                        <Text className="font-black uppercase text-gray-500 dark:text-gray-400">
                                                            Set End Date
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </ScrollView>

                                {/* Safe Area Bottom */}
                                <View className="h-8 bg-neo-bg dark:bg-neo-dark" />
                            </View>
                        </Pressable>
                    </Animated.View>
                </Pressable>

                {/* End Date Picker - Inside Modal but rendered on top */}
                <DateTimePickerModal
                    isVisible={showEndDatePicker}
                    mode="date"
                    onConfirm={handleEndDateConfirm}
                    onCancel={handleEndDateCancel}
                    minimumDate={new Date()}
                    isDarkModeEnabled={colorScheme === "dark"}
                />
            </Modal>
        </View>
    );
}