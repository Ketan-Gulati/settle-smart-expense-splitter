# Settle --- Engineering & Product Rules

**Version:** 0.1\
**Date:** 22 August 2026\
**Purpose:** Hard rules for humans and AI coding agents working on
Settle.

> **This file is the engineering constitution of Settle.**
>
> When a shortcut conflicts with correctness, architecture, security, or
> product quality, choose correctness, architecture, security, and
> product quality.

------------------------------------------------------------------------

# 1. Core Principles

1.  **Financial correctness is non-negotiable.**
2.  **The ledger is the source of truth.**
3.  **Balances and settlement recommendations are derived.**
4.  **The domain layer must remain independent from the UI.**
5.  **Prefer simple, well-understood solutions over clever
    abstractions.**
6.  **Do not add a dependency unless it solves a real problem.**
7.  **Do not build features merely because an AI agent suggests them.**
8.  **Every user-facing financial number must be explainable.**
9.  **Offline-first is a product requirement, not an optional
    enhancement.**
10. **Motion must communicate state or improve usability.**
11. **Visual polish must come from intentional design, not decoration.**
12. **Never sacrifice maintainability for a flashy demo.**

------------------------------------------------------------------------

# 2. Technology Rules

## 2.1 Required baseline

Use:

-   React Native
-   Expo
-   TypeScript
-   Expo Router
-   Zustand or an equivalent lightweight state manager
-   SQLite or an equivalent structured local database

For visual rendering:

-   React Native Reanimated
-   React Native Gesture Handler
-   React Native Skia
-   Lottie where appropriate
-   A 3D renderer only when genuinely required

For the initial cloud implementation:

-   Supabase
-   PostgreSQL

These are defaults, not excuses to install every related package.

------------------------------------------------------------------------

# 3. Library Rules

## 3.1 Before adding a library

Ask:

1.  Is the functionality already available through React Native or Expo?
2.  Can it be implemented simply with existing project dependencies?
3.  Is the library actively maintained?
4.  Is it compatible with the current Expo/RN version?
5.  Does it materially reduce complexity?
6.  Does it increase bundle size or native complexity unnecessarily?
7.  Does it introduce a security/privacy concern?

If the answer is unclear, **do not install it yet.**

## 3.2 Dependency rule

> **One real requirement → one justified dependency.**

Do not install multiple libraries that solve the same problem.

## 3.3 Never

Do not add:

-   Random UI component libraries just to make screens faster.
-   Multiple animation libraries.
-   Multiple state-management libraries.
-   Multiple navigation libraries.
-   Abandoned packages.
-   Libraries solely because an AI-generated example used them.
-   Packages that duplicate Expo functionality.
-   Packages that introduce large native dependencies for trivial
    functionality.

## 3.4 Prefer

Prefer:

-   Platform APIs.
-   Expo APIs.
-   Small focused libraries.
-   Well-maintained libraries.
-   Existing project dependencies.
-   Custom code for simple functionality.

------------------------------------------------------------------------

# 4. TypeScript Rules

Use strict TypeScript.

Do not use:

``` ts
any
```

unless there is a documented and unavoidable reason.

Prefer:

``` ts
unknown
```

with explicit validation.

Do not hide type errors with:

``` ts
as any
@ts-ignore
@ts-expect-error
```

unless there is a documented technical reason.

Financial models must have explicit types.

Example:

``` ts
type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};
```

Prefer integer minor units where practical for monetary arithmetic
rather than relying on floating-point values.

------------------------------------------------------------------------

# 5. Financial Calculation Rules

This is the highest-priority engineering area.

## 5.1 Never use floating-point money casually

Do not rely on:

``` ts
0.1 + 0.2 === 0.3
```

for financial calculations.

Use deterministic money arithmetic.

Prefer storing amounts in the smallest currency unit where appropriate:

``` text
₹100.50 → 10050 paise
```

The representation must be consistent throughout the system.

## 5.2 Rounding must be deterministic

Every split operation must define:

-   Precision.
-   Rounding mode.
-   Who receives rounding remainder.
-   How the remainder is displayed.

Never silently lose money through rounding.

## 5.3 Invariants

The system must preserve:

