# BrutalDO Freemium Implementation Prompt for Claude Opus 4.5

You are implementing a freemium subscription model for BrutalDO using expo-iap. Follow this specification exactly.

## Current State
- App has ALL features fully built (multiple reminders, advanced recurrence, Pomodoro customization)
- RevenueCat integration exists but should be **replaced with expo-iap**
- Neo-brutalist design system in place
- All context providers configured in app/_layout.tsx

## Freemium Model (Features in Current App)

### FREE TIER (Default)
- Multiple projects/lists
- Unlimited tasks
- Due dates
- Priority levels
- Subtasks
- Archive system
- **Single reminder per task** (preset times only: 5min, 15min, 1 day)
- Basic recurrence: Daily, Weekdays, Weekly, Monthly, Yearly
- Fixed Pomodoro: 25/5/15 (work/short break/long break)
- Zen Mode
- All sort options
- Bulk select/delete
- Undo delete
- Dark/Light mode

### PREMIUM TIER ($3.99/month, $34.99/year, $79.99/lifetime)
- Everything in free tier PLUS:
- **Multiple reminders per task** (ability to add 2+ reminders with custom times)
- **Advanced recurrence:**
    - Biweekly pattern type
    - Custom day selection (pick specific days M-Su)
    - Recurrence end dates
- **Customizable Pomodoro:**
    - Work duration: 1-90 min (default 25)
    - Short break: 1-30 min (default 5)
    - Long break: 1-60 min (default 15)
    - Sessions before long break: 1-10 (default 4)

## Implementation Requirements

### 1. Subscription Context (`context/SubscriptionContext.tsx`)
Create a new context that:
- Initializes expo-iap on app launch
- Manages subscription state (free, premium, loading, error)
- Detects and caches premium status locally
- Handles platform-specific setup (iOS: App Store, Android: Google Play)
- Product IDs:
    - `com.jtmhuka33.brutraldo.premium.monthly`
    - `com.jtmhuka33.brutraldo.premium.yearly`
    - `com.jtmhuka33.brutraldo.premium.lifetime`
- Provides hook: `useSubscription()` returning `{ isPremium, isLoading, error, products, purchase, restore }`

### 2. Feature Gating System (`utils/featureGates.ts`)
Create utility functions:
```typescript
canAddMultipleReminders(isPremium: boolean): boolean
canUseBiweeklyRecurrence(isPremium: boolean): boolean
canSelectCustomRecurrenceDays(isPremium: boolean): boolean
canSetRecurrenceEndDate(isPremium: boolean): boolean
canCustomizePomodoro(isPremium: boolean): boolean
```

### 3. Component Updates - Gate Premium Features

