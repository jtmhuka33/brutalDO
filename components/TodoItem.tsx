import React from "react";
import { View, Text, TouchableOpacity, Pressable, useColorScheme } from "react-native";
import Animated, { FadeInDown, Layout, SlideOutRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Card colors to cycle through
const CARD_COLORS = [
    "bg-neo-accent",   // Yellow
    "bg-neo-secondary", // Cyan
    "bg-neo-primary",  // Pink
    "bg-neo-purple",   // Purple
    "bg-white"
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

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            // This handles the "flick" animation when the item leaves the list
            exiting={SlideOutRight.springify().damping(14)}
            layout={Layout.springify()}
            className={cn(
                "mb-5 border-4 border-black p-4 shadow-brutal dark:border-white dark:shadow-brutal-dark",
                item.completed
                    ? "bg-gray-200 dark:bg-gray-800"
                    : `${colorClass} dark:bg-zinc-800`
            )}
        >
            <View className="flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => onToggle(item.id)}
                    className="flex-1 flex-row items-center gap-4"
                    activeOpacity={0.7}
                >
                    {/* Checkbox */}
                    <View
                        className={cn(
                            "h-8 w-8 border-4 border-black bg-white items-center justify-center dark:border-white dark:bg-black",
                            item.completed && "bg-black dark:bg-white"
                        )}
                    >
                        {item.completed && (
                            <Ionicons
                                name="checkmark-sharp"
                                size={20}
                                color={colorScheme === 'dark' ? 'black' : 'white'}
                                style={{ fontWeight: '900' }}
                            />
                        )}
                    </View>

                    <Text
                        className={cn(
                            "text-xl font-black uppercase text-black dark:text-white flex-1",
                            item.completed && "line-through opacity-40"
                        )}
                    >
                        {item.text}
                    </Text>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={() => onEdit(item)}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-white shadow-brutal-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-white dark:bg-zinc-900 dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="pencil-sharp" size={18} color={colorScheme === 'dark' ? "white" : "black"} />
                    </Pressable>

                    <Pressable
                        onPress={() => onDelete(item.id)}
                        className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-white dark:bg-neo-primary dark:shadow-brutal-dark-sm"
                    >
                        <Ionicons name="trash-sharp" size={18} color="white" />
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}