``` text
Sum of participant obligations = expense total
```

``` text
Sum of all group net balances = 0
```

After complete settlement:

``` text
Every user's balance = 0
```

No operation may create or destroy money.

------------------------------------------------------------------------

# 6. Ledger Rules

The ledger is the source of truth.

Store:

-   Expenses.
-   Expense payers.
-   Expense splits.
-   Settlements.
-   Refunds.
-   Adjustments.
-   Relevant audit events.

Do not make:

``` text
"Ketan owes Rohit ₹200"
```

the authoritative stored state.

That is a derived balance.

## Never

Do not edit a historical expense simply to make a current balance look
correct.

Corrections should preserve the financial history where appropriate.

------------------------------------------------------------------------

# 7. Balance Engine Rules

The Balance Engine must be:

-   Deterministic.
-   Pure where practical.
-   Independently testable.
-   Independent from React.
-   Independent from UI state.
-   Independent from network state.

Input:

``` text
Ledger
```

Output:

``` text
Pairwise balances
Net balances
```

Never calculate financial balances directly inside components.

Bad:

``` tsx
const balance = expenses.reduce(...)
```

inside a screen component.

Good:

``` text
Screen
  ↓
Use case
  ↓
Balance Engine
  ↓
Result
```

------------------------------------------------------------------------

# 8. Smart Settlement Rules

The settlement engine is a core differentiator.

It must:

1.  Calculate the group's net balances.
2.  Identify debtors and creditors.
3.  Generate valid transfers.
4.  Minimize unnecessary transfers.
5.  Preserve total value.
6.  Never alter the underlying ledger.
7.  Produce deterministic output.
8.  Explain why each recommended transfer exists.

Example:

``` text
Ketan → Rohit ₹200
Rohit → Raj ₹300
```

Recommended:

``` text
Ketan → Raj ₹200
Rohit → Raj ₹100
```

The UI must explain:

> "You can pay Raj directly because Rohit owes Raj ₹300. Your ₹200
> payment satisfies part of Rohit's outgoing obligation."

Do not make optimized settlement recommendations opaque.

------------------------------------------------------------------------

# 9. AI Coding Agent Boundaries

AI coding agents are allowed to:

-   Generate UI components.
-   Generate boilerplate.
-   Create basic CRUD code.
-   Create types.
-   Create tests.
-   Refactor repetitive code.
-   Suggest architecture improvements.
-   Generate animations.
-   Generate documentation.
-   Generate simple utility functions.

AI coding agents must **not blindly decide**:

-   Financial formulas.
-   Settlement mathematics.
-   Rounding rules.
-   Currency behavior.
-   Ledger semantics.
-   Data migration strategy.
-   Authentication security.
-   Authorization rules.
-   Payment handling.
-   Sync conflict resolution.
-   Privacy policy behavior.
-   Destructive database operations.

For these areas, the agent must:

1.  State the proposed behavior.
2.  Explain assumptions.
3.  Implement only after the behavior is defined.
4.  Add tests.
5.  Verify invariants.

## AI must never

-   Invent financial logic.
-   Change the settlement algorithm to "make the UI work."
-   Delete historical financial records to fix a balance.
-   Hardcode balances.
-   Hardcode user-specific data.
-   Use fake financial calculations.
-   Fake API responses in production code.
-   Put secrets/API keys in the client.
-   Add dependencies without justification.
-   Rewrite architecture unnecessarily.

------------------------------------------------------------------------

# 10. AI Feature Boundaries

Settle is intentionally designed so the **core product does not require
an AI API**.

Do not add OpenAI, Claude, Gemini, or another paid AI API merely because
AI could be added.

AI may be considered later for optional features such as:

-   Natural-language expense parsing.
-   Receipt interpretation.
-   Expense categorization.
-   Personalized insights.

But these must never become dependencies of the core
expense/balance/settlement functionality.

The app must remain useful without AI.

------------------------------------------------------------------------

# 11. UI/UX Philosophy

Settle should feel:

-   Premium.
-   Intentional.
-   Native.
-   Calm.
-   Financially trustworthy.
-   Distinctive.
-   Modern.
-   Fast.

The product should not look like a generic AI-generated dashboard.

## Core rule

