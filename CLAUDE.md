# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**brutalDO** is a feature-rich todo application built with Expo and React Native, featuring a neobrutalist design aesthetic with vibrant colors and aggressive styling. It includes multi-list support, pomodoro timer, recurring tasks, subtasks, and reminders.

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (opens Expo DevTools)
npx expo start

# Run on specific platforms
npm run android          # expo run:android
npm run ios              # expo run:ios
npm run web              # expo start --web

# Linting
npm run lint             # expo lint
```

## Architecture

### Tech Stack
- **Framework**: Expo 54 + React Native 0.81
- **Language**: TypeScript (strict mode)
- **Routing**: Expo Router (file-based routing in `app/`)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: React Context API
- **Persistence**: AsyncStorage with versioned keys
- **Animations**: react-native-reanimated

### Directory Structure
```
app/                    # Expo Router file-based routing
├── _layout.tsx         # Root layout with all context providers
└── (tabs)/             # Tab group with stack navigation
    ├── index.tsx       # Main todo list screen
    ├── create-task.tsx # Create/edit task screen
    ├── zen.tsx         # Pomodoro timer focused view
    └── pick-project.tsx
context/                # React Context providers (6 contexts)
components/             # Reusable UI components (20 components)
types/                  # TypeScript interfaces (todo, settings, recurrence, todoList)
utils/                  # Utilities (notifications.ts, recurrence.ts)
hooks/                  # Custom hooks
```

### State Management Pattern

Contexts are nested in `app/_layout.tsx` in this order:
```
UserProvider → SettingsProvider → TodoListProvider → ToastProvider → PomodoroProvider → BulkEditProvider
```

Each context:
- Has its own AsyncStorage key (prefixed with `@neo_brutal_*`)
- Provides a custom hook (e.g., `useTodo()`, `useSettings()`)
- Handles its own persistence with try-catch

### AsyncStorage Keys
| Key | Purpose |
|-----|---------|
| `@neo_brutal_todos_v2` | All tasks |
| `@neo_brutal_lists_v1` | Project lists |
| `@neo_brutal_settings_v1` | App settings |
| `@pomodoro_timer_state` | Active timer state |
| `@neo_brutal_sort_v1` | Sort preference |
| `@neo_brutal_user_id_v1` | Unique user ID |

### Styling Conventions

- Use NativeWind classes with the `cn()` helper from `clsx` + `tailwind-merge`
- Colors are defined in `tailwind.config.js` under `neo.*` namespace (e.g., `neo-primary`, `neo-dark-surface`)
- Support dark/light mode via `useColorScheme()`
- Animations use `react-native-reanimated` with `useSharedValue()` pattern

### Key Patterns

**Adding screens**: Create file in `app/(tabs)/`, component auto-becomes a route

**Notifications**: Use helpers in `utils/notifications.ts`:
- `scheduleNotification(text, date)` - Schedule reminder
- `cancelNotification(id)` - Cancel specific notification

**Recurrence logic**: Use helpers in `utils/recurrence.ts`:
- `getNextOccurrenceDate(date, pattern)` - Calculate next occurrence
- `formatRecurrencePattern(pattern)` - Human-readable text

**Data structure**: Todos are stored as flat array with `listId` field (not nested by list)

### Type Definitions

Core types in `types/`:
- `Todo`: id, text, completed, priority, dueDate, reminders[], recurrence, subtasks[], listId, archivedAt
- `Subtask`: id, text, completed
- `Priority`: "high" | "medium" | "low" | "none"
- `RecurrencePattern`: type, daysOfWeek?, endDate?
- `TodoList`: id, name, colorVariant?, createdAt

### Navigation

Uses Drawer + Stack pattern:
- Drawer contains `ProjectDrawer` component for list switching
- Stack screens under `(tabs)/` for main navigation
- Use `router.push()` for navigation, `router.replace()` for replacement
- Route params via `useLocalSearchParams<{ paramName: type }>()`

### Instructions

Always research best practices for expo, react native and tailwind css. Ensure light and dark mode work. Everything is in a neo brutalist style. Always research best practices to implement the feature or fix in question