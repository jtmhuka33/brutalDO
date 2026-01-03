import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    useColorScheme,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    SlideInDown,
    SlideOutDown,
    FadeIn,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";

import { Priority, PRIORITY_OPTIONS, getPriorityOption } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface PriorityPickerProps {
    priority?: Priority;
    onSetPriority: (priority: Priority) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function PriorityPicker({
                                           priority,
                                           onSetPriority,
                                       }: PriorityPickerProps) {
    const [showModal, setShowModal] = useState(false);
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
        setShowModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setShowModal(false);
    }, []);

    const handleSelectPriority = useCallback(
        async (selectedPriority: Priority) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSetPriority(selectedPriority);
            closeModal();
        },
        [onSetPriority, closeModal]
    );

    const currentPriority = getPriorityOption(priority);
    const hasPriority = priority && priority !== "none";

    return (
        <View className="gap-2">
            <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                Priority
            </Text>

            {/* Current Priority Display */}
            {hasPriority && (
                <Animated.View
                    entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
                    className={cn(
                        "flex-row items-center justify-between border-5 border-black p-4 shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                        currentPriority.colorClass
                    )}
                >
                    <View className="flex-row items-center gap-3 flex-1">
                        <Ionicons
                            name={currentPriority.icon as any}
                            size={24}
                            color={priority === "low" ? "black" : "white"}
                        />
                        <Text
                            className={cn(
                                "font-black uppercase text-sm tracking-tight",
                                currentPriority.textColorClass
                            )}
                        >
                            {currentPriority.label}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => onSetPriority("none")}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-white shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="close-sharp" size={20} color="#FF0055" />
                    </Pressable>
                </Animated.View>
            )}

            {/* Set/Change Priority Button */}
            <AnimatedPressable
                onPress={openModal}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={animatedStyle}
                className={cn(
                    "flex-row items-center justify-center gap-3 border-5 border-black p-4 shadow-brutal active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                    hasPriority
                        ? "bg-gray-300 dark:bg-neo-dark-surface"
                        : "bg-neo-accent"
                )}
            >
                <Ionicons
                    name={hasPriority ? "flag-outline" : "flag-sharp"}
                    size={24}
                    color="black"
                />
                <Text className="font-black uppercase tracking-tight text-black text-base">
                    {hasPriority ? "CHANGE PRIORITY" : "SET PRIORITY"}
                </Text>
            </AnimatedPressable>

            {/* Priority Selection Modal */}
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
                                        Set Priority
                                    </Text>
                                    <Pressable
                                        onPress={closeModal}
                                        className="h-10 w-10 items-center justify-center border-4 border-black bg-white"
                                    >
                                        <Ionicons name="close-sharp" size={20} color="black" />
                                    </Pressable>
                                </View>

                                {/* Priority Options */}
                                <View className="p-4 gap-3">
                                    {PRIORITY_OPTIONS.map((option, index) => {
                                        const isSelected = priority === option.value;
                                        return (
                                            <Pressable
                                                key={option.value}
                                                onPress={() => handleSelectPriority(option.value)}
                                                className={cn(
                                                    "flex-row items-center gap-4 border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                                                    isSelected
                                                        ? option.colorClass
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
                                                            : option.colorClass
                                                    )}
                                                >
                                                    <Ionicons
                                                        name={option.icon as any}
                                                        size={20}
                                                        color={
                                                            isSelected
                                                                ? "#FF0055"
                                                                : option.value === "low"
                                                                    ? "black"
                                                                    : option.value === "none"
                                                                        ? colorScheme === "dark"
                                                                            ? "white"
                                                                            : "black"
                                                                        : "white"
                                                        }
                                                    />
                                                </View>
                                                <View className="flex-1">
                                                    <Text
                                                        className={cn(
                                                            "text-base font-black uppercase tracking-tight",
                                                            isSelected
                                                                ? option.textColorClass
                                                                : "text-black dark:text-white"
                                                        )}
                                                    >
                                                        {option.label}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <View className="h-8 w-8 items-center justify-center border-3 border-black bg-white dark:border-neo-primary">
                                                        <Ionicons
                                                            name="checkmark-sharp"
                                                            size={16}
                                                            color="#FF0055"
                                                        />
                                                    </View>
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Safe Area Bottom */}
                                <View className="h-8 bg-neo-bg dark:bg-neo-dark" />
                            </View>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
        </View>
    );
}