> **Design for the user's financial task, not for visual novelty.**

Every visual element must have a reason to exist.

------------------------------------------------------------------------

# 12. Explicitly Avoid "Vibe-Coded" UI

Do not use the following patterns as default design solutions.

### Avoid:

-   Harsh gradients.
-   Excessive gradients.
-   Rainbow coloring.
-   Purple-and-black default aesthetics.
-   Neon colors.
-   Basic pastel palettes.
-   Pure-white flat interfaces without hierarchy.
-   Heavy drop shadows.
-   Excessive glassmorphism/liquid glass.
-   Generic bento grids.
-   Repetitive 3-card rows.
-   Generic dashboard cards everywhere.
-   Excessive pill-shaped controls.
-   Excessive rounded containers.
-   Colored left stripes.
-   Terminal-window aesthetics.
-   Fake testimonials.
-   Fake product demos.
-   Generic pricing-tier layouts.
-   Checkmark-bullet-heavy layouts.
-   Radial orb backgrounds.
-   Dot-grid backgrounds.
-   Decorative sparkle icons.
-   Meaningless animated arrows.
-   Excessive emoji usage.
-   Excessive Lucide/icon decoration.
-   Skeleton loaders used as a visual style.
-   Excessive hover-like effects on mobile.
-   Random floating 3D objects.
-   Random blobs.
-   Generic "AI startup" landing-page aesthetics.
-   Generic Inter/Geist/Space Grotesk usage solely because an AI agent
    defaults to them.
-   Em-dashes in UI copy.
-   Copy such as "It's not X, it's Y" as a repetitive marketing pattern.

## Also avoid

-   Adding visual effects because they look impressive in a screenshot.
-   Making every component animated.
-   Making every screen a card grid.
-   Using a gradient as a substitute for visual hierarchy.
-   Using glassmorphism as a substitute for layout.
-   Using 3D as a substitute for product design.

------------------------------------------------------------------------

# 13. Typography Rules

Typography must have intentional hierarchy.

Use a considered font system.

Do not default blindly to:

-   Inter.
-   Geist.
-   Space Grotesk.

A font may still be used if it is deliberately selected for the product.

Use typography to establish:

-   Primary financial numbers.
-   Secondary balances.
-   Labels.
-   Metadata.
-   Actions.
-   Explanations.

Large monetary values should be highly legible.

------------------------------------------------------------------------

# 14. Color Rules

Use a restrained palette.

Color should communicate:

-   Positive / owed to user.
-   Negative / user owes.
-   Neutral.
-   Warning.
-   Destructive.

Do not use a rainbow palette to distinguish every category.

Do not rely on color alone.

Every important financial state should also have:

-   Text.
-   Iconography where useful.
-   Clear labels.

------------------------------------------------------------------------

# 15. Animation Rules

Animation must have purpose.

Good uses:

-   Number transitions when balances change.
-   Expense insertion.
-   Settlement completion.
-   Bottom-sheet transitions.
-   Gesture feedback.
-   Navigation transitions.
-   Chart transitions.
-   State changes.
-   Interactive debt visualization.

Avoid:

-   Animation on every component.
-   Constant floating.
-   Infinite loops without purpose.
-   Slow animations that delay interaction.
-   Excessive bounce.
-   Decorative motion.
-   Motion that makes financial information harder to read.

## Performance

Animations should remain smooth on mid-range devices.

Never sacrifice usability for animation.

------------------------------------------------------------------------

# 16. 3D Rules

3D is allowed.

3D is **not mandatory**.

Use 3D only when it provides:

-   Better understanding.
-   Strong brand identity.
-   A meaningful interaction.
-   A memorable state transition.

Good examples:

-   Settlement completion moment.
-   Trip-specific hero illustration.
-   Subtle depth/parallax.
-   Interactive group visualization.

Bad example:

> A random 3D coin floating behind every screen.

Avoid heavy 3D assets that negatively impact:

-   Startup time.
-   Memory.
-   Battery.
-   Performance.
-   Accessibility.

------------------------------------------------------------------------

# 17. Icon Rules

Icons should communicate function.

Do not use icons as decoration everywhere.

Avoid:

