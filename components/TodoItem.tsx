import React from "react";
import { View, Text, TouchableOpacity, Pressable, useColorScheme } from "react-native";
import Animated, {
    FadeInDown,
    Layout,
    SlideOutRight,
    withSpring,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// More varied, vibrant card colors
const CARD_COLORS = [
    "bg-neo-accent",     // Yellow
    "bg-neo-secondary",  // Cyan
    "bg-neo-primary",    // Neon Pink
    "bg-neo-purple",     // Electric Purple
    "bg-neo-green",      // Matrix Green
    "bg-neo-orange",     // Vivid Orange
];

interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
}

interface TodoItemProps {
    item: Todo;
    index: number;
    onToggle: (id: string) => void;
    onEdit: (todo: Todo) => void;
    onDelete: (id: string) => void;
}

export default function TodoItem({ item, index, onToggle, onEdit, onDelete }: TodoItemProps) {
    const colorScheme = useColorScheme();
    const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];

    // Animation for press feedback - bouncy and quick
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ],
    }));

    const handlePress = () => {
        // Quick, snappy bounce
        scale.value = withSpring(0.95, {
            damping: 15,
            stiffness: 400,
        });

        setTimeout(() => {
            scale.value = withSpring(1, {
                damping: 12,
                stiffness: 350,
            });
        }, 100);

        onToggle(item.id);
    };

    return (
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
            style={animatedStyle}
            className={cn(
                "mb-6 border-5 border-black p-5 shadow-brutal dark:border-white dark:shadow-brutal-dark",
                item.completed
                    ? "bg-gray-300 dark:bg-gray-700"
                    : `${colorClass} dark:bg-zinc-800`,
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
                            "h-10 w-10 border-5 border-black bg-white items-center justify-center shadow-brutal-sm dark:border-white dark:bg-black dark:shadow-brutal-dark-sm",
                            item.completed && "bg-black dark:bg-white"
                        )}
                    >
                        {item.completed && (
                            <Ionicons
                                name="checkmark-sharp"
                                size={24}
                                color={colorScheme === 'dark' ? 'black' : 'white'}
                                style={{ fontWeight: '900' }}
                            />
                        )}
                    </View>

                    <Text
                        className={cn(
                            "text-xl font-black uppercase text-black dark:text-white flex-1 tracking-tight",
                            item.completed && "line-through opacity-50"
                        )}
                    >
                        {item.text}
                    </Text>
                </TouchableOpacity>

                {/* Action Buttons - more aggressive styling */}
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={() => {
                            rotation.value = withSpring(-5, {
                                damping: 10,
                                stiffness: 300,
                            });
                            setTimeout(() => {
                                rotation.value = withSpring(0, {
                                    damping: 10,
                                    stiffness: 300,
                                });
                                onEdit(item);
                            }, 150);
                        }}
                        className="h-11 w-11 items-center justify-center border-5 border-black bg-neo-secondary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-white dark:bg-neo-green dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="pencil-sharp" size={20} color="black" />
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            rotation.value = withSpring(5, {
                                damping: 10,
                                stiffness: 300,
                            });
                            setTimeout(() => {
                                onDelete(item.id);
                            }, 100);
                        }}
                        className="h-11 w-11 items-center justify-center border-5 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-white dark:bg-neo-primary dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="trash-sharp" size={20} color="white" />
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}