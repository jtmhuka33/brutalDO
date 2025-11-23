import { Stack } from "expo-router";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";

// Define your theme colors from tailwind.config.js
const COLORS = {
    light: {
        background: "#E0E7F1", // neo.bg
        statusBar: "dark",
    },
    dark: {
        background: "#1a1a1a", // neo.dark
        statusBar: "light",
    },
};

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = isDark ? COLORS.dark : COLORS.light;

    useEffect(() => {
        if (Platform.OS === "android") {
            // 1. Set Root View Background (prevents white flash on startup/rotation)
            SystemUI.setBackgroundColorAsync(theme.background);

            // 2. Color the bottom navigation bar to match the app background
            NavigationBar.setBackgroundColorAsync(theme.background);

            // 3. Ensure icons in the bottom bar contrast correctly
            NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
        }
    }, [isDark]);

    return (
        // Apply background color here to cover the notch/edge areas seamlessly
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right'
                }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
                {/* Explicitly set status bar style for better control */}
                <StatusBar style={isDark ? "light" : "dark"} />
            </ThemeProvider>
        </SafeAreaView>
    );
}