``` text
Every card
+ icon
+ sparkle
+ arrow
+ badge
+ decorative icon
```

Prefer:

-   Fewer icons.
-   Consistent icon family.
-   Clear actions.
-   Platform-appropriate icon sizing.

------------------------------------------------------------------------

# 18. Component Rules

Components should be:

-   Reusable.
-   Focused.
-   Composable.
-   Accessible.
-   Independently testable where practical.

Avoid giant components containing:

-   UI.
-   API calls.
-   Database calls.
-   Financial calculations.
-   Navigation logic.

Bad:

``` text
GroupScreen.tsx
  2,000 lines
  ├── database
  ├── API
  ├── calculations
  ├── animations
  └── UI
```

Prefer feature/domain separation.

------------------------------------------------------------------------

# 19. State Rules

Separate:

### UI state

Examples:

-   Modal open.
-   Selected tab.
-   Animation state.

### Application state

Examples:

-   Current user.
-   Active group.
-   Current filters.

### Persistent domain data

Examples:

-   Expenses.
-   Settlements.
-   Members.

Persistent domain data belongs in the database.

Do not treat Zustand as the database.

------------------------------------------------------------------------

# 20. Error Handling

Errors must be handled intentionally.

## User errors

Example:

``` text
Split total is ₹950, but the expense is ₹1,000.
```

Tell the user:

> **Your split is ₹50 short.**

Do not display:

> Something went wrong.

## Network errors

The app should prefer:

> **Saved offline. We'll sync when you're back online.**

over blocking the user.

## Sync errors

Show non-alarming status:

> **Saved on this device. Sync pending.**

Retry automatically where safe.

## Financial calculation errors

These are critical.

If an invariant fails:

-   Do not display a potentially incorrect settlement.
-   Preserve the underlying ledger.
-   Log diagnostic information.
-   Show a safe error state.
-   Prevent destructive recovery.

------------------------------------------------------------------------

# 21. Error Message Rules

Error messages should be:

-   Specific.
-   Human.
-   Actionable.
-   Short.

Bad:

> Error 400.

Good:

> **Couldn't save the expense. Your data is still stored locally and
> we'll retry.**

Bad:

> Invalid input.

Good:

> **The split amounts must add up to ₹2,400.**

------------------------------------------------------------------------

# 22. API Rules

Never call APIs directly from visual components when avoidable.

Prefer:

``` text
Component
 ↓
Feature service / use case
 ↓
Repository
 ↓
API
```

Validate all important inputs on the server once a backend exists.

Never trust the client for authorization.

------------------------------------------------------------------------

# 23. Authentication Rules

Never:

-   Store passwords manually.
-   Store authentication tokens in insecure plain storage.
-   Log access tokens.
-   Hardcode credentials.
-   Put secrets in source code.

Use secure platform storage for sensitive local credentials.

------------------------------------------------------------------------

# 24. Secrets Rules

Never put:

-   API secrets.
-   Service-role keys.
-   Database credentials.
-   Private tokens.

inside:

``` text
.env committed to Git
client bundle
source code
screenshots
logs
```

A public client key is only acceptable when the service explicitly
designs it to be public and server-side authorization still protects
data.

------------------------------------------------------------------------

# 25. Database Rules

Use migrations.

Never manually modify production schema without a migration.

Never:

``` text
DROP DATABASE
```

or destructive operations without explicit confirmation.

Never delete financial records merely to repair derived balances.

Use:

-   IDs.
-   Timestamps.
-   Foreign keys.
-   Constraints.
-   Indexes.
-   Transactions.

------------------------------------------------------------------------

# 26. Sync Rules

Offline changes must be queued safely.

Never assume:

``` text
local success = server success
```

Track sync state.

Example:

``` text
pending
syncing
synced
failed
conflict
```

Never silently overwrite financial changes during synchronization.

------------------------------------------------------------------------

# 27. Performance Rules

Do not optimize prematurely.

But avoid obvious performance mistakes:

-   Do not recalculate the entire ledger on every keystroke.
-   Do not render thousands of expenses at once.
-   Do not load all receipt images immediately.
-   Do not create expensive animations for static UI.
-   Do not perform expensive computation on the JS thread during
    animations if it can be avoided.
