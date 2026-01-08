import React, { useState, useCallback, useRef } from "react";
import { View, Text, TextInput, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface CompactNumberInputProps {
    value: number;
    min: number;
    max: number;
    label: string;
    unit?: string;
    onChange: (value: number) => void;
    colorClass?: string;
}

export default function CompactNumberInput({
                                               value,
                                               min,
                                               max,
                                               label,
                                               unit = "min",
                                               onChange,
                                               colorClass = "bg-neo-accent",
                                           }: CompactNumberInputProps) {
    const [inputValue, setInputValue] = useState(value.toString());
    const inputRef = useRef<TextInput>(null);
    const colorScheme = useColorScheme();

    const handleChangeText = useCallback((text: string) => {
        // Only allow numeric characters
        const numericText = text.replace(/[^0-9]/g, "");
        setInputValue(numericText);
    }, []);

    const handleBlur = useCallback(async () => {
        let numValue = parseInt(inputValue, 10);

        // Handle empty or invalid input
        if (isNaN(numValue) || inputValue === "") {
            numValue = value; // Reset to previous value
        }

        // Clamp to min/max
        numValue = Math.max(min, Math.min(max, numValue));

        // Update state
        setInputValue(numValue.toString());

        if (numValue !== value) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(numValue);
        }
    }, [inputValue, value, min, max, onChange]);

    const handleFocus = useCallback(() => {
        // Select all text on focus for easy editing
        inputRef.current?.setSelection(0, inputValue.length);
    }, [inputValue.length]);

    return (
        <View className="flex-row items-center justify-between gap-3">
            {/* Label */}
            <View className="flex-1">
                <Text className="text-sm font-black uppercase tracking-tight text-black dark:text-white">
                    {label}
                </Text>
            </View>

            {/* Input Field */}
            <View className="flex-row items-center gap-2">
                <View
                    className={cn(
                        "border-4 border-black shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm",
                        colorClass
                    )}
                >
                    <TextInput
                        ref={inputRef}
                        value={inputValue}
                        onChangeText={handleChangeText}
                        onBlur={handleBlur}
                        onFocus={handleFocus}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        maxLength={2}
                        selectTextOnFocus
                        className="w-14 py-2 text-center text-xl font-black tabular-nums text-black"
                        placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
                    />
                </View>
                <Text className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 w-16">
                    {unit}
                </Text>
            </View>
        </View>
    );
}