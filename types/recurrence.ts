export type RecurrenceType =
    | "none"
    | "daily"
    | "weekdays"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "yearly"
    | "custom";

export type RecurrenceUnit = "days" | "weeks" | "months" | "years";

export interface RecurrencePattern {
    type: RecurrenceType;
    interval?: number; // For custom: every X units
    unit?: RecurrenceUnit; // For custom: days/weeks/months/years
    endDate?: string; // Optional end date for the recurrence
    daysOfWeek?: number[]; // For weekly: 0=Sunday, 1=Monday, etc.
}

export const RECURRENCE_OPTIONS: {
    type: RecurrenceType;
    label: string;
    shortLabel: string;
    icon: string;
}[] = [
    { type: "none", label: "Does not repeat", shortLabel: "ONCE", icon: "close-circle-sharp" },
    { type: "daily", label: "Every day", shortLabel: "DAILY", icon: "sunny-sharp" },
    { type: "weekdays", label: "Weekdays (Mon-Fri)", shortLabel: "WEEKDAYS", icon: "briefcase-sharp" },
    { type: "weekly", label: "Every week", shortLabel: "WEEKLY", icon: "calendar-sharp" },
    { type: "biweekly", label: "Every 2 weeks", shortLabel: "BI-WEEKLY", icon: "calendar-number-sharp" },
    { type: "monthly", label: "Every month", shortLabel: "MONTHLY", icon: "moon-sharp" },
    { type: "yearly", label: "Every year", shortLabel: "YEARLY", icon: "planet-sharp" },
    { type: "custom", label: "Custom...", shortLabel: "CUSTOM", icon: "settings-sharp" },
];

export const RECURRENCE_UNIT_OPTIONS: {
    unit: RecurrenceUnit;
    label: string;
    singularLabel: string;
}[] = [
    { unit: "days", label: "Days", singularLabel: "Day" },
    { unit: "weeks", label: "Weeks", singularLabel: "Week" },
    { unit: "months", label: "Months", singularLabel: "Month" },
    { unit: "years", label: "Years", singularLabel: "Year" },
];