#### `components/MultiReminderPicker.tsx`
- Show paywall inline when user tries to add 2nd reminder if NOT premium
- Display: "Premium feature - add up to 10 reminders"
- Button to open paywall sheet
- Soft gate (don't prevent, show paywall, let them continue with free limit)

#### `components/RecurrencePicker.tsx`
- Hide "Biweekly" option if NOT premium (gray out or remove)
- Hide "End Date" option if NOT premium
- Hide custom day picker if NOT premium (only show for weekly/biweekly)
- Show "Premium feature" badges on locked options
- Tappable locks that open paywall

#### `components/SettingsPanel.tsx` (Pomodoro customization)
- If NOT premium: show fixed durations in read-only state with "Premium" labels
- If premium: show `CompactNumberInput` fields for all 4 settings
- Gate the `CompactNumberInput` components themselves
- Show inline paywall prompt in settings when user tries to change values

### 4. Paywall Sheet (`components/PaywallSheet.tsx`)
Create a new bottom sheet modal component:
- Neo-brutalist design (matches app aesthetic)
- Show 3 pricing options: monthly, yearly, lifetime
- Yearly card highlighted/recommended (slight rotation, bold border)
- "Lifetime" card should stand out (different color, emphasize one-time)
- Show what premium unlocks:
    - ✓ Multiple reminders
    - ✓ Advanced recurrence patterns
    - ✓ Customizable Pomodoro timer
- Purchase buttons with loading states
- Restore purchase button
- Close button
- Terms of Service / Privacy Policy links (can be placeholders)

### 5. Integration Points

#### `context/SettingsPanel.tsx`
- When user tries to change Pomodoro duration: check `isPremium`
- If NOT premium: show paywall sheet
- If premium: allow changes

#### `components/RecurrencePicker.tsx`
- Biweekly option: wrapped in premium check, tappable lock opens paywall
- Custom days: only shown if premium
- End date picker: only shown if premium

#### `components/MultiReminderPicker.tsx`
- Adding 2nd reminder: check count, if at limit and NOT premium, show paywall

#### `app/(tabs)/create-task.tsx`
- When loading existing task: if reminder count > 1 and NOT premium, show warning
- When loading existing task: if recurrence has custom days/end date and NOT premium, show downgrade warning

### 6. Subscription Context Provider Integration
In `app/_layout.tsx`:
- Add `SubscriptionProvider` as high-level provider (after UserProvider, before SettingsProvider)
- Wrap entire app so subscription state is available globally
- Handle initialization loading state

### 7. Error Handling
- Network errors: show "Unable to connect to store" message, allow retry
- Purchase errors: show user-friendly error, don't crash
- Restore errors: show "Unable to restore purchases" with retry
- Local fallback: if store connection fails, assume free tier to prevent app breakage

### 8. Local Persistence (`@subscription_premium_v1`)
- Cache premium status locally for offline support
- Update cache on every purchase/restore
- Check remote state on app launch and periodically
- Allow offline use with last-known state

## Code Style & Requirements

### Tailwind / NativeWind
- Use `cn()` helper (twMerge + clsx) for class composition
- Support dark mode throughout with `dark:` variants
- Neo-brutalist aesthetic: bold borders (5px), harsh shadows, high contrast
- Color palette: use `neo-*` colors from tailwind config

### TypeScript
- Strict mode enabled
- All functions typed
- No `any` types

### Animations
- Paywall sheet: `SlideInUp` on open, `SlideOutDown` on close (300ms)
- Premium badges: `FadeIn` (200ms)
- Lock icons: scale animation on press (0.9 scale)

### Haptics
- Purchase attempt: Medium impact
- Successful purchase: Success notification
- Error: Warning notification
- Open paywall: Light impact

### Testing Considerations
- Use sandbox credentials on TestFlight/Google Play internal testing
- Don't gate free features behind fake premium checks
- Make sure undo delete works on ALL tiers
- Test offline: premium status should persist locally

## Files to Create

1. `context/SubscriptionContext.tsx` - Core subscription state
2. `utils/featureGates.ts` - Feature gate functions
3. `components/PaywallSheet.tsx` - Paywall UI
4. `types/subscription.ts` - TypeScript interfaces

## Files to Modify

1. `app/_layout.tsx` - Add SubscriptionProvider
2. `components/MultiReminderPicker.tsx` - Gate 2nd+ reminders
3. `components/RecurrencePicker.tsx` - Gate biweekly, custom days, end dates
4. `components/SettingsPanel.tsx` - Gate Pomodoro customization
5. `app/(tabs)/create-task.tsx` - Warning on loading premium tasks (optional)
6. `utils/notifications.ts` - Export utility for handling premium features (optional)

## App Store Configuration (Out of Scope)

User must manually:
1. Create app on App Store Connect and Google Play Console
2. Set up in-app purchases with exact product IDs above
3. Add privacy policy and terms of service URLs
4. Configure TestFlight/internal testing sandbox accounts

## Notes

- **Don't add features that don't exist** - gate only what's already built
- **Soft gates preferred** - show paywall without blocking, let free users see full UI
- **No dark patterns** - respect user time, no aggressive paywalls
- **Graceful degradation** - if store connection fails, app still works on free tier
- **Neo-brutalist paywalls** - paywall should match app aesthetic, not feel like a corporate upsell
- All premium feature interactions should feel natural, not forced

## Success Criteria

- ✅ Free users can only add 1 reminder per task
- ✅ Free users see grayed-out/locked biweekly, custom days, end dates
- ✅ Free users cannot change Pomodoro durations
- ✅ Premium users unlock all 3 premium features seamlessly
- ✅ Paywall appears contextually when user interacts with premium features
- ✅ Offline support: last known subscription state works
- ✅ Restore purchases works on both platforms
- ✅ Dark mode supported throughout
- ✅ Neo-brutalist design consistent with app