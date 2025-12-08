import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TodoList, DEFAULT_LIST, DEFAULT_LIST_ID } from "@/types/todoList";

const LISTS_STORAGE_KEY = "@neo_brutal_lists_v1";

interface TodoListContextType {
    lists: TodoList[];
    selectedListId: string;
    selectedList: TodoList | undefined;
    setSelectedListId: (id: string) => void;
    addList: (name: string) => Promise<TodoList>;
    updateList: (id: string, name: string) => Promise<void>;
    deleteList: (id: string) => Promise<void>;
    loadLists: () => Promise<void>;
}

const TodoListContext = createContext<TodoListContextType | undefined>(undefined);

export function TodoListProvider({ children }: { children: ReactNode }) {
    const [lists, setLists] = useState<TodoList[]>([DEFAULT_LIST]);
    const [selectedListId, setSelectedListId] = useState<string>(DEFAULT_LIST_ID);

    const loadLists = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(LISTS_STORAGE_KEY);
            if (stored) {
                const parsedLists: TodoList[] = JSON.parse(stored);
                // Ensure default list always exists
                const hasDefault = parsedLists.some(l => l.id === DEFAULT_LIST_ID);
                if (!hasDefault) {
                    setLists([DEFAULT_LIST, ...parsedLists]);
                } else {
                    setLists(parsedLists);
                }
            } else {
                setLists([DEFAULT_LIST]);
            }
        } catch (e) {
            console.error("Failed to load lists", e);
            setLists([DEFAULT_LIST]);
        }
    }, []);

    const saveLists = async (newLists: TodoList[]) => {
        try {
            await AsyncStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(newLists));
        } catch (e) {
            console.error("Failed to save lists", e);
        }
    };

    useEffect(() => {
        loadLists();
    }, [loadLists]);

    const addList = useCallback(async (name: string): Promise<TodoList> => {
        const newList: TodoList = {
            id: Date.now().toString(),
            name: name.trim(),
            colorVariant: Math.floor(Math.random() * 6),
            createdAt: new Date().toISOString(),
        };
        const newLists = [...lists, newList];
        setLists(newLists);
        await saveLists(newLists);
        return newList;
    }, [lists]);

    const updateList = useCallback(async (id: string, name: string) => {
        const newLists = lists.map(l =>
            l.id === id ? { ...l, name: name.trim() } : l
        );
        setLists(newLists);
        await saveLists(newLists);
    }, [lists]);

    const deleteList = useCallback(async (id: string) => {
        if (id === DEFAULT_LIST_ID) return; // Can't delete default list
        const newLists = lists.filter(l => l.id !== id);
        setLists(newLists);
        await saveLists(newLists);
        if (selectedListId === id) {
            setSelectedListId(DEFAULT_LIST_ID);
        }
    }, [lists, selectedListId]);

    const selectedList = lists.find(l => l.id === selectedListId);

    return (
        <TodoListContext.Provider
            value={{
                lists,
                selectedListId,
                selectedList,
                setSelectedListId,
                addList,
                updateList,
                deleteList,
                loadLists,
            }}
        >
            {children}
        </TodoListContext.Provider>
    );
}

export function useTodoList() {
    const context = useContext(TodoListContext);
    if (!context) {
        throw new Error("useTodoList must be used within a TodoListProvider");
    }
    return context;
}