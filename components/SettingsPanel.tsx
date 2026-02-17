import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
    Alert,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    FadeIn,
    FadeOut,
    SlideInUp,
    SlideOutUp,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { useSettings } from "@/context/SettingsContext";
import { useUser } from "@/context/UserContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { POMODORO_LIMITS } from "@/types/settings";
import { FREE_TIER_LIMITS } from "@/types/subscription";
import { canCustomizePomodoro } from "@/utils/featureGates";
import CompactNumberInput from "./CompactNumberInput";
import PaywallSheet from "./PaywallSheet";

interface SettingsPanelProps {
    visible: boolean;
    onClose: () => void;
    onDismissAll?: () => void;
}

export default function SettingsPanel({ visible, onClose, onDismissAll }: SettingsPanelProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const { settings, updatePomodoroSettings, resetPomodoroSettings } = useSettings();
    const { userId } = useUser();
    const { isPremium, devSetPremium } = useSubscription();
    const [showPaywall, setShowPaywall] = useState(false);

    const canCustomize = canCustomizePomodoro(isPremium);

    const handleClose = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    }, [onClose]);

    const handleResetPomodoro = useCallback(() => {
        Alert.alert(
            "Reset Timer Settings?",
            "This will restore all Pomodoro timer settings to their default values.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await resetPomodoroSettings();
                    },
                },
            ]
        );
    }, [resetPomodoroSettings]);

    const handleCopyUserId = useCallback(async () => {
        if (userId) {
            await Clipboard.setStringAsync(userId);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Copied!", "User ID copied to clipboard");
        }
    }, [userId]);

    const handleWorkDurationChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ workDuration: value });
        },
        [updatePomodoroSettings]
    );

    const handleShortBreakChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ shortBreakDuration: value });
        },
        [updatePomodoroSettings]
    );

    const handleLongBreakChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ longBreakDuration: value });
        },
        [updatePomodoroSettings]
    );

    const handleSessionsChange = useCallback(
        (value: number) => {
            updatePomodoroSettings({ sessionsBeforeLongBreak: value });
        },
        [updatePomodoroSettings]
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            {/* Backdrop */}
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="flex-1 bg-black/70"
            >
                <Pressable
                    onPress={handleClose}
                    className="flex-1"
                />
            </Animated.View>

            {/* Settings Card - Overlays from top */}
            <Animated.View
                entering={SlideInUp.duration(300).easing(Easing.out(Easing.quad))}
                exiting={SlideOutUp.duration(250).easing(Easing.in(Easing.quad))}
                className="absolute left-4 right-4 bg-neo-bg dark:bg-neo-dark border-5 border-black dark:border-neo-primary shadow-brutal-lg dark:shadow-brutal-dark-lg"
                style={{
                    top: insets.top + 16,
                    maxHeight: "80%",
                }}
            >
                {/* Header */}
                <View className="flex-row items-center justify-between border-b-5 border-black bg-neo-primary px-4 py-3 dark:border-neo-primary">
                    <View className="flex-row items-center gap-3">
                        <View className="h-8 w-8 items-center justify-center border-3 border-white bg-white">
                            <Ionicons name="settings-sharp" size={18} color="#FF0055" />
                        </View>
                        <Text className="text-xl font-black uppercase tracking-tight text-white">
                            Settings
                        </Text>
                    </View>
                    <Pressable
                        onPress={handleClose}
                        className="h-10 w-10 items-center justify-center border-4 border-white bg-white active:bg-gray-100"
                    >
                        <Ionicons name="close-sharp" size={22} color="#FF0055" />
                    </Pressable>
                </View>

                {/* Content */}
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 24,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* User Badge Section */}
                    <Animated.View entering={FadeIn.delay(50).duration(200)}>
                        <Pressable
                            onPress={handleCopyUserId}
                            className="mb-5 flex-row items-center gap-3 border-5 border-black bg-neo-secondary p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:shadow-brutal-dark-sm -rotate-1"
                        >
                            <View className="h-10 w-10 items-center justify-center border-4 border-black bg-white dark:border-neo-primary">
                                <Ionicons name="person-sharp" size={20} color="#FF0055" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-black uppercase tracking-widest text-black/60">
                                    User ID
                                </Text>
                                <Text className="text-base font-black uppercase tracking-tight text-black">
                                    {userId || "Loading..."}
                                </Text>
                            </View>
                            <View className="h-8 w-8 items-center justify-center border-3 border-black bg-white dark:border-neo-primary">
                                <Ionicons name="copy-sharp" size={14} color="black" />
                            </View>
                        </Pressable>
                    </Animated.View>

                    {/* Pomodoro Timer Section */}
                    <Animated.View entering={FadeIn.delay(100).duration(200)}>
                        <View className="mb-4 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                                <View className="h-8 w-8 items-center justify-center border-4 border-black bg-neo-primary dark:border-neo-primary">
                                    <Ionicons name="timer-sharp" size={16} color="white" />
                                </View>
                                <Text className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                                    Pomodoro Timer
                                </Text>
                            </View>
                            {!canCustomize && (
                                <View className="border-2 border-neo-purple bg-neo-purple/20 px-2 py-0.5">
                                    <Text className="text-[10px] font-black uppercase text-neo-purple">
                                        Premium
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="border-5 border-black bg-white p-4 shadow-brutal-sm dark:border-neo-primary dark:bg-neo-dark-surface dark:shadow-brutal-dark-sm">
                            {canCustomize ? (
                                <View className="gap-4">
                                    {/* Work Duration */}
                                    <CompactNumberInput
                                        label="Focus Duration"
                                        value={settings.pomodoro.workDuration}
                                        min={POMODORO_LIMITS.workDuration.min}
                                        max={POMODORO_LIMITS.workDuration.max}
                                        unit="min"
                                        onChange={handleWorkDurationChange}
                                        colorClass="bg-neo-primary"
                                    />

                                    {/* Short Break Duration */}
                                    <CompactNumberInput
                                        label="Short Break"
                                        value={settings.pomodoro.shortBreakDuration}
                                        min={POMODORO_LIMITS.shortBreakDuration.min}
                                        max={POMODORO_LIMITS.shortBreakDuration.max}
                                        unit="min"
                                        onChange={handleShortBreakChange}
                                        colorClass="bg-neo-green"
                                    />

                                    {/* Long Break Duration */}
                                    <CompactNumberInput
                                        label="Long Break"
                                        value={settings.pomodoro.longBreakDuration}
                                        min={POMODORO_LIMITS.longBreakDuration.min}
                                        max={POMODORO_LIMITS.longBreakDuration.max}
                                        unit="min"
                                        onChange={handleLongBreakChange}
                                        colorClass="bg-neo-purple"
                                    />

                                    {/* Sessions Before Long Break */}
                                    <CompactNumberInput
                                        label="Sessions Before Long Break"
                                        value={settings.pomodoro.sessionsBeforeLongBreak}
                                        min={POMODORO_LIMITS.sessionsBeforeLongBreak.min}
                                        max={POMODORO_LIMITS.sessionsBeforeLongBreak.max}
                                        unit="sessions"
                                        onChange={handleSessionsChange}
                                        colorClass="bg-neo-orange"
                                    />
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {/* Locked: Read-only display of default values */}
                                    <View className="flex-row items-center justify-between border-3 border-gray-300 bg-gray-100 p-3 dark:border-gray-600 dark:bg-neo-dark-elevated">
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons name="time-sharp" size={16} color="#FF0055" />
                                            <Text className="text-sm font-black uppercase text-gray-600 dark:text-gray-300">
                                                Focus Duration
                                            </Text>
                                        </View>
                                        <Text className="text-lg font-black text-gray-500 dark:text-gray-400">
                                            {FREE_TIER_LIMITS.pomodoroDefaults.workDuration} min
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center justify-between border-3 border-gray-300 bg-gray-100 p-3 dark:border-gray-600 dark:bg-neo-dark-elevated">
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons name="cafe-sharp" size={16} color="#00FF41" />
                                            <Text className="text-sm font-black uppercase text-gray-600 dark:text-gray-300">
                                                Short Break
                                            </Text>
                                        </View>
                                        <Text className="text-lg font-black text-gray-500 dark:text-gray-400">
                                            {FREE_TIER_LIMITS.pomodoroDefaults.shortBreakDuration} min
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center justify-between border-3 border-gray-300 bg-gray-100 p-3 dark:border-gray-600 dark:bg-neo-dark-elevated">
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons name="bed-sharp" size={16} color="#B000FF" />
                                            <Text className="text-sm font-black uppercase text-gray-600 dark:text-gray-300">
                                                Long Break
                                            </Text>
                                        </View>
                                        <Text className="text-lg font-black text-gray-500 dark:text-gray-400">
                                            {FREE_TIER_LIMITS.pomodoroDefaults.longBreakDuration} min
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center justify-between border-3 border-gray-300 bg-gray-100 p-3 dark:border-gray-600 dark:bg-neo-dark-elevated">
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons name="repeat-sharp" size={16} color="#FF6B00" />
                                            <Text className="text-sm font-black uppercase text-gray-600 dark:text-gray-300">
                                                Sessions
                                            </Text>
                                        </View>
                                        <Text className="text-lg font-black text-gray-500 dark:text-gray-400">
                                            {FREE_TIER_LIMITS.pomodoroDefaults.sessionsBeforeLongBreak}
                                        </Text>
                                    </View>

                                    {/* Unlock Button */}
                                    <Pressable
                                        onPress={async () => {
                                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setShowPaywall(true);
                                        }}
                                        className="mt-2 flex-row items-center justify-center gap-2 border-4 border-neo-purple bg-neo-purple p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:shadow-brutal-dark-sm"
                                    >
                                        <Ionicons name="diamond-sharp" size={18} color="white" />
                                        <Text className="text-sm font-black uppercase text-white">
                                            Unlock Custom Timers
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* Timer Info */}
                    <Animated.View entering={FadeIn.delay(150).duration(200)}>
                        <View className="mt-4 border-5 border-dashed border-gray-400 bg-white/50 p-3 dark:border-neo-primary dark:bg-neo-dark-surface/50">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Ionicons
                                    name="information-circle-sharp"
                                    size={16}
                                    color={colorScheme === "dark" ? "#FF0055" : "#666"}
                                />
                                <Text className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                    How It Works
                                </Text>
                            </View>
                            <Text className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-4">
                                Complete {settings.pomodoro.sessionsBeforeLongBreak} focus sessions of{" "}
                                {settings.pomodoro.workDuration} min with {settings.pomodoro.shortBreakDuration} min breaks.
                                After all sessions, take a {settings.pomodoro.longBreakDuration} min long break!
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Reset Button - Only show for premium users */}
                    {canCustomize && (
                        <Animated.View entering={FadeIn.delay(200).duration(200)}>
                            <Pressable
                                onPress={handleResetPomodoro}
                                className="mt-4 flex-row items-center justify-center gap-2 border-5 border-black bg-gray-300 p-3 shadow-brutal-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:border-neo-primary dark:bg-neo-dark-elevated dark:shadow-brutal-dark-sm rotate-1"
                            >
                                <Ionicons
                                    name="refresh-sharp"
                                    size={20}
                                    color={colorScheme === "dark" ? "white" : "black"}
                                />
                                <Text className="text-sm font-black uppercase tracking-tight text-black dark:text-white">
                                    Reset to Defaults
                                </Text>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* Future Settings Placeholder */}
                    <Animated.View entering={FadeIn.delay(250).duration(200)}>
                        <View className="mt-4 border-t-4 border-dashed border-gray-300 pt-4 dark:border-gray-700">
                            <View className="items-center justify-center py-4">
                                <View className="h-12 w-12 items-center justify-center border-4 border-dashed border-gray-400 dark:border-gray-600">
                                    <Ionicons
                                        name="construct-outline"
                                        size={24}
                                        color={colorScheme === "dark" ? "#666" : "#999"}
                                    />
                                </View>
                                <Text className="mt-2 text-center text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-600">
                                    More Settings Coming Soon
                                </Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Developer Tools - Only visible in development */}
                    {__DEV__ && (
                        <Animated.View entering={FadeIn.delay(300).duration(200)}>
                            <View className="mt-4 border-t-4 border-dashed border-neo-primary pt-4">
                                <View className="mb-3 flex-row items-center gap-2">
                                    <View className="h-8 w-8 items-center justify-center border-4 border-neo-primary bg-neo-primary">
                                        <Ionicons name="bug-sharp" size={16} color="white" />
                                    </View>
                                    <Text className="text-base font-black uppercase tracking-tight text-neo-primary">
                                        Developer Tools
                                    </Text>
                                </View>

                                <View className="border-5 border-neo-primary bg-neo-primary/10 p-4">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View>
                                            <Text className="text-sm font-black uppercase text-black dark:text-white">
                                                Premium Status
                                            </Text>
                                            <Text className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                                Toggle for testing paywalls
                                            </Text>
                                        </View>
                                        <View className={`px-3 py-1 border-3 ${isPremium ? "border-neo-green bg-neo-green" : "border-gray-400 bg-gray-300"}`}>
                                            <Text className={`text-xs font-black uppercase ${isPremium ? "text-black" : "text-gray-600"}`}>
                                                {isPremium ? "Premium" : "Free"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row gap-2">
                                        <Pressable
                                            onPress={() => devSetPremium(false)}
                                            className={`flex-1 items-center justify-center border-4 p-3 ${
                                                !isPremium
                                                    ? "border-black bg-gray-400"
                                                    : "border-gray-400 bg-white active:bg-gray-100 dark:bg-neo-dark-surface"
                                            }`}
                                        >
                                            <Text className={`text-sm font-black uppercase ${!isPremium ? "text-white" : "text-black dark:text-white"}`}>
                                                Set Free
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => devSetPremium(true)}
                                            className={`flex-1 items-center justify-center border-4 p-3 ${
                                                isPremium
                                                    ? "border-neo-green bg-neo-green"
                                                    : "border-neo-green bg-white active:bg-gray-100 dark:bg-neo-dark-surface"
                                            }`}
                                        >
                                            <Text className={`text-sm font-black uppercase ${isPremium ? "text-black" : "text-neo-green"}`}>
                                                Set Premium
                                            </Text>
                                        </Pressable>
                                    </View>

                                    <Text className="mt-3 text-[10px] font-bold text-center text-neo-primary uppercase">
                                        This section is only visible in development builds
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Paywall Sheet */}
            <PaywallSheet
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
                onDismissAll={() => {
                    onClose();
                    onDismissAll?.();
                }}
                featureContext="custom Pomodoro timers"
            />
        </Modal>
    );
}