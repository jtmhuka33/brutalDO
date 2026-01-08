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
    const [showDayPicker, setShowDayPicker] = useState(false);
    const [selectedType, setSelectedType] = useState<RecurrenceType | null>(null);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
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
        setShowDayPicker(false);
        setSelectedType(null);
        setSelectedDays(recurrence?.daysOfWeek || []);
        if (recurrence?.endDate) {
            setEndDate(new Date(recurrence.endDate));
        } else {
            setEndDate(null);
        }
        setShowModal(true);
    }, [recurrence]);

    const closeModal = useCallback(() => {
        setShowModal(false);
        setShowDayPicker(false);
        setSelectedType(null);
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

            const option = RECURRENCE_OPTIONS.find(o => o.type === type);

            if (option?.showDayPicker) {
                setSelectedType(type);
                if (selectedDays.length === 0) {
                    const today = new Date().getDay();
                    setSelectedDays([today]);
                }
                setShowDayPicker(true);
            } else {
                const pattern: RecurrencePattern = {
                    type,
                    endDate: endDate?.toISOString(),
                };
                onSetRecurrence(pattern);
                closeModal();
            }
        },
        [onSetRecurrence, onClearRecurrence, closeModal, endDate, selectedDays]
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

    const handleSaveDays = useCallback(async () => {
        if (!selectedType || selectedDays.length === 0) return;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const pattern: RecurrencePattern = {
            type: selectedType,
            daysOfWeek: selectedDays,
            endDate: endDate?.toISOString(),
        };
        onSetRecurrence(pattern);
        closeModal();
    }, [selectedType, selectedDays, endDate, onSetRecurrence, closeModal]);

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

    const selectedTypeName = useMemo(() => {
        if (!selectedType) return "";
        const option = RECURRENCE_OPTIONS.find(o => o.type === selectedType);
        return option?.label || "";
    }, [selectedType]);

    // Render Day Picker Content
    const renderDayPickerContent = () => (
        <View className="gap-4 p-4">
            {/* Day Selection */}
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
            </View>

            {/* Quick Select Buttons */}
            <View className="flex-row gap-2">
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

            {/* End Date */}
            <View>
                <Text className="mb-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    End Date (Optional)
                </Text>
                {endDate ? (
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={handleOpenEndDatePicker}
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
                        onPress={handleOpenEndDatePicker}
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
                onPress={handleSaveDays}
                disabled={selectedDays.length === 0}
                className={cn(
                    "items-center justify-center border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                    selectedDays.length > 0
                        ? "bg-neo-green"
                        : "bg-gray-300 dark:bg-neo-dark-surface opacity-50"
                )}
            >
                <Text className={cn(
                    "text-lg font-black uppercase",
                    selectedDays.length > 0 ? "text-black" : "text-gray-500"
                )}>
                    Save Schedule
                </Text>
            </Pressable>
        </View>
    );

    // Render Type Options Content
    const renderTypeOptionsContent = () => (
        <View className="gap-3 p-4">
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
                            {option.showDayPicker && (
                                <Text
                                    className={cn(
                                        "text-xs font-black uppercase tracking-wider mt-1",
                                        isSelected
                                            ? "text-white/70"
                                            : "text-gray-500 dark:text-gray-400"
                                    )}
                                >
                                    Tap to choose days →
                                </Text>
                            )}
                        </View>
                        {isSelected && (
                            <View className="h-8 w-8 items-center justify-center border-3 border-black bg-white dark:border-neo-primary">
                                <Ionicons name="checkmark-sharp" size={16} color="#B000FF" />
                            </View>
                        )}
                    </Pressable>
                );
            })}

            {/* End Date Option */}
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
    );

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
                    {/* Backdrop - Tap to close */}
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
                                    {showDayPicker ? `${selectedTypeName}` : "Repeat"}
                                </Text>
                                <Pressable
                                    onPress={showDayPicker ? () => setShowDayPicker(false) : closeModal}
                                    className="h-10 w-10 items-center justify-center border-4 border-black bg-white"
                                >
                                    <Ionicons
                                        name={showDayPicker ? "arrow-back-sharp" : "close-sharp"}
                                        size={20}
                                        color="black"
                                    />
                                </Pressable>
                            </View>

                            {/* Content - No ScrollView for day picker to avoid scroll conflicts */}
                            {showDayPicker ? (
                                renderDayPickerContent()
                            ) : (
                                <ScrollView
                                    className="max-h-96"
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {renderTypeOptionsContent()}
                                </ScrollView>
                            )}

                            {/* Safe Area Bottom */}
                            <View className="h-8 bg-neo-bg dark:bg-neo-dark" />
                        </View>
                    </Animated.View>
                </View>

                {/* End Date Picker */}
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