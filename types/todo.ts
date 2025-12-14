import { RecurrencePattern } from "./recurrence";

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
    reminderDate?: string;
    notificationId?: string;
    dueDate?: string;
    listId?: string;
    // Recurrence fields
    recurrence?: RecurrencePattern;
    isRecurring?: boolean;
    parentRecurrenceId?: string; // Links to the original recurring task
    recurrenceCount?: number; // How many times this task has recurred
}

export type FilterType = "ALL" | "TODO" | "DONE";

export type SortType = "DEFAULT" | "ALPHA_ASC" | "ALPHA_DESC" | "DUE_ASC" | "DUE_DESC";

export interface SortOption {
    value: SortType;
    label: string;
    icon: string;
}