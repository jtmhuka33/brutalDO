import React from "react";
import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface BulkEditButtonProps {
    isActive: boolean;
    onToggle: () => void;
    selectedCount: number;
}

export default function BulkEditButton({ isActive, onToggle, selectedCount }: BulkEditButtonProps) {
    const handlePress = () => {
        console.log("Button pressed, calling onToggle");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onToggle();
    };

    return (
        <Pressable
            onPress={handlePress}
            className="relative mr-4"
        >
            <View
                className={`h-14 w-14 items-center justify-center border-5 border-black shadow-brutal-sm dark:border-neo-primary dark:shadow-brutal-dark-sm ${
                    isActive ? "bg-neo-primary" : "bg-white dark:bg-neo-dark-surface"
                }`}
            >
                <Ionicons
                    name={isActive ? "checkmark-done-sharp" : "checkbox-outline"}
                    size={24}
                    color={isActive ? "white" : "#FF0055"}
                />
            </View>
            {isActive && selectedCount > 0 && (
                <View className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center border-3 border-black bg-neo-accent">
                    <Text className="text-xs font-black text-black">
                        {selectedCount > 99 ? "99+" : selectedCount}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}