import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Todo, getReminders } from "@/types/todo";
import { cancelNotification } from "@/utils/notifications";

const STORAGE_KEY = "@neo_brutal_todos_v2";

interface BulkEditContextType {
    isBulkMode: boolean;
    selectedIds: Set<string>;
    enterBulkMode: () => void;
    exitBulkMode: () => void;
    toggleSelection: (id: string) => void;
    selectAll: (ids: string[]) => void;
    deselectAll: () => void;
    deleteTasks: () => Promise<Todo[]>;
    moveTasks: (targetListId: string) => Promise<void>;
    setTodosRef: (todos: Todo[], setTodos: React.Dispatch<React.SetStateAction<Todo[]>>) => void;
}

const BulkEditContext = createContext<BulkEditContextType | undefined>(undefined);

export function BulkEditProvider({ children }: { children: ReactNode }) {
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const todosRef = useRef<Todo[]>([]);
    const setTodosCallbackRef = useRef<React.Dispatch<React.SetStateAction<Todo[]>> | null>(null);

    const setTodosRef = useCallback((todos: Todo[], setTodos: React.Dispatch<React.SetStateAction<Todo[]>>) => {
        todosRef.current = todos;
        setTodosCallbackRef.current = setTodos;
    }, []);

    const enterBulkMode = useCallback(() => {
        setIsBulkMode(true);
        setSelectedIds(new Set());
    }, []);

    const exitBulkMode = useCallback(() => {
        setIsBulkMode(false);
        setSelectedIds(new Set());
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids));
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const deleteTasks = useCallback(async (): Promise<Todo[]> => {
        const todos = todosRef.current;
        const setTodos = setTodosCallbackRef.current;
        if (!setTodos || selectedIds.size === 0) return [];

        const deletedTodos: Todo[] = [];

        for (const id of selectedIds) {
            const todo = todos.find((t) => t.id === id);
            if (todo) {
                deletedTodos.push(todo);

                // Cancel legacy notification
                if (todo.notificationId) {
                    await cancelNotification(todo.notificationId);
                }

                // Cancel all reminder notifications (including migrated legacy)
                const reminders = getReminders(todo);
                for (const reminder of reminders) {
                    if (reminder.notificationId) {
                        await cancelNotification(reminder.notificationId);
                    }
                }
            }
        }

        const newTodos = todos.filter((t) => !selectedIds.has(t.id));
        setTodos(newTodos);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));

        return deletedTodos;
    }, [selectedIds]);

    const moveTasks = useCallback(async (targetListId: string) => {
        const todos = todosRef.current;
        const setTodos = setTodosCallbackRef.current;
        if (!setTodos || selectedIds.size === 0) return;

        const newTodos = todos.map((t) =>
            selectedIds.has(t.id) ? { ...t, listId: targetListId } : t
        );

        setTodos(newTodos);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
    }, [selectedIds]);

    return (
        <BulkEditContext.Provider
            value={{
                isBulkMode,
                selectedIds,
                enterBulkMode,
                exitBulkMode,
                toggleSelection,
                selectAll,
                deselectAll,
                deleteTasks,
                moveTasks,
                setTodosRef,
            }}
        >
            {children}
        </BulkEditContext.Provider>
    );
}

export function useBulkEdit() {
    const context = useContext(BulkEditContext);
    if (!context) {
        throw new Error("useBulkEdit must be used within a BulkEditProvider");
    }
    return context;
}