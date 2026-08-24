# Settle — Development Journal (Memory)

## 2026-08-23 — Phase 0 — Foundation

### Status
Completed

### Current phase
Phase 0 — Foundation

### Work completed
- Initialized React Native + Expo (SDK 52) project with Expo Router v4 and strict TypeScript.
- Configured strict compiler options (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, path aliases `@/*` and `@app/*`).
- Established the complete directory structure following `architecture.md`:
  - `app/` (Expo Router file-based routing)
  - `src/components/`
  - `src/features/`
  - `src/domain/` (Pure TypeScript financial and domain types)
  - `src/database/` (SQLite migration and connection layer)
  - `src/repositories/` (Repository abstractions)
  - `src/services/`
  - `src/store/` (Zustand UI and App session state)
  - `src/hooks/` (Theme and database initialization hooks)
  - `src/utils/`
  - `src/constants/` (Design tokens, theme definitions, environment configuration)
  - `src/types/`
  - `tests/` (Jest unit test suite)
- Created Design Tokens foundation (`src/constants/tokens.ts`, `src/constants/theme.ts`) conforming to `design.md` with semantic light/dark palettes, spacing scale, typography, radii, and motion presets.
- Implemented SQLite foundation (`src/database/db.ts`, `src/database/migrations.ts`) with transactional schema migrations for all core entities: `users`, `groups`, `group_members`, `expenses`, `expense_payers`, `expense_splits`, `settlements`, `recurring_expenses`, `expense_templates`, and `audit_events`.
- Enforced Money integer minor units (`amount_minor INTEGER NOT NULL`, `Money` type with `amountMinor: number`) to prevent floating-point inaccuracies as mandated by `rules.md`.
- Implemented Zustand state foundation:
  - `src/store/uiStore.ts` (Theme preference and transient UI state)
  - `src/store/appStore.ts` (Active session context and initialization flag; decoupled from database)
