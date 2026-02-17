import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

import {
    getPrivacyPolicy,
    getTermsOfService,
    LegalSection,
} from "@/utils/legalContent";
import { useColorScheme } from "@/hooks/use-color-scheme";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function LegalScreen() {
    const { type } = useLocalSearchParams<{ type: "privacy" | "terms" }>();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const isPrivacy = type === "privacy";
    const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
    const sections: LegalSection[] = isPrivacy
        ? getPrivacyPolicy()
        : getTermsOfService();

    return (
        <View className="flex-1 bg-neo-bg dark:bg-neo-dark">
            {/* Header */}
            <View className="flex-row items-center gap-3 border-b-5 border-black bg-neo-bg px-4 py-3 dark:border-neo-primary dark:bg-neo-dark">
                <Pressable
                    onPress={() => router.back()}
                    className="h-10 w-10 items-center justify-center border-4 border-black bg-white active:translate-x-[2px] active:translate-y-[2px] dark:border-neo-primary dark:bg-neo-dark-surface"
                >
                    <Ionicons
                        name="arrow-back-sharp"
                        size={22}
                        color={isDark ? "#FF0055" : "#000"}
                    />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                        {title}
                    </Text>
                </View>
                <View className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-accent dark:border-neo-primary">
                    <Ionicons
                        name={isPrivacy ? "shield-checkmark-sharp" : "document-text-sharp"}
                        size={20}
                        color="black"
                    />
                </View>
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    padding: 16,
                    paddingBottom: Math.max(insets.bottom, 16) + 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                {sections.map((section, index) => (
                    <Animated.View
                        key={section.title}
                        entering={FadeIn.delay(index * 50).duration(200)}
                        className={cn(
                            "mb-4 border-4 border-black bg-white p-4 dark:border-neo-primary dark:bg-neo-dark-surface",
                            index % 3 === 0 && "-rotate-[0.5deg]",
                            index % 3 === 2 && "rotate-[0.5deg]"
                        )}
                    >
                        <Text className="mb-2 text-base font-black uppercase tracking-tight text-black dark:text-white">
                            {section.title}
                        </Text>
                        <Text className="text-sm leading-5 font-bold text-gray-700 dark:text-gray-300">
                            {section.body}
                        </Text>
                    </Animated.View>
                ))}
            </ScrollView>
        </View>
    );
}
