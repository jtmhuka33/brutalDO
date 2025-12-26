// components/SortSelector.tsx
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, useColorScheme } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
    FadeOut,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import * as Haptics from "expo-haptics";
import { SortType, SortOption } from "@/types/todo";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const SORT_OPTIONS: SortOption[] = [
    { value: "DEFAULT", label: "NEWEST", icon: "time-sharp" },
    { value: "ALPHA_ASC", label: "A → Z", icon: "text-sharp" },
    { value: "ALPHA_DESC", label: "Z → A", icon: "text-sharp" },
    { value: "DUE_ASC", label: "DUE ↑", icon: "calendar-sharp" },
    { value: "DUE_DESC", label: "DUE ↓", icon: "calendar-sharp" },
];

interface SortSelectorProps {
    activeSort: SortType;
    onSortChange: (sort: SortType) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIMING_CONFIG = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

export default function SortSelector({ activeSort, onSortChange }: SortSelectorProps) {
    const [isExpanded, setIsExpanded] = useState(false);
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

    const toggleExpanded = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsExpanded((prev) => !prev);
    }, []);

    const handleSelectSort = useCallback(
        async (sort: SortType) => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSortChange(sort);
            setIsExpanded(false);
        },
        [onSortChange]
    );

    const activeOption = SORT_OPTIONS.find((opt) => opt.value === activeSort) || SORT_OPTIONS[0];

    return (
        <View className="mb-6">
            {/* Sort Toggle Button */}
            <AnimatedPressable
                onPress={toggleExpanded}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={animatedStyle}
                className={cn(
                    "flex-row items-center justify-between border-5 border-black p-4 shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark",
                    isExpanded ? "bg-neo-accent" : "bg-white dark:bg-neo-dark-surface"
                )}
            >
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-secondary dark:border-neo-primary">
                        <Ionicons
                            name="swap-vertical-sharp"
                            size={20}
                            color="black"
                        />
                    </View>
                    <Text className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                        Sort: {activeOption.label}
                    </Text>
                </View>
                <Ionicons
                    name={isExpanded ? "chevron-up-sharp" : "chevron-down-sharp"}
                    size={24}
                    color={colorScheme === "dark" ? "#FF0055" : "black"}
                />
            </AnimatedPressable>

            {/* Sort Options Dropdown */}
            {isExpanded && (
                <Animated.View
                    entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
                    exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
                    className="mt-3 gap-2"
                >
                    {SORT_OPTIONS.map((option, index) => {
                        const isActive = activeSort === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => handleSelectSort(option.value)}
                                className={cn(
                                    "flex-row items-center gap-3 border-5 border-black p-4 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm",
                                    isActive
                                        ? "bg-neo-primary"
                                        : "bg-white dark:bg-neo-dark-surface",
                                    index % 2 === 0 && "-rotate-1",
                                    index % 2 === 1 && "rotate-1"
                                )}
                            >
                                <View
                                    className={cn(
                                        "h-8 w-8 items-center justify-center border-4 border-black dark:border-neo-primary",
                                        isActive ? "bg-white" : "bg-neo-accent"
                                    )}
                                >
                                    <Ionicons
                                        name={option.icon as any}
                                        size={16}
                                        color={isActive ? "#FF0055" : "black"}
                                    />
                                </View>
                                <Text
                                    className={cn(
                                        "flex-1 text-base font-black uppercase tracking-tight",
                                        isActive ? "text-white" : "text-black dark:text-white"
                                    )}
                                >
                                    {option.label}
                                </Text>
                                {isActive && (
                                    <View className="h-6 w-6 items-center justify-center border-3 border-black bg-white dark:border-neo-primary">
                                        <Ionicons name="checkmark-sharp" size={14} color="#FF0055" />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </Animated.View>
            )}
        </View>
    );
}