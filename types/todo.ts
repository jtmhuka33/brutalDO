import { RecurrencePattern } from "./recurrence";

export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    colorVariant?: number;
    reminderDate?: string;
    notificationId?: string;
    dueDate?: string;
    listId?: string;
    archivedAt?: string;
    recurrence?: RecurrencePattern;
    isRecurring?: boolean;
    parentRecurrenceId?: string;
    recurrenceCount?: number;
    subtasks?: Subtask[];
}

export type SortType = "DEFAULT" | "ALPHA_ASC" | "ALPHA_DESC" | "DUE_ASC" | "DUE_DESC";

export interface SortOption {
    value: SortType;
    label: string;
    icon: string;
}