-   Do not introduce 3D rendering on screens that don't need it.

Use:

-   Memoization.
-   Pagination.
-   Virtualized lists.
-   Database queries.
-   Cached derived data where justified.

------------------------------------------------------------------------

# 28. Accessibility Rules

Support:

-   Dynamic text sizing where practical.
-   Sufficient contrast.
-   Screen readers.
-   Touch targets.
-   Reduced motion preferences where applicable.

Never communicate:

> "Green = owed, red = owing"

without textual labels.

------------------------------------------------------------------------

# 29. Mobile Rules

Design for:

-   One-handed use.
-   Thumb reach.
-   Safe areas.
-   Keyboard behavior.
-   Small screens.
-   Large screens.
-   Android back behavior.
-   iOS navigation conventions.

Do not simply make a web dashboard smaller.

------------------------------------------------------------------------

# 30. Forms

Expense entry must be extremely fast.

The common path should require minimal interaction.

Prefer:

``` text
Amount
Description
Payer
Participants
Split
Save
```

Use smart defaults.

Do not turn simple expenses into multi-step wizard flows.

------------------------------------------------------------------------

# 31. Navigation Rules

Navigation must be predictable.

Do not create:

-   Deep navigation mazes.
-   Hidden core functionality.
-   Excessive modals.
-   Modal-on-modal flows.

The user should always know:

-   Where they are.
-   What group they are viewing.
-   How to go back.
-   How to add an expense.

------------------------------------------------------------------------

# 32. Copywriting Rules

UI copy should be:

-   Clear.
-   Human.
-   Short.
-   Confident.
-   Neutral.

Avoid corporate SaaS language.

Avoid:

> "Unlock your financial journey."

Prefer:

> **You are owed ₹1,240.**

Avoid repetitive marketing constructions like:

> "It's not X, it's Y."

Avoid unnecessary em-dashes in UI copy.

Do not use emojis as the primary communication mechanism.

------------------------------------------------------------------------

# 33. Loading States

Loading states should communicate actual waiting.

Do not automatically add skeleton loaders to everything.

Use:

-   Immediate cached data.
-   Small progress indicators.
-   Contextual loading states.
-   Optimistic updates where safe.

For offline-first flows, prefer displaying local data immediately.

------------------------------------------------------------------------

# 34. Empty States

Empty states should help users take action.

Bad:

> Nothing here.

Good:

> **No expenses yet.**
>
> Add your first shared expense to start tracking the group.

CTA:

**Add expense**

------------------------------------------------------------------------

# 35. Optimistic Updates

Allowed for operations that can be safely reversed.

Examples:

-   Adding a local expense.
-   Editing local metadata.

Be careful with:

-   Settlement completion.
-   Financial confirmation.
-   Irreversible deletion.
-   Payment status.

Never show a settlement as completed merely because a payment intent was
launched.

------------------------------------------------------------------------

# 36. Payments / UPI Rules

Settle is not a bank.

Do not:

-   Hold funds.
-   Store bank credentials.
-   Store UPI PINs.
-   Pretend payment succeeded.
-   Automatically mark an expense settled solely because a UPI app
    opened.

Payment status must be confirmed appropriately.

------------------------------------------------------------------------

# 37. Testing Rules

Every financial feature must include tests.

Minimum required tests for balance/settlement changes:

-   Happy path.
-   Multiple people.
-   Multiple payers.
-   Circular debts.
-   Partial settlements.
-   Full settlements.
-   Rounding.
-   Zero balances.
-   Refunds.
-   Edited expenses.
-   Deleted expenses.
-   Large groups.

Every bug involving financial calculations should produce a regression
test.

------------------------------------------------------------------------

# 38. Git Rules

Keep commits focused.

Good:

``` text
feat: add exact expense splitting
fix: handle percentage rounding
feat: add settlement explanation
```

Bad:

``` text
update stuff
```

Do not mix:

-   Large UI redesign.
-   Database migration.
-   Settlement logic change.
-   Dependency upgrades.

into one unexplained commit.

------------------------------------------------------------------------

# 39. Code Review Rules for AI-Generated Code

Before accepting AI-generated code:

