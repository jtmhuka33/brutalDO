import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import TodoItem from "@/components/TodoItem";
import FilterTabs from "@/components/FilterTabs";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
}

type FilterType = "ALL" | "TODO" | "DONE";

// --- Constants ---
const STORAGE_KEY = "@neo_brutal_todos_v2";

// Cycle through these for new items
const CARD_COLORS_COUNT = 5;

export default function TodoApp() {
    const [text, setText] = useState("");
    const [todos, setTodos] = useState<Todo[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("ALL");
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
                colorVariant: Math.floor(Math.random() * CARD_COLORS_COUNT),
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

    // Filter Logic
    const filteredTodos = useMemo(() => {
        switch (filter) {
            case "TODO":
                return todos.filter((t) => !t.completed);
            case "DONE":
                return todos.filter((t) => t.completed);
            default:
                return todos;
        }
    }, [todos, filter]);

    return (
        <View className="flex-1 bg-neo-bg px-5 pt-20 dark:bg-neo-dark">
            <StatusBar style="auto" />

            {/* Header */}
            <View className="mb-8">
                <Text className="text-6xl font-black uppercase tracking-tighter text-black dark:text-white">
                    Brutal
                    <Text className="text-neo-primary underline decoration-4 decoration-black dark:decoration-white">Do</Text>
                    <Text className="text-neo-secondary">.</Text>
                </Text>
            </View>

            {/* Filter Tabs */}
            <FilterTabs activeFilter={filter} onFilterChange={setFilter} />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="mb-6 flex-row gap-4"
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
                data={filteredTodos}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <TodoItem
                        item={item}
                        index={index}
                        onToggle={toggleComplete}
                        onEdit={startEditing}
                        onDelete={deleteTodo}
                    />
                )}
                contentContainerClassName="pb-24"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="mt-10 items-center justify-center border-4 border-dashed border-gray-300 p-10 dark:border-gray-700">
                        <Text className="text-2xl font-black text-gray-400 dark:text-gray-600">
                            {filter === 'TODO' ? "ALL CLEAR" : "NOTHING HERE"}
                        </Text>
                        <Text className="font-bold text-gray-400 dark:text-gray-600">
                            {filter === 'TODO' ? "(Go relax)" : "(Get to work)"}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}