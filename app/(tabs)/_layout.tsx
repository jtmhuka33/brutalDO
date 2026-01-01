import "../../global.css";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: isDark ? "#0A0A0A" : "#FFF8F0",
                paddingTop: insets.top,
                paddingLeft: insets.left,
                paddingRight: insets.right,
            }}
        >
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="zen" options={{ headerShown: false }} />
                <Stack.Screen name="pick-project" options={{ headerShown: false }} />
            </Stack>
        </View>
    );
}