1.  Read it.
2.  Understand it.
3.  Check types.
4.  Check edge cases.
5.  Check dependencies.
6.  Check security.
7.  Check performance.
8.  Add tests where needed.
9.  Confirm it follows architecture.
10. Remove unnecessary abstraction.

> **Generated code is not automatically trusted code.**

------------------------------------------------------------------------

# 40. Vibe-Coding Workflow Rules

The AI should work in small increments.

Preferred:

``` text
Requirement
 ↓
Plan
 ↓
Implement
 ↓
Test
 ↓
Review
 ↓
Next feature
```

Avoid:

``` text
"Build the entire app"
```

in one generation.

For every substantial feature, the agent should identify:

-   Files affected.
-   Domain changes.
-   Database changes.
-   UI changes.
-   Dependencies required.
-   Tests required.

------------------------------------------------------------------------

# 41. Do Not Rewrite Working Code

AI agents must not rewrite large sections of the project merely to
implement a small feature.

Before refactoring:

-   Explain why.
-   Identify affected files.
-   Confirm behavior will remain unchanged.
-   Preserve existing tests.

Prefer incremental changes.

------------------------------------------------------------------------

# 42. No Fake Functionality

Never create buttons that appear functional but do nothing.

Never show:

-   Fake settlement confirmations.
-   Fake cloud sync.
-   Fake payment completion.
-   Fake analytics.
-   Fake user data.
-   Fake API success.

If a feature is not implemented:

-   Hide it, or
-   Clearly label it as unavailable/development-only.

------------------------------------------------------------------------

# 43. Development Data Rules

Mock data is allowed during development.

Mock data must:

-   Be clearly separated from production.
-   Never ship accidentally.
-   Never resemble real user data.
-   Never be presented as real analytics.

Use deterministic fixtures for tests.

------------------------------------------------------------------------

# 44. Feature Completion Checklist

A feature is not complete until:

-   [ ] UI implemented.
-   [ ] Loading state considered.
-   [ ] Empty state considered.
-   [ ] Error state considered.
-   [ ] Offline behavior considered.
-   [ ] Accessibility considered.
-   [ ] Data persistence implemented where needed.
-   [ ] Domain logic tested.
-   [ ] Edge cases tested.
-   [ ] No unnecessary dependency added.
-   [ ] No secrets introduced.
-   [ ] No architecture boundary violated.
-   [ ] Performance is acceptable.
-   [ ] Existing features still work.

------------------------------------------------------------------------

# 45. Hard "Never" Rules

Never:

-   Hardcode balances.
-   Hardcode settlement recommendations.
-   Modify historical financial truth to fix a derived balance.
-   Use AI-generated financial logic without tests.
-   Add paid AI APIs to core functionality without explicit product
    approval.
-   Store secrets in the app.
-   Store payment credentials.
-   Claim a payment succeeded without confirmation.
-   Silently lose rounding amounts.
-   Silently overwrite sync conflicts.
-   Delete user financial data as a shortcut.
-   Install random libraries.
-   Build everything as a giant component.
-   Put database logic inside UI components.
-   Put financial calculations inside UI components.
-   Use decorative UI without purpose.
-   Turn every screen into a card grid.
-   Use gradients as the default design solution.
-   Use excessive glassmorphism.
-   Make everything neon.
-   Use random 3D elements.
-   Animate everything.
-   Use emojis as a substitute for hierarchy.
-   Make the app look like an AI-generated SaaS template.

------------------------------------------------------------------------

# 46. Priority Hierarchy

When requirements conflict, follow this order:

``` text
1. Financial correctness
2. Data integrity
3. Security/privacy
4. User trust
5. Core usability
6. Reliability/offline behavior
7. Performance
8. Accessibility
9. Visual polish
10. Novelty
```

A flashy feature is never worth compromising financial correctness.

------------------------------------------------------------------------

# 47. Final Rule

> **Settle should feel like a product designed by someone who deeply
> understands shared money, not like an AI generated a fintech
> dashboard.**

The engineering should be:

**boring where correctness matters.**

The UX should be:

**exceptional where humans interact.**

The visuals should be:

**distinctive without becoming decorative noise.**

And the AI should be:

**an implementation accelerator, never the product architect of
record.**
