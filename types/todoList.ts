export interface TodoList {
    id: string;
    name: string;
    colorVariant?: number;
    createdAt: string;
}

export const DEFAULT_LIST_ID = "inbox";
export const DEFAULT_LIST: TodoList = {
    id: DEFAULT_LIST_ID,
    name: "Inbox",
    colorVariant: 0,
    createdAt: new Date().toISOString(),
};