import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { Todo } from "@/types/todo";

interface ToastState {
    visible: boolean;
    message: string;
    deletedTodo: Todo | null;
}

interface ToastContextType {
    toast: ToastState;
    showDeleteToast: (todo: Todo, message?: string) => void;
    hideToast: () => void;
    undoDelete: () => Todo | null;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 5000; // 5 seconds

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        message: "",
        deletedTodo: null,
    });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hideToast = useCallback(() => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setToast((prev) => ({ ...prev, visible: false, deletedTodo: null }));
    }, []);

    const showDeleteToast = useCallback((todo: Todo, message?: string) => {
        // Clear any existing timeout
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
        }

        setToast({
            visible: true,
            message: message || `"${todo.text}" deleted`,
            deletedTodo: todo,
        });

        // Auto-hide after duration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeoutRef.current = setTimeout(() => {
            hideToast();
        }, TOAST_DURATION) as any;
    }, [hideToast]);

    const undoDelete = useCallback((): Todo | null => {
        const deletedTodo = toast.deletedTodo;
        hideToast();
        return deletedTodo;
    }, [toast.deletedTodo, hideToast]);

    return (
        <ToastContext.Provider
            value={{
                toast,
                showDeleteToast,
                hideToast,
                undoDelete,
            }}
        >
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}