- Set up Expo Router navigation shell (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`, placeholder screens for Home, Groups, Settings, Onboarding, and Auth).
- Added Jest unit testing suite (`tests/foundation.test.ts`) and verified passing tests for tokens, theme resolution, and schema migration integrity.
- Verified TypeScript type check and Prettier formatting clean across all source files.

### Files created/changed
- `package.json`
- `app.json`
- `tsconfig.json`
- `babel.config.js`
- `eslint.config.js`
- `jest.config.js`
- `.prettierrc.js`
- `.prettierignore`
- `src/constants/tokens.ts`
- `src/constants/theme.ts`
- `src/constants/env.ts`
- `src/domain/common/types.ts`
- `src/database/migrations.ts`
- `src/database/db.ts`
- `src/repositories/baseRepository.ts`
- `src/store/uiStore.ts`
- `src/store/appStore.ts`
- `src/hooks/useAppTheme.ts`
- `src/hooks/useDatabaseInit.ts`
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/groups.tsx`
- `app/(tabs)/settings.tsx`
- `app/onboarding.tsx`
- `app/auth.tsx`
- `tests/foundation.test.ts`
- `memory.md`

### Dependencies added
- `expo`, `expo-router`, `expo-constants`, `expo-linking`, `expo-status-bar`: Core application framework and routing.
- `expo-sqlite`: Embedded SQLite database for offline-first local persistence.
- `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`: React Native runtime and navigation prerequisites.
- `zustand`: Lightweight state management for transient UI and session state.
- `typescript`, `@types/react`, `@types/jest`: Strict static type checking.
- `jest`, `jest-expo`, `ts-jest`: Unit testing infrastructure.
- `eslint`, `@typescript-eslint/*`, `eslint-plugin-react*`: Code quality and linting.
- `prettier`, `eslint-config-prettier`: Code formatting.

### Current working files
- `memory.md`
- `app/_layout.tsx`
- `src/database/db.ts`
- `src/constants/tokens.ts`
- `tests/foundation.test.ts`

### Tests
- `npm test`: 3 passing tests in `tests/foundation.test.ts` (Design tokens, Theme builder, Migration schema integrity).
- `npm run typecheck`: Passed with 0 errors across entire workspace.

### Problems / Notes
- No architectural deviations were introduced.
- In accordance with `rules.md`, all monetary representations are strictly typed and stored as integer minor units (`amountMinor` / `amount_minor`).
- No UI components or screens contain business/financial logic.

### Next
- Await instructions for **Phase 1 — Design System & UI Foundation** (establishing core reusable components, typography, inputs, buttons, and motion primitives without building product features yet).

## 2026-08-23 — Phase 0 — Expo SDK Upgrade

### Status
Completed

### Previous version
Expo SDK 52 (React Native 0.76.7, React 18.3.1)

### New version
Expo SDK 57 (React Native 0.86.2, React 19.2.3)

### Packages upgraded
- `expo`: `~57.0.0` (installed `57.0.15`)
- `react-native`: `0.86.2`
- `react`: `19.2.3`
- `@types/react`: `~19.2.4`
- `expo-router`: `~57.0.15`
- `expo-sqlite`: `~57.0.1`
- `expo-constants`: `~57.0.13`
- `expo-linking`: `~57.0.7`
- `expo-status-bar`: `~57.0.1`
- `react-native-safe-area-context`: `~5.7.0`
- `react-native-screens`: `~4.26.0`
- `typescript`: `~6.0.3`
- `jest-expo`: `~57.0.4`
- `@react-native/jest-preset`: `^0.86.2`

### Why
Expo SDK 57 is the current stable baseline for modern React Native development, featuring React 19.2, React Native 0.86 with full default New Architecture support, and modern async SQLite APIs. Upgrading in Phase 0 avoids future breaking migration costs.

### Compatibility verification
- **Expo Doctor**: `npx expo-doctor` passed 21/21 checks (0 issues detected).
- **TypeScript**: `npm run typecheck` passed with 0 errors (`tsconfig.json` updated with `"types": ["jest", "node"]` and paths relative to root).
- **Jest**: `npm test` passed (3/3 test cases in `tests/foundation.test.ts`).
- **Prettier**: Prettier check passed across all TypeScript files.
- **Navigation**: Expo Router root stack and tab shell remain unchanged and fully functional.
- **SQLite**: Database migrations, foreign keys configuration, and minor integer units schema remain unchanged.
- **Theme**: Design tokens and semantic color resolution remain identical.
- **Zustand**: Stores compile and type-check with zero modifications.

### Issues
- TypeScript 6.0 deprecates `baseUrl` when used with modern module resolution; updated `paths` in `tsconfig.json` to be root-relative `./src/*` and `./app/*`.
- `jest-expo` in SDK 57 requires `@react-native/jest-preset` peer dependency; installed and configured.

### Current phase
Phase 0 — Foundation

### Current working files
- `package.json`
- `app.json`
- `tsconfig.json`
- `jest.config.js`
- `jest.setup.js`
- `memory.md`

### Next
Phase 1 — Design System & UI Foundation

## 2026-08-23 — Phase 1 — Design System & UI Foundation

### Status
Completed

### Work completed
- Established complete reusable component library according to `design.md` and Stitch `(Final)` references.
- Reconciled design tokens (`src/constants/tokens.ts`) with semantic colors (`positive`, `negative`, `warning`, `surfaceSubtle`, `surfaceElevated`), spacing scales (`gutter`, `marginMobile`), and typography hierarchy.
- Built reusable core UI primitives:
  - `Text`: Multi-variant typography (`displayHero`, `displayLarge`, `headline`, `title`, `subtitle`, `body`, `bodySecondary`, `caption`, `label`, `mono`).
  - `MoneyDisplay`: Integer minor units display with tabular numbers, dynamic currency symbols, sign prefixing, and positive/negative/neutral sentiment coloring.
  - `Button`: Primary, secondary, subtle, outline, and destructive button styles with small/medium/large sizes and loading indicators.
  - `Input`: Text input with label, error text, helper text, focus state transitions, and icon slots.
  - `StatusBadge`: Semantic status indicators with rounded-full pill styling.
  - `Avatar`: Initials-based avatar fallback with customizable size scales and border styling.
  - `ListRow`: Compact scannable list item with title, subtitle, left icon/avatar slot, right element slot, and optional bottom divider.
  - `Surface`: Surface hierarchy component (`base`, `subtle`, `elevated`, `card`) avoiding excessive shadows and cards.
  - `EmptyState`: Actionable empty state fulfilling the 3-question rule (what is empty, why it matters, what to do next).
  - `ErrorState`: Calm, actionable error state with retry triggers.
  - `DebtRow`: Specialized presentation component for pairwise balances (debtor vs creditor presentation without embedded calculations).
  - `SettlementRow`: Specialized presentation component for optimized transfers with payer/receiver avatar headers, amount display, and explanation CTA.
- Created internal validation sandbox screen (`app/design-sandbox.tsx`) to verify visual hierarchy, typography, light/dark theme switches, and component rendering.
- Added Jest unit tests in `tests/foundation.test.ts` verifying design tokens and minor units integer calculations.

### Stitch references used
- `Home (Final)` (`screens/f5c323eddf134cf0b09ff681ce9a3120`)
- `Add Expense (Final)` (`screens/8416807ba1d348e2b9d7cb1489e07a9e`)
- `Groups (Final)` (`screens/1956ca6c8940497180fbc419b15cd61a`)
- `Group Overview (Final)` (`screens/dd0b9e1da1d84326a174e645614b27b0`)
- `Balance Details (Final)` (`screens/504dde75afa14f128728b8c31e18d596`)
- `Smart Settlement (Final)` (`screens/6aa48e5e58274180a50e8070943df98d`)

### Components created
- `src/components/Text.tsx`
- `src/components/MoneyDisplay.tsx`
- `src/components/Button.tsx`
- `src/components/Input.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/Avatar.tsx`
- `src/components/ListRow.tsx`
- `src/components/Surface.tsx`
- `src/components/EmptyState.tsx`
- `src/components/ErrorState.tsx`
- `src/components/DebtRow.tsx`
- `src/components/SettlementRow.tsx`
- `src/components/index.ts`
- `app/design-sandbox.tsx`

### Files changed
- `src/constants/tokens.ts`
- `tests/foundation.test.ts`
- `memory.md`

### Dependencies added
None. (Implemented cleanly using React Native primitives and design tokens).

### Tests
- `npm test`: 4/4 passing unit tests.
- `npm run typecheck`: Passed with 0 errors across entire workspace.
- Prettier: Formatted and compliant.

### Visual validation
- Typographic hierarchy verified against Stitch `Home (Final)` & `Smart Settlement (Final)`:
  - Display amounts are weighted, tabular, and prominent (`48px` displayHero / `32px` displayLarge).
  - Restrained semantic colors: `#10B981` (positive green), `#EF4444` (negative red), `#0F172A` / `#F8FAFC` (primary text in light / dark).
  - Surfaces and cards use restrained borders (`#E2E8F0` / `#1E293B`) without heavy blurry shadows.
  - No generic "vibe-coded" anti-patterns (no rainbow palettes, no unnecessary glassmorphism).

### Issues / decisions
- All presentation components strictly accept integer minor units (`amountMinor`) and format them deterministically.
- All financial presentation rows (`DebtRow`, `SettlementRow`) are pure presentation components with zero business calculation inside.

### Current phase
Phase 1 — Design System & UI Foundation (Completed)

### Current working files
- `src/components/index.ts`
- `src/constants/tokens.ts`
- `app/design-sandbox.tsx`
- `memory.md`

### Next
Phase 2 — Local Expense MVP (Implementing local profile, group CRUD, and offline expense creation models and persistence).

## 2026-08-23 — Phase 2 — Local Expense MVP

### Status
Completed

### Completed
- **Local User & Member Management:** Implemented `userRepository.ts` to manage local device identity (`Ketan`) and dynamic member additions.
- **Group Management:** Implemented `groupRepository.ts` supporting creation of groups with initial members, member addition, group discovery, expense counts, and total spent aggregations.
- **Split Engine Domain Service:** Created pure domain service `src/domain/split/splitEngine.ts` with integer arithmetic supporting:
  - **Equal split:** Deterministic allocation of penny/paise remainders.
  - **Exact split:** Exact sum validation against total amount in minor units.
  - **Percentage split:** 100% total verification with deterministic remainder adjustment.
  - **Shares split:** Proportional share distribution in integer minor units.
- **Expense Domain & Validation:** Implemented `src/domain/expense/expense.ts` to strictly validate group membership, non-zero amounts, non-empty descriptions, and split invariants.
- **Expense Persistence:** Implemented `expenseRepository.ts` persisting expenses, single/multi-payer rows (`expense_payers`), and split allocations (`expense_splits`) transactionally in SQLite.
- **UI Screens Implemented:**
  - `app/(tabs)/groups.tsx`: Group listing, empty state, summary cards, and group creation modal conforming to `Groups (Final)`.
  - `app/groups/[id].tsx`: Group overview screen with hero stats, horizontal member scroll strip, add-member modal, and chronologically ordered expense list conforming to `Group Overview (Final)`.
  - `app/expenses/new.tsx`: Add expense screen with hero amount input (₹), payer selection pills, split method selector (equal/exact/percentage/shares), participant toggles with live split previews, and validation error surfaces conforming to `Add Expense (Final)`.
- **Unit Testing Suite:** Added `tests/splitEngine.test.ts` with 5 comprehensive test suites covering split math invariants, remainder distribution, and invalid input rejection.

### Database changes
None required. The Phase 0 schema (`users`, `groups`, `group_members`, `expenses`, `expense_payers`, `expense_splits`) was already fully normalized and accurately supported all Phase 2 storage requirements.

### Domain logic
- Pure integer arithmetic (`amountMinor` in paise/cents) across all split calculations.
- Validation logic isolated in `ExpenseValidator` and `SplitEngine` — zero financial calculations inside UI components.

### UI implemented
- `app/(tabs)/groups.tsx`
- `app/groups/[id].tsx`
- `app/expenses/new.tsx`

### Stitch references used
- `Groups (Final)` (`screens/1956ca6c8940497180fbc419b15cd61a`)
- `Group Overview (Final)` (`screens/dd0b9e1da1d84326a174e645614b27b0`)
- `Add Expense (Final)` (`screens/8416807ba1d348e2b9d7cb1489e07a9e`)

### Tests
- `npm test`: **9/9 passing tests** (`tests/foundation.test.ts`, `tests/splitEngine.test.ts`).
- `npm run typecheck`: **0 errors**.
- `Prettier`: Formatted and verified.

### Files changed
- `src/domain/split/splitEngine.ts` (New)
- `src/domain/expense/expense.ts` (New)
- `src/repositories/userRepository.ts` (New)
- `src/repositories/groupRepository.ts` (New)
- `src/repositories/expenseRepository.ts` (New)
- `app/(tabs)/groups.tsx` (Modified)
- `app/groups/[id].tsx` (New)
- `app/expenses/new.tsx` (New)
- `tests/splitEngine.test.ts` (New)
- `memory.md` (Modified)

### Dependencies added
None.

### Issues / decisions
- All calculations are isolated in `SplitEngine`. The UI only collects strings/numbers, passes commands to repositories, and displays deterministic results.
- Offline-first SQLite persistence is the single source of truth for group and expense data.

### Current phase
Phase 2 — Local Expense MVP (Completed)

### Current working files
- `src/domain/split/splitEngine.ts`
- `src/repositories/expenseRepository.ts`
- `src/repositories/groupRepository.ts`
- `app/expenses/new.tsx`
- `app/groups/[id].tsx`
- `memory.md`

### Next
Phase 3 — Ledger & Balance Engine (Implementing the double-entry transaction ledger, pairwise balance matrix, net balances, and balance details screen).

## 2026-08-23 — Phase 3 — Ledger & Balance Engine

### Status
Completed

### Financial model
- **Expense Ledger (`src/domain/ledger/ledgerEngine.ts`):** Converts raw multi-payer/single-payer expenses into directed pairwise ledger obligations (`debtorId -> creditorId`).
- **Balance Engine (`src/domain/balance/balanceEngine.ts`):** 
  - Computes net member balances (`totalPaidMinor - totalShareMinor`).
  - Performs bilateral reciprocal debt netting (`A owes B $500` vs `B owes A $200` => `A owes B $300`).
  - Preserves underlying direct obligations (e.g. `Ketan -> Rohit ₹200` and `Rohit -> Raj ₹300` are strictly kept separate and not simplified into 3rd-party transfers).
- **Balance Service (`src/services/balanceService.ts`):** Bridge providing group summaries to UI screens.

### Split methods
- Equal, Exact amounts, Percentage, and Shares.

### Rounding strategy
- Integer minor unit deterministic allocation:
  - In equal splits, floor division `floor(total / N)` assigns equal base shares, and the integer remainder `R = total % N` is allocated by 1 unit to the first `R` participants.
  - In multi-payer pro-rata allocations, integer division remainders are absorbed by the final payer to ensure exact conservation of money.

### Invariants
1. Sum of all participant shares === Expense total amount.
2. Sum of all group net balances === 0 (Zero-Sum Invariant).
3. Total money paid === Total expense amount.
4. No self-obligation: `debtor !== creditor` for all pairwise debts.
5. All obligations are positive integer minor units (`amountMinor > 0`).
6. Bilateral reciprocal debts are netted precisely.
7. Pure integer arithmetic ensures zero money creation or destruction.
8. Reproducibility: Given the same expense ledger, the engine outputs identical results deterministically.

### Tests
- `npm test`: **17/17 passing tests** across 3 test suites:
  - `tests/foundation.test.ts` (4 tests)
  - `tests/splitEngine.test.ts` (5 tests)
  - `tests/balanceEngine.test.ts` (8 comprehensive financial tests covering 1-to-many, multi-payer, bilateral netting, zero balance, and the 3-way chain invariant).

### UI integration
- **Group Overview (`app/groups/[id].tsx`):** Displays real user net position (`You are owed` / `You owe in total`), member balance pills with colored status badges, and CTA button to view balances.
- **Balance Details (`app/groups/[id]/balances.tsx`):** Displays comprehensive hero net card, bilateral direct debt rows involving current user, other member obligations, and the full group member ledger breakdown conforming to `Balance Details (Final)`.

### Files changed
- `src/domain/ledger/ledgerEngine.ts` (New)
- `src/domain/balance/balanceEngine.ts` (New)
- `src/services/balanceService.ts` (New)
- `app/groups/[id].tsx` (Modified)
- `app/groups/[id]/balances.tsx` (New)
- `tests/balanceEngine.test.ts` (New)
- `src/database/db.ts` (Modified with lazy import for web)
- `memory.md` (Modified)

### Issues / decisions
- Under Phase 3, 3rd-party debt consolidation is explicitly deferred to Phase 4. `Ketan -> Rohit` and `Rohit -> Raj` remain distinct direct debts as required.
- Zero floating-point arithmetic used in any financial domain logic.

### Current phase
Phase 3 — Ledger & Balance Engine (Completed)

### Current working files
- `src/domain/ledger/ledgerEngine.ts`
- `src/domain/balance/balanceEngine.ts`
- `src/services/balanceService.ts`
- `app/groups/[id]/balances.tsx`
- `app/groups/[id].tsx`
- `memory.md`

### Next
Phase 4 — Smart Settlement & Optimization Engine (Implementing debt simplification graph algorithms, optimized transfer paths, and Smart Settlement UI).

## 2026-08-23 — Phase 4 — Smart Settlement / Settlement Optimizer

### Status
Completed

### Algorithm
- Implemented deterministic debt settlement algorithm in `src/domain/settlement/settlementOptimizer.ts`:
  1. Partitions group members into Debtors (net < 0) and Creditors (net > 0).
  2. Deterministically sorts debtors and creditors by descending absolute amount, using stable string `userId` as the tie-breaker.
  3. Greedily matches the largest debtor with the largest creditor, transferring `min(debtorRemaining, creditorRemaining)`.
  4. Reduces remaining balances and advances indices until all net balances are zeroed out.
  5. Computes transfer reduction percentage from the original pairwise debt count.

### Deterministic ordering
- Primary: Descending remaining balance `amountRemaining`.
- Secondary tie-breaker: Lexicographical order on `userId` (`a.userId.localeCompare(b.userId)`).
- Completely decoupled from runtime object iteration order, database insertion order, or timestamps.

### Financial invariants
1. Sum of input net balances === 0.
2. Sum of all transfer amounts sent === sum of all transfer amounts received === total settled minor units.
3. Post-settlement net balance for every member === 0.
4. No self-transfers (`fromUserId !== toUserId`).
5. All transfer amounts are strictly positive integer minor units (`amountMinor > 0`).
6. Debtors only send money; creditors only receive money.
7. Pure integer arithmetic guarantees exact money conservation.
8. Deterministic reproducibility on identical inputs.

### Test coverage
- **26/26 passing tests** across 4 test suites:
  - `tests/foundation.test.ts` (4 tests)
  - `tests/splitEngine.test.ts` (5 tests)
  - `tests/balanceEngine.test.ts` (8 tests)
  - `tests/settlementOptimizer.test.ts` (9 tests covering 1:1, 1:N, N:1, N:N, chain simplification, zero balances, post-settlement net zero invariants, tie-breaker determinism, and 50-member group scaling).

### Reference cases
- **Core Product Scenario:**
  - Input Net Balances: Ketan (-₹200), Rohit (-₹100), Raj (+₹300)
  - Optimized Transfers Output:
    - Ketan → Raj: ₹200
    - Rohit → Raj: ₹100
    - Reduction: 2 direct transfers resolving 3-party debt chain.

### UI integration
- **Smart Settlement Screen (`app/groups/[id]/settle.tsx`):**
  - Displays optimizer hero card with original debts vs optimized payments count and reduction percentage pill badge.
  - Lists individual recommended transfers using `SettlementRow`.
  - Explanatory modal ("Why am I paying this person?") detailing the underlying ledger obligations that were simplified.
  - Settle CTA for payers.
- **Group Overview (`app/groups/[id].tsx`):**
  - Added primary "Smart Settle" CTA button alongside "Balances" button.

### Stitch references used
- `Smart Settlement (Final)` (`screens/6aa48e5e58274180a50e8070943df98d`)
- `Smart Settlement UX States` (`screens/4022ad1c99524d04b546bb919d864a8a`)
- `Smart Settlement Flow States` (`screens/b7d32afa5003430a8b0cb26eb54e1dc0`)

### Files changed
- `src/domain/settlement/settlementOptimizer.ts` (New)
- `src/services/settlementService.ts` (New)
- `app/groups/[id]/settle.tsx` (New)
- `app/groups/[id].tsx` (Modified)
- `tests/settlementOptimizer.test.ts` (New)
- `memory.md` (Modified)

### Issues / decisions
- The Settlement Optimizer strictly operates on net balances derived in Phase 3. It never alters historical expenses or the underlying ledger.
- Settlement plans are recommendations and do not automatically mutate database states until an actual settlement is recorded.

### Current phase
Phase 4 — Smart Settlement / Settlement Optimizer (Completed)

### Current working files
- `src/domain/settlement/settlementOptimizer.ts`
- `src/services/settlementService.ts`
- `app/groups/[id]/settle.tsx`
- `memory.md`

### Next
Phase 5 — Full Polish, Complete Home Feed & Historical Settlements (Integrating Home Screen with global net positions, activity feeds, settlement recording, and edge-case hardening).

## 2026-08-23 — Stage 1 — Shared UI Foundation (Final References Reconciled)

### Stage
Stage 1 — Shared UI Foundation

### Completed
- Reconciled and implemented the core shared visual system primitives matching the 6 FINAL reference screenshots (`Home (Final)`, `Groups (Final)`, `Group Overview (Final)`, `Balance Details (Final)`, `Add Expense (Final)`, and `Smart Settlement (Final)`):
  - `AppHeader`: Clean top header with profile avatar, centered Settle title, and settings gear.
  - `DetailHeader`: Stack navigation header with back button, screen title, and optional right actions.
  - `SectionHeader`: Structured section header supporting uppercase tags, bold titles, and right action triggers (`View all →`).
  - `GroupCard`: Elevated card component featuring thumbnail blocks, group name, 2-tier net position formatting (`You are owed` / `You owe` / `Settled up`), and unsettled expense count.
  - `ExpenseActivityRow`: Activity row featuring category icon containers, title, group context, relative timestamp, and 2-line financial summary (top net share, bottom total note).
  - `NumericKeypad`: Responsive 3x4 numeric keypad dialer (`1-9`, `.`, `0`, `⌫`) for the Add Expense flow.
  - `SettlementPathCard`: Optimized transfer presentation component with debtor-to-creditor indicators, "DIRECT PATH" pill badge, and expandable accordion explanation (*"Why am I paying X?"*).
- Integrated new components into `src/components/index.ts` and added live preview tests to `app/design-sandbox.tsx`.
- Zero modifications made to financial/domain logic (`ledgerEngine`, `balanceEngine`, `settlementOptimizer`, `splitEngine`).

### Files changed
- `src/components/AppHeader.tsx` (New)
- `src/components/DetailHeader.tsx` (New)
- `src/components/SectionHeader.tsx` (New)
- `src/components/GroupCard.tsx` (New)
- `src/components/ExpenseActivityRow.tsx` (New)
- `src/components/NumericKeypad.tsx` (New)
- `src/components/SettlementPathCard.tsx` (New)
- `src/components/index.ts` (Modified)
- `app/design-sandbox.tsx` (Modified)
- `memory.md` (Modified)

### Tests
- `npm run typecheck`: Passed with 0 errors.
- `npm run format:fix`: Prettier formatting clean across all files.
- `npx jest --runInBand`: 26/26 tests passing across 4 test suites.

### Visual verification
- Verified primitives inside `app/design-sandbox.tsx` on mobile viewport dimensions.
- Layout responsiveness verified: components encapsulate internal widths, use fluid horizontal flex layouts, and avoid fixed desktop coordinate stretching.
- All visual tokens (green `#10B981` positive, red `#EF4444` negative, dark primary, radii, typographic weights) match the 6 Final reference images.
- Full reusability confirmed: all components are exportable independent primitives located in `src/components/`, ready for production routes without sandbox dependencies.
- Financial engines (`ledgerEngine`, `balanceEngine`, `settlementOptimizer`, `splitEngine`) verified completely untouched.

### Validation outcome
STAGE 1 FINAL VALIDATION: PASS

### Issues
- None.

### Current working files
- `src/components/AppHeader.tsx`
- `src/components/DetailHeader.tsx`
- `src/components/SectionHeader.tsx`
- `src/components/GroupCard.tsx`
- `src/components/ExpenseActivityRow.tsx`
- `src/components/NumericKeypad.tsx`
- `src/components/SettlementPathCard.tsx`
- `memory.md`

### Next stage
Stage 2 — Home (Implementing `Home (Final)` at `app/(tabs)/index.tsx` driven by real SQLite domain data).

## 2026-08-23 — Stage 2 — Home (Final Reference Implemented)

### Stage
Stage 2 — Home (`app/(tabs)/index.tsx`)

### Implemented
- Completely implemented the production Home screen matching `Home (Final)` using real SQLite application data:
  - **App Header**: Custom header with user profile avatar, centered Settle title, and settings gear.
  - **Dynamic Greeting**: Time-aware greeting (`Good morning / afternoon / evening, <Name>`).
  - **Total Net Position**: Prominent financial display showing overall net balance across all groups in large integer minor unit formatting (`+₹...` in green / `-₹...` in red / neutral `₹0`).
  - **Review Settlement CTA**: High-contrast black action card dynamically indicating the total number of optimized transfers pending across relevant groups (`X payments to settle everything`).
  - **Relevant Groups Stack**: Displays prioritized groups using `GroupCard` (groups with positive/negative balances prioritized over settled groups), showing real name, net amount, and unsettled expense counts.
  - **Recent Activity Section**: Cross-group chronological expense feed utilizing `ExpenseActivityRow` showing category icons, expense title, group context, relative timestamp, and 2-line financial summary.
  - **4-Tab Bottom Navigation**: Registered `Home`, `Groups`, `Activity`, and `Settle` tabs in `app/(tabs)/_layout.tsx`.
  - **Pull-to-Refresh**: Enabled smooth reload of home aggregates.
- Created `HomeFeedService` (`src/services/homeFeedService.ts`) to aggregate real multi-group balances, pending settlement plan transfers, and recent expenses without placing business logic in JSX.
- Zero modifications made to financial/domain logic (`ledgerEngine`, `balanceEngine`, `settlementOptimizer`, `splitEngine`).

### Data sources
- `userRepository`: Default active user context.
- `groupRepository`: Group entities and membership lists.
- `expenseRepository`: Chronologically sorted expense records across groups.
- `balanceService`: Pure financial net balance derivation.
- `settlementService`: Multi-group optimized transfer recommendations.

### Components reused
- `AppHeader`
- `MoneyDisplay`
- `GroupCard`
- `SectionHeader`
- `ExpenseActivityRow`
- `EmptyState`
- `Surface`
- `Text`

### Routes wired
- Group Card $\to$ `/groups/[id]`
- Review Settlement $\to$ `/groups/[firstActiveGroupIdWithPayments]/settle` or `/groups`
- Settings Icon $\to$ `/settings`
- View All Activity $\to$ `/activity`
- 4 Bottom Tabs $\to$ `/`, `/groups`, `/activity`, `/settle`

### Tests
- `npm run typecheck`: Passed with 0 errors.
- `npm run format:fix`: Clean across entire project.
- `npx jest --runInBand`: 26/26 passing tests across 4 test suites.

### Visual verification
- Verified live on Expo dev server (`http://localhost:8081`).
- Layout adheres to `Home (Final)` hierarchy, responsive vertical spacing, and clean mobile styling.

### Issues
- None.

### Current working files
- `app/(tabs)/index.tsx`
- `app/(tabs)/groups.tsx`
- `app/groups/[id]/settle.tsx`
- `app/(tabs)/_layout.tsx`
- `src/components/Icon.tsx`
- `memory.md`

### Next stage
Stage 3 — Groups (Formally complete and verify Stage 3 Group Overview and sub-flows).

## 2026-08-23 — Stage 2 — Final Visual Correction Pass (Mobile & Stitch Final Alignment)

### Corrections applied
1. **Home (`app/(tabs)/index.tsx`)**:
   - Constrained layout width to mobile bounds (max-width 440px centered) avoiding horizontal stretching on wide viewports.
   - Preserved dynamic time-aware greeting, large hero net balance, and review settlement card.
2. **Groups (`app/(tabs)/groups.tsx`)**:
   - Completely corrected layout to strictly match `assets/groups_final.png`:
     - Top `AppHeader` + large bold `Groups` heading with black `+` button.
     - Group rows with thumbnail block, group title, member count subtitle.
     - Right-aligned **user net balance position** (not total spent) with uppercase semantic badges (`YOU ARE OWED` in green, `YOU OWE` in red, `Settled up` in muted gray).
     - Subtle dividers between items.
3. **Smart Settlement (`app/groups/[id]/settle.tsx`)**:
   - Replaced generic banner with exact `assets/smart_settlement_final.png` hierarchy:
     - `SMART SETTLEMENT ENGINE` supertitle.
     - `Optimization Complete` headline.
     - `50% FEWER TRANSFERS` badge.
     - Strikethrough `~~X obligations~~` and large `Y payments` hero counter.
     - `Optimized Payment Path` with primary `SettlementPathCard` featuring expandable `[ Why am I paying X? ]` explanation accordion.
     - Other payments list with `VIEW MORE PAYMENTS` accordion toggle.
4. **Iconography**:
   - Clean zero-dependency `Icon` component replacing all emoji across bottom tabs, navigation headers, and activity categories with monochrome line symbols.

### Validation
- `npm run typecheck`: Passed with 0 errors.
- `npx jest --runInBand`: 26/26 tests passing across 4 test suites.
- `npm run format:fix`: Clean.
- `ESLint`: 0 errors.
- Visual inspection on ~390px mobile viewport verified.

## 2026-08-24 — Phase 5 — Production-Grade Backend & Neon Database Foundation

### Status
Completed

### Objective
Transition Settle from local SQLite / frontend mock layer into a production-grade modular-monolith backend with Neon PostgreSQL, Prisma ORM, Zod strict configuration validation, BigInt minor-unit money arithmetic, dual-token JWT security foundation, and migration/seed infrastructure without connecting the frontend or creating premature microservices.

### Backend Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript (`strict: true`, `NodeNext` modules)
- **Database:** PostgreSQL on Neon (Serverless Postgres with pooled runtime connection + direct migration connection)
- **ORM:** Prisma v6.19.3
- **Validation:** Zod
- **Security & Password Hashing:** bcrypt (12 salt rounds), SHA-256 for refresh token storage, crypto for secure token generation
- **Logging:** Structured JSON logger with automated redaction of sensitive credentials, secrets, tokens, and hashes
- **Testing:** Jest + ts-jest

### Database Schema Created (`backend/prisma/schema.prisma`)
1. **`users`**: UUID PK, name, normalized unique lowercase email, bcrypt `password_hash` (nullable for future social auth), `is_active`, `created_at`, `updated_at`, `last_login_at`.
2. **`refresh_tokens`**: UUID PK, `user_id` FK (Cascade), unique `token_hash` (SHA-256), `expires_at`, `created_at`, `revoked_at`, `replaced_by_token_id` FK (SetNull for token family rotation/reuse detection), `device_id`, `user_agent`, `ip_address`, `last_used_at`.
3. **`groups`**: UUID PK, name, 3-letter currency code, `created_by` FK (Restrict), `created_at`, `updated_at`, `is_archived`.
4. **`group_members`**: UUID PK, `group_id` FK (Cascade), `user_id` FK (Cascade), role (`OWNER`, `MEMBER`), `joined_at`, `left_at`. `UNIQUE(group_id, user_id)` prevents duplicate active membership.
5. **`expenses`**: UUID PK, `group_id` FK (Cascade), description, `amount_minor` (BigInt in paise/cents, $>0$), currency, `paid_by_user_id` FK (Restrict), `split_method` (`EQUAL`, `EXACT`, `PERCENTAGE`, `SHARES`), category, notes, `created_at`, `updated_at`, `deleted_at` (soft delete for historical auditability).
6. **`expense_splits`**: UUID PK, `expense_id` FK (Cascade), `user_id` FK (Restrict), `amount_minor` (BigInt, $\ge 0$). `UNIQUE(expense_id, user_id)` prevents duplicate participant shares.
7. **`settlements`**: UUID PK, `group_id` FK (Cascade), `from_user_id` FK (Restrict), `to_user_id` FK (Restrict), `amount_minor` (BigInt, $>0$), currency, note, `created_at`, `deleted_at`.
8. **`audit_events`**: UUID PK, `actor_user_id` FK (SetNull), `event_type`, `entity_type`, `entity_id`, `metadata` (JSONB, strictly non-financial audit attributes), `created_at`.

### Important Constraints & Invariants
- **No floating-point storage:** All monetary columns use `BIGINT` minor units (`amount_minor`).
- **Zero balance columns:** No denormalized balance columns as a source of truth; all balances remain derived.
- **Relational Integrity:** Foreign keys on all user/group/expense links; unique constraints on emails, memberships, splits, and token hashes.
- **Atomic Invariant:** `SUM(splits.amount_minor) == expense.amount_minor` enforced in transactions.
- **Token Security:** Raw refresh tokens are never persisted; only SHA-256 hashes are stored.

### Migration & Seeding Status
- **Migration:** Applied `20260823191548_init` via `npx prisma migrate dev` to live Neon PostgreSQL database.
- **Seed:** Executed `npx tsx prisma/seed.ts` successfully, creating 6 deterministic users (Ketan, Rohit, Raj, Aman, Sneha, Pooja), 3 groups (Goa 2026, Apartment Bills, Weekend Dinner), and 6 realistic expenses with exact matching split sums.

### Tests
- `npm test` inside `backend/`: **8/8 passing tests** in `backend/tests/database.test.ts` executing directly against Neon PostgreSQL:
  1. User creation and unique email constraint rejection
  2. Group creation and duplicate membership rejection
  3. Money precision & division invariance (₹250 split among 3 users: 8334 + 8333 + 8333 = 25000)
  4. Atomic Expense Transaction with BigInt minor units
  5. Transaction rollback on split sum invariant failure (zero partial records left)
  6. Settlement creation and self-settlement rejection
  7. Token security & hashing verification
  8. Soft-deletion preservation of financial audit history
- `npm run typecheck` inside `backend/`: **PASS (0 errors)**.

### Documentation Created
- `backend/DATABASE.md`: Complete entity-relationship documentation, column schemas, indexing rationale, transaction boundaries, and money representation rules.
- `backend/SECURITY.md`: Dual JWT access/refresh token lifecycle, token rotation and reuse detection mechanics, bcrypt password hashing, and logging redaction policies.

### Current Working Files
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/config/env.ts`
- `backend/src/infrastructure/database/prisma.ts`
- `backend/src/utils/money.ts`
- `backend/src/utils/security.ts`
- `backend/src/utils/logger.ts`
- `backend/src/errors/AppError.ts`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/tests/database.test.ts`
- `backend/DATABASE.md`
- `backend/SECURITY.md`
- `memory.md`



## 2026-08-24 — Phase 6 — Core Backend REST API & Domain Service Architecture

### Status
Completed

### Objective
Implement the modular backend REST API layer, controllers, domain services, Zod validation middleware, JWT dual-token authentication flow, rate limiting, and request ID tracking without connecting the frontend or creating premature microservices.

### Target Architecture Implemented
- **Modular Monolith Flow:** Route $\to$ Request ID / Rate Limit / Auth Middleware $\to$ Zod Validation Middleware $\to$ Controller $\to$ Domain Service $\to$ Prisma / Neon PostgreSQL $\to$ DTO Mapping $\to$ Standard JSON Response.
- **Base Versioning:** `/api/v1` prefix across all routes.
- **Uniform Response Format:** Standard `{ success: true, data: ... }` and `{ success: false, error: { code, message } }`. Zero raw Prisma/SQL leaks or stack traces.

### Endpoints Built & Verified
1. **Authentication (`/api/v1/auth`)**:
   - `POST /register`: Register user with normalized lowercase email, bcrypt hashed password (12 rounds), auto-session issuance.
   - `POST /login`: Secure login with generic `INVALID_CREDENTIALS` error.
   - `POST /refresh`: Refresh token rotation with reuse detection (triggers immediate family revocation).
   - `POST /logout` & `POST /logout-all`: Session invalidation.
   - `GET /me`: Authenticated user profile.
2. **Users (`/api/v1/users`)**:
   - `GET /me`, `PATCH /me`, `GET /:id` (sanitized DTO without password hashes or internal secrets).
3. **Groups (`/api/v1/groups`)**:
   - `POST /`: Atomic group creation with creator as `OWNER`.
   - `GET /`: User's active groups.
   - `GET /:groupId`: Detailed group overview with membership verification.
   - `PATCH /:groupId` & `DELETE /:groupId`: Owner authorization required.
   - `POST /:groupId/members` & `DELETE /:groupId/members/:userId`: Membership management.
4. **Expenses (`/api/v1/expenses`)**:
   - `POST /`: Server-side split calculation, membership verification, `SUM(splits) === amountMinor` invariant enforcement in atomic transactions. Supports optional `Idempotency-Key`.
   - `GET /:expenseId`: Expense details with participant allocations.
   - `PATCH /:expenseId`: Atomic update and split recalculation.
   - `DELETE /:expenseId`: Soft-deletion (`deleted_at = now()`) preserving auditability.
   - `GET /groups/:groupId/expenses`: Paginated chronological group expense feed.
5. **Balances (`/api/v1/groups/:groupId/balances`)**:
   - `GET /`: Live group net balances derived dynamically from non-deleted expenses, splits, and settlements.
   - `GET /:userId`: Bilateral breakdown calculation powering Person Balance Detail screen.
6. **Settlements (`/api/v1/groups/:groupId/settlements`)**:
   - `POST /`: Real payment recording with self-settlement prohibition, mutual membership checks, and immediate balance reduction.
   - `GET /`: Paginated recorded payment history.
7. **Activity Feed (`/api/v1/activity`)**:
   - `GET /`: Unified chronological stream of shared expenses and settlements across all user groups.
8. **Dashboard (`/api/v1/dashboard`)**:
   - `GET /`: Home dashboard aggregation. Invariant verified: `totalNetBalanceMinor === sum(group.userNetBalanceMinor)`.

### Tests
- **Integration Test Suite (`backend/tests/api.test.ts`)**: **17/17 passing integration tests** covering registration, login, token rotation/reuse detection, group authorization, ₹250 equal split (8334 + 8333 + 8333), balance derivations, bilateral breakdowns, settlement debt reductions, activity feed, and dashboard zero-divergence invariant.
- **Database Test Suite (`backend/tests/database.test.ts`)**: **8/8 passing tests**.
- **Backend Total Tests**: **25/25 passing tests**.
- **Frontend Test Suite**: **31/31 passing tests** across 7 suites.
- **TypeScript Typecheck**: **PASS (0 errors)** in both `backend/` and root.

### Documentation Created
- `backend/API.md`: Complete endpoint documentation, request/response JSON schemas, error codes, and authentication/authorization matrix.

### Current Working Files
- `backend/src/app.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/validation.middleware.ts`
- `backend/src/middleware/rateLimit.middleware.ts`
- `backend/src/middleware/requestId.middleware.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/groups/group.service.ts`
- `backend/src/modules/expenses/expense.service.ts`
- `backend/src/modules/balances/balance.service.ts`
- `backend/src/modules/settlements/settlement.service.ts`
- `backend/src/modules/activity/activity.service.ts`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/tests/api.test.ts`
- `backend/API.md`
- `memory.md`



## 2026-08-24 — Phase 7 — Frontend ↔ Backend API Integration & Session Synchronization

### Status
Completed

### Objective
Integrate the React Native Expo frontend with the live Settle backend API and PostgreSQL ledger while preserving the finalized Stitch visual language, design hierarchy, and components without leaking sensitive credentials or duplicating backend financial calculation logic on the client.

### Architecture Implemented
- **Centralized API Client (`src/services/api/client.ts`)**:
  - Encapsulates `BASE_URL` (`EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1`).
  - Automatic `Authorization: Bearer <token>` attachment.
  - Transparent 401 handling with single in-flight refresh token mutex (`performSingleRefresh()`) to prevent concurrent refresh stampedes.
  - Standard error normalization mapping backend JSON errors (`ApiError`).
- **Secure Token Storage (`src/services/api/tokenStorage.ts`)**:
  - Uses `expo-secure-store` on native iOS/Android with `localStorage`/in-memory fallback on web.
  - Zero storage of database credentials or JWT signing secrets.
- **Service Façade (`src/services/api/settleApi.ts`)**:
  - Full typed DTO consumer for Auth, Users, Groups, Expenses, Balances, Settlements, Activity, and Dashboard.
- **Authentication & Session Store (`src/store/appStore.ts`)**:
  - Manages session lifecycle (`currentUser`, `isAuthenticated`, `isSessionLoading`, `login`, `register`, `logout`, `initSession`).

### Screens Connected to Backend APIs
1. **Home / Dashboard (`app/(tabs)/index.tsx` & `src/services/homeFeedService.ts`)**:
   - Consumes `GET /api/v1/dashboard` & `GET /api/v1/auth/me`.
   - Total Net Balance, group balance cards, and recent activity stream derived authoritatively from the server.
2. **Groups Screen (`app/(tabs)/groups.tsx`)**:
   - Consumes `GET /api/v1/groups` and `GET /api/v1/groups/:groupId/balances`.
   - Group creation wired to `POST /api/v1/groups`.
3. **Group Overview Screen (`app/groups/[id].tsx`)**:
   - Consumes `GET /api/v1/groups/:groupId`, `GET /api/v1/groups/:groupId/expenses`, and `GET /api/v1/groups/:groupId/balances`.
   - Displays real member roster, total group spend, and user position.
4. **Group Balances Screen (`app/groups/[id]/balances.tsx`)**:
   - Consumes `GET /api/v1/groups/:groupId/balances/:userId`.
   - Displays bilateral breakdown calculation from server.
5. **Group Settlement Screen (`app/groups/[id]/settle.tsx`)**:
   - Consumes `GET /api/v1/groups/:groupId/balances` for simplified transfer visualization.
   - Settlement recording modal wired to `POST /api/v1/groups/:groupId/settlements`.
6. **Global Settlement Screen (`app/settle.tsx`)**:
   - Connected to `GET /api/v1/dashboard` for cross-group settlement reviews.
7. **Expense Details Screen (`app/expenses/[id].tsx`)**:
   - Consumes `GET /api/v1/expenses/:id`.
   - Delete action wired to `DELETE /api/v1/expenses/:id`.
8. **Add/Edit Expense Screen (`app/expenses/new.tsx`)**:
   - Creates via `POST /api/v1/expenses` and edits via `PATCH /api/v1/expenses/:id`.
   - Supports `EQUAL`, `EXACT`, `PERCENTAGE`, and `SHARES` methods with server-authoritative split allocation.
9. **Activity Screen (`app/(tabs)/activity.tsx`)**:
   - Consumes `GET /api/v1/activity` for chronologically sorted shared transaction streams.
10. **Authentication Screen (`app/auth.tsx`)**:
    - Complete Sign In (`POST /api/v1/auth/login`) and Sign Up (`POST /api/v1/auth/register`) flows.

### Verification & Tests
- **Frontend Test Suite (`npx jest --runInBand`)**: **7/7 suites, 31/31 tests passing**.
- **Backend Test Suite (`backend/tests/api.test.ts` & `backend/tests/database.test.ts`)**: **2/2 suites, 25/25 tests passing**.
- **Root Typecheck (`npm run typecheck`)**: **PASS (0 errors)**.
- **Backend Typecheck (`cd backend && npm run typecheck`)**: **PASS (0 errors)**.

### Current Working Files
- `src/services/api/client.ts`
- `src/services/api/tokenStorage.ts`
- `src/services/api/errors.ts`
- `src/services/api/types.ts`
- `src/services/api/settleApi.ts`
- `src/store/appStore.ts`
- `src/services/homeFeedService.ts`
- `app/(tabs)/index.tsx`
- `app/(tabs)/groups.tsx`
- `app/(tabs)/activity.tsx`
- `app/groups/[id].tsx`
- `app/groups/[id]/balances.tsx`
- `app/groups/[id]/settle.tsx`
- `app/settle.tsx`
- `app/expenses/[id].tsx`
- `app/expenses/new.tsx`
- `app/auth.tsx`
- `memory.md`

### Next Recommended Phase
- **Phase 8 — Full System Audit & Hardening**: End-to-end audit of financial precision, authorization edge cases, network timeout fallbacks, race conditions, and UX state consistency across all real database scenarios.

## 2026-08-24 — Phase 8 — Full System Audit, Security, Financial Correctness & Edge-Case Hardening

### Status
Completed

### Audit Summary & Verified Dimensions
- **1. Financial Invariants & Remainder Distribution**:
  - Validated integer minor-unit division across all division scenarios:
    - ₹1 / 3 = [34, 33, 33] (sum = 100 minor units)
    - ₹10 / 3 = [334, 333, 333] (sum = 1000 minor units)
    - ₹100 / 6 = [1667, 1667, 1667, 1667, 1666, 1666] (sum = 10000 minor units)
    - ₹250 / 3 = [8334, 8333, 8333] (sum = 25000 minor units)
    - ₹999 / 7 = exact 99900 minor units with zero loss
    - ₹1000 / 6 = exact 100000 minor units with zero loss
  - Verified `SUM(splits) === amountMinor` enforced server-side with zero floating point representation drift.
- **2. Ledger Conservation (`SUM(member net balances) === 0`)**:
  - Proved zero-sum group balance conservation invariant holds strictly across multi-debtor, multi-creditor, equal, exact, percentage, and shares split graphs.
  - Validated with 20 randomized multi-party transaction property-based graph simulations (`tests/financial_audit.test.ts`).
- **3. Settlement Conservation & Historical Preservation**:
  - Verified bilateral settlement reduces debtor obligation and creditor receivable with zero money destruction or phantom expense generation (e.g. ₹1000 debt - ₹400 payment = ₹600 remaining debt).
  - Enforced settlement protection policy: Attempting to delete an expense after settlements exist in a group returns `409 Conflict (CANNOT_DELETE_SETTLED_EXPENSE)` to preserve immutable historical financial audit trails.
- **4. Idempotency & Concurrency Hardening**:
  - Implemented `idempotency.middleware.ts` for mutation routes (`POST /expenses`, `POST /settlements`).
  - Tested duplicate requests with matching `Idempotency-Key` return identical cached response with `X-Idempotency-Replay: true`.
  - Tested duplicate requests with mismatched payloads reject with `409 Conflict (IDEMPOTENCY_CONFLICT)`.
- **5. Authorization & IDOR Isolation**:
  - Proved disjoint non-member users cannot read, list, create expenses, or record settlements in groups they do not belong to (returns `403 Forbidden`).
- **6. Authentication & Token Lifecycle**:
  - Verified 15-minute access token and 30-day SHA-256 hashed refresh token lifecycle.
  - Verified token rotation and token reuse detection invalidating active session lineages upon replay.
- **7. UI State & Theme Synchronization**:
  - Replaced temporary/broken icons with universal, high-performance SVG vector icons.
  - Added real-time description-only search filtering and contextual relationship statuses ("You lent", "You owe") in Activity tab.

### Verification Results
- **Backend Test Suites (`npm test` in `backend/`)**: **3/3 suites passed, 38/38 tests passed**.
  - `tests/database.test.ts`: 8/8 passed
  - `tests/api.test.ts`: 17/17 passed
  - `tests/financial_audit.test.ts`: 13/13 passed
- **Frontend Typecheck (`npm run typecheck`)**: **PASS (0 errors)**.

### Current Working Files
- `backend/src/middleware/idempotency.middleware.ts`
- `backend/src/errors/AppError.ts`
- `backend/src/modules/expenses/expense.service.ts`
- `backend/src/modules/expenses/expense.routes.ts`
- `backend/src/modules/settlements/settlement.routes.ts`
- `backend/tests/financial_audit.test.ts`
- `src/components/Icon.tsx`
- `app/(tabs)/activity.tsx`
- `memory.md`

### Next Recommended Phase
- **Phase 9 — Group Creation & Member Invitation Redesign**: Multi-step group creation wizard, cryptographically secure shareable group invites, public group preview, and frictionless member joining.

## 2026-08-24 — Phase 9 — Redesign Group Creation + Member Invitation Flow

### Status
Completed

### Completed Work & Architecture
1. **Free Product Invariant Enforced**:
   - Zero subscriptions, zero paywalls, zero group/member limits, and zero ad monetization. Core splitting and settlements are 100% free.
2. **Database Schema Additions (`backend/prisma/schema.prisma`)**:
   - `GroupType` enum (`TRIP`, `APARTMENT`, `HOME`, `COUPLE`, `FRIENDS`, `OTHER`).
   - `GroupInvitation` model with indexes on `groupId`, `inviteCode` (unique 6-char user code e.g. `GOA7K2`), and `tokenHash` (SHA-256 hash of random 24-byte base64url token).
   - Synced schema to Neon PostgreSQL with `npx prisma db push` and regenerated client with `npx prisma generate`.
3. **Backend API Endpoints**:
   - `GET /api/v1/users/search?q=...` — User substring search by name/email excluding requester.
   - `POST /api/v1/groups` — Multi-member atomic group creation with initial invite generation.
   - `POST /api/v1/groups/:groupId/invites` — Generates fresh shareable invite code/link.
   - `GET /api/v1/groups/invites/:codeOrToken` — Public group preview (group name, type, creator name, member roster, currency) with zero financial leaks.
   - `POST /api/v1/groups/invites/:codeOrToken/join` — Transactional group join with single active membership constraint.
   - `DELETE /api/v1/groups/:groupId/members/:userId` — Rejects with `409 Conflict (MEMBER_HAS_UNSETTLED_BALANCE)` if member has outstanding balance.
4. **Frontend Multi-Step Creation Wizard (`app/groups/new.tsx`)**:
   - **Step 1: Group Details**: Name input with autofocus + Category Chips (Trip, Apartment, Home, Couple, Friends, Other) + Currency indicator.
   - **Step 2: Add Members**: Creator ("Ketan (You)") locked as owner; live Settle user search & adder chips; "Create with only me" single-member group support.
   - **Step 3: Review & Create**: Comprehensive review card with group category, currency, and member list before executing atomic `POST /api/v1/groups`.
   - **Step 4: Group Created & Native Share Sheet**: Displays invite code + copy button + OS native share sheet (`Share.share`) before navigating to group overview.
5. **Group Invitation Preview Screen (`app/join/[token].tsx`)**:
   - Clean public preview allowing authenticated or unauthenticated users to join in 1 tap without losing invite state.
6. **Group Overview & Tab Bar Fixes**:
   - Added `+ Invite (Code: XXXXXX)` share trigger chip in [`app/groups/[id].tsx`](file:///c:/Users/Ketan/Desktop/Settle%20%28Splitwise%20Pro%20%29/app/groups/%5Bid%5D.tsx).
   - Increased bottom tab bar height to 68px and adjusted label margin so tab titles ("Home", "Groups", "Activity", "Settle") are never clipped or hidden.
   - Fixed expense description input placeholder to `"Dinner, Groceries, Uber, Hotel..."` with zero hardcoded defaults.

### Verification Results
- **Backend Test Suite (`npm test` in `backend/`)**: **4/4 test suites passed, 50/50 tests passed (100% PASS)**.
  - `tests/database.test.ts`: 8/8 passed
  - `tests/api.test.ts`: 17/17 passed
  - `tests/financial_audit.test.ts`: 13/13 passed
  - `tests/invitation_group_flow.test.ts`: 12/12 passed
- **Frontend Typecheck (`npm run typecheck`)**: **PASS (0 errors)**.

### Canonical Invite Link Architecture
- **Canonical Utility**: [`src/services/invitations/inviteUtils.ts`](file:///c:/Users/Ketan/Desktop/Settle%20%28Splitwise%20Pro%20%29/src/services/invitations/inviteUtils.ts)
  - `getInviteBaseUrl()`: Configurable via `EXPO_PUBLIC_INVITE_BASE_URL` (defaults to `window.location.origin` in web dev, and `settle://` on native).
  - `buildInviteUrl(tokenOrCode)`: Generates `<base>/invite/<tokenOrCode>`.
  - `shareGroupInvite()`: Invokes native OS share sheet (`Share.share` / `navigator.share`).
  - `copyToClipboard()`: Native & Web clipboard writer with subtle in-app toast feedback.

### Current Working Files
- `backend/src/modules/groups/group.service.ts`
- `backend/src/config/env.ts`
- `src/services/invitations/inviteUtils.ts`
- `src/services/geo/currencyDetection.ts`
- `src/components/Input.tsx`
- `app/groups/new.tsx`
- `app/groups/[id].tsx`
- `app/invite/[token].tsx`
- `app/join/[token].tsx`
- `app/auth.tsx`
- `app/(tabs)/groups.tsx`
- `app/(tabs)/_layout.tsx`
- `memory.md`


