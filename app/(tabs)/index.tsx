// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Ionicons } from "@expo/vector-icons";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number; // Store a random color index
}

const STORAGE_KEY = "@neo_brutal_todos_v2";

// Cycle through these for list items to make it colorful
const CARD_COLORS = [
    "bg-neo-accent",   // Yellow
    "bg-neo-secondary", // Cyan
    "bg-neo-primary",  // Pink
    "bg-neo-purple",   // Purple
    "bg-white"
];

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const colorScheme = useColorScheme();

    useEffect(() => { loadTodos(); }, []);
    useEffect(() => { saveTodos(todos); }, [todos]);

    const loadTodos = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setTodos(JSON.parse(stored));
        } catch (e) { console.error("Failed to load todos"); }
    };

    const saveTodos = async (newTodos: Todo[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
        } catch (e) { console.error("Failed to save todos"); }
    };

    const handleAddOrUpdate = () => {
        if (!text.trim()) return;

        if (editingId) {
            setTodos((prev) =>
                prev.map((t) => (t.id === editingId ? { ...t, text: text.trim() } : t))
            );
            setEditingId(null);
        } else {
            const newTodo: Todo = {
                id: Date.now().toString(),
                text: text.trim(),
                completed: false,
                // Assign a random color variant on creation
                colorVariant: Math.floor(Math.random() * CARD_COLORS.length),
            };
            setTodos((prev) => [newTodo, ...prev]);
        }
        setText("");
    };

    const toggleComplete = (id: string) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
        );
    };

    const deleteTodo = (id: string) => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
    };

    const startEditing = (todo: Todo) => {
        setText(todo.text);
        setEditingId(todo.id);
    };

    const renderItem = ({ item, index }: { item: Todo; index: number }) => {
        // Fallback to 0 if variant missing
        const colorClass = CARD_COLORS[item.colorVariant ?? index % CARD_COLORS.length];

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100)}
                layout={Layout.springify()}
                className={cn(
                    "mb-5 border-4 border-black p-4 shadow-brutal dark:border-white dark:shadow-brutal-dark",
                    item.completed
                        ? "bg-gray-200 dark:bg-gray-800"
                        : `${colorClass} dark:bg-zinc-800`
                )}
                // Slight rotation for that "messy" feel could be added here with style={{ transform: [{ rotate: '-1deg' }] }}
            >
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={() => toggleComplete(item.id)}
                        className="flex-1 flex-row items-center gap-4"
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
                                    name="checkmark-sharp" // Sharp icons fit better
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
                            onPress={() => startEditing(item)}
                            className="h-10 w-10 items-center justify-center border-4 border-black bg-white shadow-brutal-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-white dark:bg-zinc-900 dark:shadow-brutal-dark-sm"
                        >
                            <Ionicons name="pencil-sharp" size={18} color={colorScheme === 'dark' ? "white" : "black"} />
                        </Pressable>

                        <Pressable
                            onPress={() => deleteTodo(item.id)}
                            className="h-10 w-10 items-center justify-center border-4 border-black bg-neo-primary shadow-brutal-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:border-white dark:bg-neo-primary dark:shadow-brutal-dark-sm"
                        >
                            <Ionicons name="trash-sharp" size={18} color="white" />
                        </Pressable>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View className="flex-1 bg-neo-bg px-5 pt-20 dark:bg-neo-dark">
            <StatusBar style="auto" />

            <View className="mb-10">
                <Text className="text-6xl font-black uppercase tracking-tighter text-black dark:text-white">
                    Brutal
                    <Text className="text-neo-primary underline decoration-4 decoration-black dark:decoration-white">Do</Text>
                    <Text className="text-neo-secondary">.</Text>
                </Text>
                <Text className="mt-2 text-lg font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    No-Nonsense Tasks
                </Text>
            </View>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="mb-8 flex-row gap-4"
            >
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder={editingId ? "EDIT TASK..." : "WHAT NEEDS DOING?"}
                    placeholderTextColor={colorScheme === 'dark' ? "#666" : "#888"}
                    className="flex-1 border-4 border-black bg-white p-4 font-black text-lg text-black shadow-brutal dark:border-white dark:bg-zinc-900 dark:text-white dark:shadow-brutal-dark"
                />

                <TouchableOpacity
                    onPress={handleAddOrUpdate}
                    activeOpacity={0.8}
                    className={cn(
                        "items-center justify-center border-4 border-black px-6 shadow-brutal active:translate-x-[5px] active:translate-y-[5px] active:shadow-none dark:border-white dark:shadow-brutal-dark",
                        editingId ? "bg-neo-secondary" : "bg-neo-accent"
                    )}
                >
                    <Ionicons
                        name={editingId ? "save-sharp" : "add-sharp"}
                        size={32}
                        color="black"
                    />
                </TouchableOpacity>
            </KeyboardAvoidingView>

            {/* List */}
            <FlatList
                data={todos}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerClassName="pb-24"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="mt-24 items-center justify-center border-4 border-dashed border-gray-300 p-10 dark:border-gray-700">
                        <Text className="text-2xl font-black text-gray-400 dark:text-gray-600">
                            NOTHING TO DO
                        </Text>
                        <Text className="font-bold text-gray-400 dark:text-gray-600">
                            (SLACKER)
                        </Text>
                    </View>
                }
            />
        </View>
    );
}