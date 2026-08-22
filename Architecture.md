Settle --- System Architecture
Version: 0.1  
Date: 22 August 2026  
Platform: Android + iOS  
Architecture style: Offline-first, modular, domain-driven mobile
architecture with a scalable cloud sync layer
---
1. Architecture Goals
Settle must be:
Fast and responsive.
Offline-first for core functionality.
Cross-platform across Android and iOS.
Highly animated and visually rich.
Correct for financial calculations.
Easy to iterate during vibe-coded development.
Modular enough to scale into a production application.
Backend-independent at the domain layer.
Secure and privacy-conscious.
Designed for future cloud synchronization and large-scale usage.
Most important principle
> **The financial/domain engine must be independent from the UI.**
The UI can change completely without changing how expenses, balances, or
settlements are calculated.
---
2. High-Level Architecture
``` text
                         ┌──────────────────────┐
                         │      Android         │
                         │        iOS           │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │ React Native + Expo        │
                    │ TypeScript                 │
                    ├────────────────────────────┤
                    │ Expo Router                │
                    │ Reanimated                 │
                    │ Gesture Handler             │
                    │ Skia                       │
                    │ Lottie / 3D                │
                    └─────────────┬──────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
                ▼                                   ▼
       ┌─────────────────┐                ┌──────────────────┐
       │ Presentation    │                │ Application State│
       │ / UI Layer      │                │ Zustand          │
       └────────┬────────┘                └────────┬─────────┘
                │                                  │
                └────────────────┬─────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │      DOMAIN LAYER       │
                    ├─────────────────────────┤
                    │ Expense Engine           │
                    │ Split Engine             │
                    │ Balance Engine           │
                    │ Settlement Optimizer     │
                    │ Currency Engine          │
                    │ Recurring Expense Engine │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     LOCAL DATA LAYER    │
                    │ SQLite                  │
                    │ Offline-first           │
                    │ Local repositories      │
                    └────────────┬────────────┘
                                 │
                          Sync when online
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       SYNC LAYER        │
                    │ Queue / Pull / Push     │
                    │ Conflict resolution     │
                    │ Retry handling           │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       BACKEND API       │
                    │ Authentication          │
                    │ Groups                  │
                    │ Expenses                │
                    │ Settlements             │
                    │ Sync                    │
                    │ Notifications           │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       PostgreSQL        │
                    │ Users                   │
                    │ Groups                  │
                    │ Members                 │
                    │ Expenses                │
                    │ Splits                  │
                    │ Settlements             │
                    │ Audit Events            │
                    └─────────────────────────┘
```
---
3. Technology Stack
Mobile
React Native
Primary mobile framework.
Reason:
Android + iOS from one codebase.
Existing React knowledge.
Strong ecosystem.
Good native integration.
Good fit for rapid development.
Large ecosystem for third-party integrations.
Expo
Used for:
Project tooling.
Native APIs.
Build pipeline.
Notifications.
Camera.
Device capabilities.
App deployment workflows.
TypeScript
Mandatory.
Financial calculations, domain models, API contracts, and state should
use strict TypeScript types.
---
4. UI and Rendering Stack
Reanimated
Use for:
Screen transitions.
Spring animations.
Number transitions.
Card transformations.
Shared-element-style interactions.
Bottom sheets.
Gesture-driven animations.
Gesture Handler
Use for:
Swipe actions.
Drag interactions.
Interactive cards.
Swipe-to-settle.
Bottom sheets.
Reordering.
React Native Skia
Use for:
Custom charts.
Animated graphs.
Custom visualizations.
Balance/network visualizations.
Complex gradients.
Custom drawing.
High-performance visual effects.
Lottie
Use selectively for:
Expense added.
Settlement complete.
Group creation.
Empty states.
Success states.
3D
Use a React Native-compatible 3D renderer / Three.js-based approach only
where it materially improves the experience.
3D should be an accent rather than the default UI rendering method.
Potential uses:
Trip illustrations.
Settlement success animation.
Interactive hero objects.
Premium visual moments.
Subtle depth/parallax.
---
5. Application Layers
The application should follow clear boundaries.
``` text
UI
 ↓
Application / Feature Logic
 ↓
Domain
 ↓
Repositories
 ↓
Local Database / Remote API
```
The domain layer must not depend on React components.
---
6. Presentation Layer
Responsible for:
Screens.
Navigation.
Components.
Animations.
Gestures.
User interactions.
Visual states.
It must not contain complex financial calculations.
Bad:
``` text
Screen → calculate balances → modify database
```
Good:
``` text
Screen
  ↓
Use Case
  ↓
Domain Engine
  ↓
Repository
```
---
7. Feature Layer
Recommended feature modules:
``` text
features/
├── auth/
├── onboarding/
├── home/
├── groups/
├── expenses/
├── balances/
├── settlements/
├── recurring/
├── templates/
├── analytics/
├── notifications/
├── profile/
└── settings/
```
Each feature can contain:
``` text
feature/
├── components/
├── hooks/
├── screens/
├── services/
├── types/
└── utils/
```
---
8. Domain Layer
This is the most important layer.
``` text
domain/
├── expense/
├── split/
├── balance/
├── settlement/
├── currency/
├── recurring/
└── common/
```
The domain layer should be framework-independent wherever practical.
---
9. Core Domain Flow
``` text
Expense
   ↓
Validate
   ↓
Calculate participant shares
   ↓
Create ledger entries
   ↓
Calculate pairwise obligations
   ↓
Calculate net positions
   ↓
Build debt graph
   ↓
Optimize settlement
   ↓
Generate recommended transfers
```
---
10. Expense Engine
Responsible for:
Creating expenses.
Updating expenses.
Deleting expenses.
Validating amounts.
Validating participants.
Handling multiple payers.
Handling split methods.
Creating ledger entries.
Supported split methods:
Equal.
Exact amount.
Percentage.
Shares.
Custom.
The engine must guarantee:
``` text
Sum of participant obligations = total expense
```
Subject to deterministic currency rounding.
---
11. Balance Engine
The Balance Engine calculates the current financial state from the
ledger.
Inputs:
Expenses.
Expense splits.
Settlements.
Refunds.
Adjustments.
Outputs:
Pairwise balances.
User net position.
Group net balances.
Example:
``` text
Expense:
Ketan paid ₹600
Ketan share = ₹200
Rohit share = ₹200
Raj share = ₹200

Result:
Rohit owes Ketan ₹200
Raj owes Ketan ₹200
```
The balance engine should be deterministic and heavily tested.
---
12. Settlement Engine
The Settlement Engine converts outstanding balances into recommended
real-world transfers.
Example
Input:
``` text
Ketan → Rohit ₹200
Rohit → Raj ₹300
```
Recommended settlement:
``` text
Ketan → Raj ₹200
Rohit → Raj ₹100
```
Reason:
Ketan's obligation can be routed directly to Raj, eliminating an
unnecessary intermediate transfer.
---
13. Settlement Optimization
The system should model group balances as a directed graph.
``` text
Person A
   │
   │ owes
   ▼
Person B
   │
   │ owes
   ▼
Person C
```
The optimizer should:
Calculate net balances.
Separate creditors and debtors.
Match debtors to creditors.
Generate transfers.
Minimize the number of transfers.
Preserve total money owed.
Never create or destroy value.
Produce deterministic results.
Provide an explanation for every recommended transfer.
The first implementation should prioritize correctness and simplicity
over exotic optimization.
---
14. Source of Truth
The ledger is the source of truth.
Do NOT make pairwise balances the primary stored financial state.
Do NOT permanently store:
``` text
Ketan owes Rohit ₹200
```
as the authoritative value.
Instead store:
``` text
Expenses
Splits
Settlements
Refunds
Adjustments
```
Then derive:
``` text
Pairwise balance
Net position
Settlement recommendations
```
This is critical for:
Auditing.
Editing expenses.
Correcting mistakes.
Sync.
Conflict resolution.
Analytics.
Future accounting features.
---
15. Data Model
Conceptual model:
``` text
User
 ├── id
 ├── name
 ├── email
 ├── avatar
 ├── defaultCurrency
 └── createdAt

Group
 ├── id
 ├── name
 ├── type
 ├── currency
 ├── ownerId
 ├── createdAt
 └── archivedAt

GroupMember
 ├── id
 ├── groupId
 ├── userId
 ├── role
 └── joinedAt

Expense
 ├── id
 ├── groupId
 ├── description
 ├── amount
 ├── currency
 ├── categoryId
 ├── date
 ├── notes
 ├── receiptId
 ├── createdBy
 └── createdAt

ExpensePayer
 ├── expenseId
 ├── userId
 └── amount

ExpenseSplit
 ├── expenseId
 ├── userId
 ├── amount
 └── splitMethod

Settlement
 ├── id
 ├── groupId
 ├── fromUserId
 ├── toUserId
 ├── amount
 ├── currency
 ├── method
 ├── status
 └── createdAt

RecurringExpense
 ├── id
 ├── groupId
 ├── schedule
 ├── amount
 ├── payer
 ├── participants
 └── nextOccurrence

ExpenseTemplate
 ├── id
 ├── groupId
 ├── name
 ├── payer
 ├── participants
 ├── category
 └── splitConfiguration

AuditEvent
 ├── id
 ├── entityType
 ├── entityId
 ├── action
 ├── actorId
 └── createdAt
```
---
16. Local Database
Use SQLite or an equivalent structured local database.
The local database should contain:
User profile.
Groups.
Members.
Expenses.
Splits.
Settlements.
Recurring expenses.
Templates.
Cached analytics.
Sync metadata.
Requirements
Fast reads.
Transactional writes.
Offline support.
Deterministic migrations.
Database versioning.
---
17. Offline-First Architecture
Core functionality must work without an internet connection.
Offline users can:
Create expenses.
Edit expenses.
Delete expenses.
View balances.
Calculate settlements.
Search expenses.
View analytics.
When internet returns:
``` text
Local changes
     ↓
Sync queue
     ↓
Server
     ↓
Remote changes
     ↓
Local database
```
---
18. Sync Layer
The sync layer handles:
Uploading local changes.
Downloading remote changes.
Retry.
Conflict resolution.
Duplicate prevention.
Offline queues.
Sync status.
Each important record should have:
Stable ID.
Created timestamp.
Updated timestamp.
Version/revision where needed.
Sync status.
Example:
``` text
LOCAL
expense_123
syncStatus = pending

       ↓

SERVER
expense_123
syncStatus = synced
```
---
19. Conflict Resolution
Conflicts can occur when:
Two devices edit the same expense.
One device deletes while another edits.
Offline users add expenses simultaneously.
Initial strategy:
Use immutable event-style financial records where practical.
Use version/revision checks for mutable metadata.
Never silently discard financial changes.
Surface conflicts when automatic resolution is unsafe.
Financial correctness takes priority over convenience.
---
20. Backend
The first cloud implementation can use:
Supabase + PostgreSQL
Responsibilities:
Authentication.
User accounts.
Group membership.
Cloud persistence.
Sync.
Realtime updates where useful.
File storage.
Server-side validation.
Security policies.
A custom backend can replace Supabase later if scale or product
requirements justify it.
---
21. Backend API Boundaries
Conceptually:
``` text
/auth
/users
/groups
/groups/:id/members
/groups/:id/expenses
/groups/:id/settlements
/groups/:id/balances
/groups/:id/sync
/notifications
/uploads
```
The mobile application should access backend functionality through
repositories/services rather than coupling UI components directly to API
calls.
---
22. Repository Pattern
Example:
``` text
ExpenseRepository
 ├── create()
 ├── update()
 ├── delete()
 ├── getById()
 └── getByGroup()

BalanceRepository
 └── calculate()

SettlementRepository
 ├── create()
 ├── getHistory()
 └── getRecommendations()
```
The same domain code should be able to operate against local data
regardless of whether cloud sync is available.
---
23. State Management
Use Zustand or an equivalent lightweight state-management solution.
Separate:
UI state
Modal open/closed.
Selected tab.
Animation state.
Form state.
Domain/application state
Current group.
Current user.
Expenses.
Balances.
Settlement recommendations.
Persistent data
Stored in SQLite.
Do not use global state as a replacement for the database.
---
24. Navigation
Use Expo Router.
Conceptual routes:
``` text
/
├── onboarding
├── auth
├── home
├── groups
│   └── [groupId]
│       ├── overview
│       ├── expenses
│       ├── balances
│       └── settle
├── expense
│   ├── new
│   └── [expenseId]
├── settlement
├── activity
└── settings
```
---
25. Notifications
Initial notifications:
Outstanding balance reminder.
Settlement reminder.
Group invitation.
New expense.
Recurring expense created.
Settlement confirmation.
Notification frequency must be controlled to avoid notification fatigue.
---
26. UPI Architecture
The application should not hold user money.
Initial flow:
``` text
Settle
  ↓
User selects "Pay via UPI"
  ↓
Generate UPI payment intent/deep link
  ↓
Installed UPI app
  ↓
User completes payment
  ↓
Return to Settle where possible
  ↓
Record / confirm settlement
```
Never store:
UPI PIN.
Banking credentials.
Card credentials.
---
27. Receipt Architecture
V1
Store receipt images locally.
Cloud phase
Upload receipt to secure object storage.
Future OCR
Prefer on-device OCR where practical.
Flow:
``` text
Camera
  ↓
Receipt image
  ↓
OCR
  ↓
Extracted fields
  ↓
User confirmation
  ↓
Expense
```
OCR must never silently create a financial transaction without user
confirmation.
---
28. Analytics Architecture
Analytics should be derived from the ledger.
Examples:
``` text
Total spending
Category spending
Per-person contribution
Per-person share
Net position
Settlement history
Monthly trends
```
Do not make analytics the source of truth.
---
29. Security
Requirements:
HTTPS/TLS.
Secure authentication.
Secure token storage.
Database access policies.
Row-level authorization.
Input validation.
Server-side authorization.
Secure file storage.
Account deletion.
Data deletion/export.
No payment credentials.
Financial calculations must also be validated server-side once a backend
exists.
---
30. Error Handling
Errors should be categorized:
User errors
Example:
> Split amounts don't equal the expense total.
Provide an immediate actionable message.
Network errors
Allow offline operation where possible.
Sync errors
Show:
> Changes saved locally. Sync will retry automatically.
Financial errors
These are critical.
If a calculation mismatch occurs:
Do not silently continue.
Log diagnostic information.
Preserve source data.
Prevent invalid settlement output.
---
31. Testing Strategy
The most important tests are domain tests.
Unit tests
Test:
Equal splitting.
Exact splitting.
Percentage splitting.
Share splitting.
Multiple payers.
Rounding.
Currency.
Refunds.
Settlements.
Balance calculation.
Debt simplification.
Settlement optimization.
Property-based / invariant tests
Important invariants:
``` text
Total money in = Total money out
```
``` text
Sum of participant shares = expense total
```
``` text
Sum of all group net balances = 0
```
After complete settlement:
``` text
Every user's balance = 0
```
Integration tests
Test:
``` text
Expense
 → database
 → balance engine
 → settlement engine
 → settlement
 → updated balance
```
UI tests
Test critical flows:
Create group.
Add expense.
Edit expense.
View balance.
Explain balance.
Generate settlement.
Record settlement.
---
32. Performance
The application should feel instantaneous for normal consumer groups.
Optimize:
Database queries.
Balance calculations.
Large expense lists.
Charts.
Animations.
Image loading.
Avoid expensive recalculation on every UI render.
Use memoization/caching where appropriate.
---
33. Scalability
The architecture should eventually support:
``` text
Thousands/millions of users
Thousands of groups
Thousands of expenses per group
Multiple devices per user
Web client
Public API
Business accounts
```
The domain engine should remain independent of the backend
implementation.
---
34. Deployment Architecture
Mobile
``` text
Source
  ↓
Expo / EAS Build
  ↓
Android APK/AAB
iOS IPA
  ↓
Google Play
Apple App Store
```
Backend
Initial:
``` text
Supabase
 ├── PostgreSQL
 ├── Auth
 ├── Storage
 └── Realtime
```
Future:
``` text
Load Balancer
      ↓
API Services
      ↓
Application Services
      ↓
PostgreSQL
      ↓
Redis / Queue / Object Storage
```
Only introduce additional infrastructure when actual scale requires it.
---
35. Observability
Future production backend should include:
Crash reporting.
Error monitoring.
API latency monitoring.
Database monitoring.
Sync failure monitoring.
Calculation mismatch alerts.
Notification delivery monitoring.
Important product-specific metric:
> Number of financial calculation inconsistencies detected.
Target:
> **0 unresolved calculation inconsistencies.**
---
36. Recommended Project Structure
``` text
settle/
│
├── app/
│   ├── (auth)/
│   ├── (tabs)/
│   ├── groups/
│   ├── expenses/
│   └── settlement/
│
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── charts/
│   │   ├── animations/
│   │   └── 3d/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── home/
│   │   ├── groups/
│   │   ├── expenses/
│   │   ├── balances/
│   │   ├── settlements/
│   │   ├── recurring/
│   │   ├── templates/
│   │   └── analytics/
│   │
│   ├── domain/
│   │   ├── expense/
│   │   ├── split/
│   │   ├── balance/
│   │   ├── settlement/
│   │   ├── currency/
│   │   └── recurring/
│   │
│   ├── database/
│   ├── repositories/
│   ├── services/
│   ├── store/
│   ├── hooks/
│   ├── utils/
│   ├── constants/
│   └── types/
│
├── assets/
├── tests/
│   ├── domain/
│   ├── integration/
│   └── ui/
│
├── package.json
├── tsconfig.json
└── app.json
```
---
37. Architecture Evolution
Stage 1 --- Zero-cost MVP
``` text
React Native
      ↓
Expo
      ↓
SQLite
      ↓
Local Domain Engine
```
No backend required.
Goal:
> Prove the product with friends.
Stage 2 --- Cloud Sync
``` text
React Native
      ↓
SQLite
      ↕
Sync Layer
      ↕
Supabase
      ↓
PostgreSQL
```
Goal:
> Multi-device and multi-user operation.
Stage 3 --- Production Scale
``` text
Mobile
Web
      ↓
API Gateway
      ↓
Backend Services
      ↓
PostgreSQL
Redis
Queue
Object Storage
```
Goal:
> Scale reliably without rewriting the product.
---
38. Critical Architectural Rules
Ledger is the source of truth.
Balances are derived.
Settlement recommendations are derived.
Never mutate historical financial truth to make balances look
correct.
Domain logic must not depend on UI.
Financial calculations must have extensive automated tests.
Offline mode must remain functional for core features.
Sync must be resilient to duplicate and conflicting operations.
Never store payment credentials.
Do not introduce expensive infrastructure before it is
necessary.
Keep UI and rendering modular.
Use 3D selectively rather than making the entire app 3D.
Use strict TypeScript.
Every important balance should be explainable.
The app should optimize what users need to do, not merely display
accounting data.
---
39. Final Architecture
``` text
                         SETTLE
                            │
              ┌─────────────┴─────────────┐
              │                           │
        Presentation                  Application
              │                           │
      RN / Expo / Skia             Feature Services
      Reanimated / Gestures                │
      Lottie / 3D                          │
              │                           │
              └─────────────┬─────────────┘
                            │
                       DOMAIN CORE
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
     Expense Engine    Balance Engine    Settlement Engine
          │                 │                  │
          └─────────────────┼──────────────────┘
                            │
                        LEDGER
                            │
                    Local SQLite DB
                            │
                      Sync Layer
                            │
                       Backend API
                            │
                       PostgreSQL
                            │
                  Storage / Notifications
```
The Domain Core + Ledger + Settlement Engine are the heart of
Settle.
The UI can evolve from a simple MVP into a highly animated,
custom-rendered product without changing the underlying financial
system.