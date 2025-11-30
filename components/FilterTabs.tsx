import React from "react";
import {View, Text, Pressable} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle, withSpring,
} from "react-native-reanimated";
import {twMerge} from "tailwind-merge";
import {clsx} from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

type FilterType = "ALL" | "TODO" | "DONE";

interface FilterTabsProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function FilterTab({
                       label,
                       isActive,
                       onPress,
                       rotationClass
                   }: {
    label: string;
    value: FilterType;
    isActive: boolean;
    onPress: () => void;
    rotationClass: string;
}) {
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {scale: scale.value},
            {translateX: translateX.value},
            {translateY: translateY.value},
        ],
    }));

    const handlePressIn = () => {
        // Quick bounce down
        scale.value = withSpring(0.92, {
            damping: 12,
            stiffness: 400,
        });

        if (!isActive) {
            translateX.value = withSpring(2, {
                damping: 15,
                stiffness: 400,
            });
            translateY.value = withSpring(2, {
                damping: 15,
                stiffness: 400,
            });
        }
    };

    const handlePressOut = () => {
        // Bounce back
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 350,
        });

        if (!isActive) {
            translateX.value = withSpring(0, {
                damping: 10,
                stiffness: 350,
            });
            translateY.value = withSpring(0, {
                damping: 10,
                stiffness: 350,
            });
        }
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
            className="flex-1"
        >
            <View
                className={cn(
                    "items-center justify-center border-5 border-black py-4 transition-all",
                    rotationClass,
                    isActive
                        ? "bg-neo-accent translate-x-[4px] translate-y-[4px] shadow-none dark:bg-neo-primary"
                        : "bg-white shadow-brutal dark:bg-neo-dark-surface dark:shadow-brutal-dark dark:border-neo-primary"
                )}
            >
                <Text
                    className={cn(
                        "font-black uppercase tracking-widest text-base",
                        isActive
                            ? "text-black dark:text-white"
                            : "text-gray-600 dark:text-gray-300"
                    )}
                >
                    {label}
                </Text>
            </View>
        </AnimatedPressable>
    );
}

export default function FilterTabs({activeFilter, onFilterChange}: FilterTabsProps) {
    const filters: { label: string; value: FilterType; rotation: string }[] = [
        {label: "All", value: "ALL", rotation: "-rotate-1"},
        {label: "Todo", value: "TODO", rotation: ""},
        {label: "Done", value: "DONE", rotation: "rotate-1"},
    ];

    return (
        <View className="mb-8 flex-row justify-between gap-4">
            {filters.map((f) => (
                <FilterTab
                    key={f.value}
                    label={f.label}
                    value={f.value}
                    isActive={activeFilter === f.value}
                    onPress={() => onFilterChange(f.value)}
                    rotationClass={f.rotation}
                />
            ))}
        </View>
    );
}