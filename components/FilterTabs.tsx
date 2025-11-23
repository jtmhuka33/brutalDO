import React from "react";
import { View, Text, Pressable } from "react-native";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

type FilterType = "ALL" | "TODO" | "DONE";

interface FilterTabsProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export default function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
    const filters: { label: string; value: FilterType }[] = [
        { label: "All", value: "ALL" },
        { label: "Todo", value: "TODO" },
        { label: "Done", value: "DONE" },
    ];

    return (
        <View className="mb-6 flex-row justify-between gap-3">
            {filters.map((f) => {
                const isActive = activeFilter === f.value;
                return (
                    <Pressable
                        key={f.value}
                        onPress={() => onFilterChange(f.value)}
                        // Keep only static layout classes on the Pressable to avoid the NativeWind/Router crash
                        className="flex-1"
                    >
                        {({ pressed }) => (
                            <View
                                className={cn(
                                    "items-center justify-center border-4 border-black py-3 transition-all",
                                    // Apply Active (Selected) Styles
                                    isActive
                                        ? "bg-neo-accent translate-x-[4px] translate-y-[4px] shadow-none dark:bg-neo-primary"
                                        : "bg-white shadow-brutal dark:bg-zinc-900 dark:shadow-brutal-dark",
                                    // Apply Pressed (Interacting) Styles manually
                                    // We use the 'pressed' prop to trigger the style change on the View
                                    pressed && !isActive && "translate-x-[2px] translate-y-[2px] shadow-brutal-sm"
                                )}
                            >
                                <Text
                                    className={cn(
                                        "font-black uppercase tracking-widest",
                                        isActive ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400"
                                    )}
                                >
                                    {f.label}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
}