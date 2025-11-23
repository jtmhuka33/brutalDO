// app/index.tsx
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

// Utility for cleaner tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

// --- Constants ---
const STORAGE_KEY = "@neo_brutal_todos";

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const colorScheme = useColorScheme();

    // Load Todos on Mount
    useEffect(() => {
        loadTodos();
    }, []);

    // Save Todos whenever they change
    useEffect(() => {
        saveTodos(todos);
    }, [todos]);

    const loadTodos = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setTodos(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to load todos");
        }
    };

    const saveTodos = async (newTodos: Todo[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
        } catch (e) {
            console.error("Failed to save todos");
        }
    };

    const handleAddOrUpdate = () => {
        if (!text.trim()) return;

        if (editingId) {
            // Edit existing
            setTodos((prev) =>
                prev.map((t) => (t.id === editingId ? { ...t, text: text.trim() } : t))
            );
            setEditingId(null);
        } else {
            // Add new
            const newTodo: Todo = {
                id: Date.now().toString(),
                text: text.trim(),
                completed: false,
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

    // --- UI Components ---

    const renderItem = ({ item, index }: { item: Todo; index: number }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 100)}
            layout={Layout.springify()}
            className={cn(
                "mb-4 border-2 border-black p-4 shadow-brutal dark:border-white dark:shadow-brutal-dark",
                item.completed ? "bg-gray-300 dark:bg-gray-800" : "bg-neo-accent dark:bg-indigo-500"
            )}
        >
            <View className="flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => toggleComplete(item.id)}
                    className="flex-1 flex-row items-center gap-3"
                >
                    <View
                        className={cn(
                            "h-6 w-6 border-2 border-black bg-white dark:border-white dark:bg-black items-center justify-center",
                            item.completed && "bg-black dark:bg-white"
                        )}
                    >
                        {item.completed && (
                            <Ionicons
                                name="checkmark"
                                size={16}
                                color={colorScheme === 'dark' ? 'black' : 'white'}
                            />
                        )}
                    </View>

                    <Text
                        className={cn(
                            "text-lg font-bold text-black dark:text-white",
                            item.completed && "line-through opacity-50"
                        )}
                    >
                        {item.item}
                        {item.text}
                    </Text>
                </TouchableOpacity>

                <View className="flex-row gap-2">
                    <Pressable
                        onPress={() => startEditing(item)}
                        className="h-8 w-8 items-center justify-center border-2 border-black bg-neo-secondary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-teal-700 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    >
                        <Ionicons name="pencil" size={16} color="white" />
                    </Pressable>

                    <Pressable
                        onPress={() => deleteTodo(item.id)}
                        className="h-8 w-8 items-center justify-center border-2 border-black bg-neo-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-red-700 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    >
                        <Ionicons name="trash" size={16} color="white" />
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View className="flex-1 bg-neo-bg px-5 pt-16 dark:bg-neo-dark">
            <StatusBar style="auto" />

            <View className="mb-8">
                <Text className="text-4xl font-black uppercase tracking-widest text-black shadow-black drop-shadow-md dark:text-white">
                    Brutal<Text className="text-neo-primary">Do</Text>.
                </Text>
            </View>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="mb-6 flex-row gap-3"
            >
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder={editingId ? "Edit task..." : "What needs doing?"}
                    placeholderTextColor={colorScheme === 'dark' ? "#888" : "#666"}
                    className="flex-1 border-2 border-black bg-white p-4 font-bold text-black shadow-brutal dark:border-white dark:bg-black dark:text-white dark:shadow-brutal-dark"
                />
                <TouchableOpacity
                    onPress={handleAddOrUpdate}
                    className={cn(
                        "items-center justify-center border-2 border-black px-6 shadow-brutal active:translate-y-1 active:shadow-none dark:border-white dark:shadow-brutal-dark",
                        editingId ? "bg-neo-secondary" : "bg-neo-primary"
                    )}
                >
                    <Ionicons
                        name={editingId ? "save" : "add"}
                        size={24}
                        color="white"
                        style={{ fontWeight: "bold" }}
                    />
                </TouchableOpacity>
            </KeyboardAvoidingView>

            {/* List */}
            <FlatList
                data={todos}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerClassName="pb-20"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="mt-20 items-center justify-center opacity-50">
                        <Text className="text-xl font-bold text-black dark:text-white">
                            NOTHING TO DO
                        </Text>
                        <Text className="text-black dark:text-white">
                            (Try adding something)
                        </Text>
                    </View>
                }
            />
        </View>
    );
}