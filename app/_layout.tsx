import {Stack} from "expo-router";
import "../global.css";
import {useColorScheme} from "@/hooks/use-color-scheme";
import {DarkTheme, DefaultTheme, ThemeProvider} from "@react-navigation/native";
import {StatusBar} from "expo-status-bar";
import {useEffect} from "react";
import {Platform, View} from "react-native";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import {useSafeAreaInsets} from "react-native-safe-area-context";

const COLORS = {
    light: {
        background: "#FFF8F0", // neo.bg
        statusBar: "dark",
    },
    dark: {
        background: "#0A0A0A", // neo.dark
        statusBar: "light",
    },
};

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = isDark ? COLORS.dark : COLORS.light;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (Platform.OS === "android") {
            SystemUI.setBackgroundColorAsync(theme.background);
            NavigationBar.setBackgroundColorAsync(theme.background);
            NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
        }
    }, [isDark, theme]);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: theme.background,
                paddingTop: insets.top,
                paddingLeft: insets.left,
                paddingRight: insets.right,
            }}
        >
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right'
                }}>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                </Stack>
                <StatusBar style={isDark ? "light" : "dark"}/>
            </ThemeProvider>
        </View>
    );
}