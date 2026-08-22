Settle --- Development Phases
Version: 0.1  
Date: 22 August 2026
Purpose
Build Settle incrementally so that every phase produces a working,
testable product.
The priority is:
> **Correct financial engine → useful product → exceptional UX → cloud
> scale → growth and monetization**
Do not attempt to build the entire application in one pass.
---
Phase 0 --- Foundation
Goal
Create a clean, stable project foundation before building product
features.
Build
React Native + Expo
TypeScript
Expo Router
Project folder architecture
Strict TypeScript configuration
ESLint
Prettier
Basic testing setup
Environment configuration
Light/dark theme foundation
Design tokens
Navigation shell
SQLite foundation
Zustand foundation
UI
Create only the basic application shell:
Splash
Onboarding shell
Authentication shell
Home shell
Groups shell
Settings shell
Do not spend significant time polishing individual screens yet.
Exit criteria
App runs on Android and iOS.
Navigation works.
TypeScript is clean.
Database initializes correctly.
Theme system works.
Project structure follows `architecture.md`.
No unnecessary dependencies.
---
Phase 1 --- Design System & UI Foundation
Goal
Establish Settle's visual identity before building large numbers of
screens.
Build
Design tokens
Colors
Typography
Spacing
Radii
Borders
Elevation
Motion
Icon sizing
Reusable components
Buttons
Inputs
Text fields
Amount inputs
Cards
List rows
Avatars
Bottom sheets
Modals
Tabs
Segmented controls
Toasts
Empty states
Loading states
Error states
Motion
Screen transitions
Bottom-sheet transitions
Button feedback
Number transitions
Gesture foundations
Design direction
The UI must follow `rules.md`.
Do not use this phase to create generic fintech dashboards.
Avoid:
Generic card grids
Excessive gradients
Glassmorphism everywhere
Neon aesthetics
Decorative 3D
Excessive icons
Generic AI-generated layouts
Exit criteria
Core components are reusable.
Typography is established.
Colors are established.
Light/dark themes work.
Components work on Android and iOS.
Visual language is consistent.
---
Phase 2 --- Local Expense MVP
Goal
Create a completely usable expense-sharing application without requiring
an internet connection.
Features
Onboarding
Create local profile
Display name
Default currency
Groups
Create group
Rename group
Add members
Remove members
Archive group
Expenses
Add expense
Edit expense
Delete expense
Description
Amount
Date
Category
Payer
Participants
Splits
Equal
Exact amount
Percentage
Shares
Custom
Storage
Persist everything in SQLite.
Requirements
The application must remain functional when offline.
Exit criteria
A real group of friends can use the app for several days without needing
a backend.
---
Phase 3 --- Ledger & Balance Engine ⭐
Goal
Build the financial foundation of Settle.
This phase is more important than visual polish.
Build
Ledger
Expenses
Expense payers
Expense splits
Settlements
Refunds/adjustments where required
Balance calculation
Pairwise balances
User net position
Group net position
Balance explanation
Users can tap a balance and understand exactly how it was calculated.
Example:
``` text
Rahul owes you ₹300

Dinner        +₹600
Movie         +₹300
Groceries     -₹600
-------------------
Total         +₹300
```
Rules
Ledger is the source of truth.
Balances are derived.
No hardcoded balances.
No financial calculation inside UI components.
Deterministic rounding.
Extensive automated tests.
Required invariants
``` text
Sum of group net balances = 0
```
``` text
Every expense's split total = expense total
```
Exit criteria
The balance engine passes comprehensive unit and edge-case tests.
---
Phase 4 --- Smart Settlement Engine ⭐⭐⭐
Goal
Build the defining feature of Settle.
> **Tell users who actually needs to pay whom.**
Build
Global debt optimization
Net balance calculation
Debtor/creditor matching
Settlement recommendations
Minimum-transfer optimization
Partial settlements
Full settlements
Settlement history
Settlement explanations
Example
Input:
``` text
Ketan → Rohit ₹200
Rohit → Raj ₹300
```
Output:
``` text
Ketan → Raj ₹200
Rohit → Raj ₹100
```
UX
Show:
> **We found a simpler way to settle.**
Then:
``` text
You → Raj
₹200

Rohit → Raj
₹100
```
Allow users to ask:
> **Why am I paying Raj?**
Show the underlying obligation chain.
Critical testing
Test:
Simple chains
Long chains
Circular debts
Multiple creditors
Multiple debtors
Partial settlements
Zero balances
Large groups
Rounding
Edited expenses
Deleted expenses
Existing settlements
Exit criteria
A real friend group can use Settle for a month and rely on its
settlement recommendations.
---
Phase 5 --- Personal & Group Experience
Goal
Turn the financial engine into an excellent consumer product.
Personal Home
Show:
``` text
Your net position

+₹3,420

You are owed
₹4,820

You owe
₹1,400

[ Settle ]
```
Also show:
Groups
Recent activity
Outstanding balances
Recommended actions
Group dashboard
Show:
Total group spending
Members
Recent expenses
Spending categories
Member balances
Net group position
Settlement status
Exit criteria
Users can understand their financial position immediately after opening
the app.
---
Phase 6 --- Recurring Expenses & Templates
Goal
Remove repetitive expense entry.
Recurring expenses
Support:
Rent
Internet
Electricity
Subscriptions
Groceries
Household expenses
Frequencies:
Weekly
Monthly
Custom
Templates
Example:
``` text
Friday Dinner

Participants:
Ketan
Rahul
Aman
Rohit

Split:
Equal
```
Next time:
``` text
Amount → Save
```
Smart defaults
Suggest:
Previous participants
Previous payer
Previous category
Previous split
Previous description
Suggestions must work without AI.
Exit criteria
Common recurring expenses require substantially fewer interactions.
---
Phase 7 --- Premium Interaction & Visual Polish
Goal
Make Settle feel exceptionally polished.
This phase comes after the core financial system is proven.
Build
Motion
Animated balance changes
Smooth number transitions
Gesture-driven interactions
Swipe actions
Bottom-sheet transitions
Settlement transitions
Graphics
Use Skia for:
Spending charts
Balance visualization
Debt network
Settlement visualization
Haptics
Use selectively for:
Successful expense creation
Settlement completion
Important interaction feedback
3D
Use only where it genuinely improves the product.
Possible uses:
Settlement completion
Trip visuals
Subtle depth
Hero interactions
Important
Do not turn every screen into a visual experiment.
The goal is:
> **Premium, not gimmicky.**
Exit criteria
The application feels polished and distinctive on real devices,
including mid-range Android devices.
---
Phase 8 --- Cloud Accounts & Synchronization
Goal
Move from a local application to a collaborative multi-device product.
Build
Authentication
Email
Google
Apple where required
Secure sessions
Backend
Supabase
PostgreSQL
Secure storage
Authorization policies
Sync
Local → cloud
Cloud → local
Retry
Offline queue
Sync status
Conflict detection
Groups
Invite links
QR invitations
Join group
Member management
Requirements
Offline-first behavior must remain intact.
The cloud must not replace local usability.
Exit criteria
Two devices can reliably use the same group and converge to the same
financial state.
---
Phase 9 --- Settlement & Payment Experience
Goal
Make settlement actionable in the real world.
Build
Record cash settlement
Record bank transfer
UPI payment intent/deep links
Settlement reminders
Share settlement request
WhatsApp sharing
Settlement confirmation
Settlement history
Important
Settle does not hold user funds.
Never claim a payment succeeded without appropriate confirmation.
Exit criteria
A user can go from:
``` text
You owe ₹920
```
to:
``` text
Payment initiated
```
to:
``` text
Settlement recorded
```
with clear status at every stage.
---
Phase 10 --- Analytics & Reports
Goal
Help users understand spending patterns.
Build
Group analytics
Total spending
Monthly spending
Category breakdown
Member contribution
Member share
Spending trends
Personal analytics
Amount paid
Amount consumed
Net position over time
Group distribution
Reports
CSV
PDF
Monthly summary
Requirements
Analytics must be derived from the ledger.
Exit criteria
Users can understand where shared money went without manually
calculating anything.
---
Phase 11 --- Multi-Currency & Travel Mode
Goal
Make Settle excellent for travel groups.
Multi-currency
Support:
Multiple currencies per group
Original transaction currency
Conversion rate at transaction time
Preferred display currency
Historical exchange-rate preservation
Never silently recalculate historical expenses using today's exchange
rate.
Travel mode
Potential features:
Trip dates
Trip overview
Travel categories
Budget
Currency summary
Trip settlement
Trip report
Exit criteria
A group can use Settle for an international trip without needing a
spreadsheet.
---
Phase 12 --- Receipt & Itemization
Goal
Make complicated expenses easy.
V1
Receipt image attachment
Receipt gallery
Receipt linked to expense
Future
On-device OCR:
``` text
Receipt
   ↓
OCR
   ↓
Merchant
Date
Items
Tax
Total
   ↓
User confirmation
   ↓
Expense
```
Itemization
Example:
``` text
Pizza       ₹600
Ketan + Rahul

Pasta       ₹450
Aman

Drinks      ₹300
Rahul + Rohit
```
Allow tax/service charges to be distributed.
Exit criteria
Complex restaurant and grocery bills are faster to split than manual
entry.
---
Phase 13 --- Migration & Growth
Goal
Reduce the barrier for users currently using other expense apps.
Build
Import expenses
CSV import
Migration tools
Group migration
Shareable invite flows
Potential future:
Splitwise migration/import where technically and legally
appropriate.
Growth loops
Invite links
QR codes
Settlement sharing
Trip summaries
Group reports
Exit criteria
A user can move an existing group's expense history into Settle with
minimal friction.
---
Phase 14 --- Launch Preparation
Goal
Prepare for public Android and iOS release.
Product
Final onboarding
Empty states
Error states
Accessibility
Performance
Offline behavior
Sync reliability
Account deletion
Data export
Legal
Privacy policy
Terms of service
Data deletion process
Data export process
Payment disclosures
Store assets
App icon
Screenshots
App Store description
Play Store description
Feature graphics
Promotional material
Quality
Internal testing
Closed beta
Real friend-group testing
Crash monitoring
Performance monitoring
Exit criteria
The application can be used by people outside the development team
without requiring manual intervention.
---
Phase 15 --- Public Launch 🚀
Goal
Release Settle.
Launch sequence
``` text
Internal testing
      ↓
Friends / family beta
      ↓
Closed beta
      ↓
Limited public release
      ↓
Android + iOS launch
```
Monitor
Crash-free sessions
Activation
Groups created
Expenses created
Settlements completed
Settlement optimization usage
Invite conversion
Retention
Sync failures
Calculation errors
---
Phase 16 --- Monetization & Scale
Goal
Build sustainable revenue without ruining the free consumer experience.
Potential revenue
Travel partnerships
Hotels
Activities
Transportation
Travel insurance
Optional premium services
Only where the feature provides genuine additional value.
Do not paywall basic expense splitting.
Business product
Potential future product:
Settle for Teams
Features:
Employee expenses
Reimbursements
Approvals
Admin dashboard
Expense policies
Accounting exports
Corporate integrations
The business product may become the primary revenue engine.
---
Phase 17 --- Optional AI Features
AI is not required for the core product.
Only add AI if it creates meaningful user value.
Potential features:
Natural-language expense creation.
Receipt understanding.
Smart categorization.
Spending summaries.
Natural-language expense search.
Example:
> "I paid 2400 for dinner for me, Rahul and Aman."
Could become:
``` text
Dinner
₹2,400
Paid by: You
Participants:
You
Rahul
Aman
Split: Equal
```
Rules
AI must remain optional.
Core functionality must continue working if:
AI APIs are unavailable.
API costs are zero.
The user has no AI access.
The network is unavailable.
---
Recommended MVP Boundary
Do not wait for every roadmap feature before using the product.
The first genuinely valuable version is:
``` text
Phase 0
Foundation
   ↓
Phase 1
Design System
   ↓
Phase 2
Local Expenses
   ↓
Phase 3
Balance Engine
   ↓
Phase 4
Smart Settlement
   ↓
Phase 5
Home + Groups
   ↓
Phase 6
Recurring Expenses
```
At this point:
> **STOP AND USE IT WITH REAL FRIENDS.**
Do not immediately add 50 more features.
Use the application for real expenses.
Observe:
Where users get confused.
Which screens are slow.
Which calculations feel unclear.
Which expenses are tedious.
Whether the settlement recommendations make intuitive sense.
What users still do in WhatsApp/calculator/notes.
Then iterate.
---
Suggested Versioning
v0.1 --- Internal Prototype
Phases 0--2
``` text
Foundation
+
UI system
+
Local expenses
```
v0.2 --- Financial MVP
Phases 3--4
``` text
Balance Engine
+
Smart Settlement
```
v0.3 --- Real-World Alpha
Phases 5--7
``` text
Home
+
Groups
+
Recurring
+
Premium UX
```
v0.5 --- Collaborative Beta
Phases 8--11
``` text
Cloud
+
Sync
+
UPI
+
Analytics
+
Multi-currency
```
v0.8 --- Feature Complete
Phases 12--14
``` text
Receipts
+
Itemization
+
Migration
+
Launch preparation
```
v1.0 --- Public Launch
Phase 15
``` text
Android
+
iOS
+
Real users
```
---
Phase Priorities
Phase   Priority   Reason
---
0       P0         Foundation
1       P0         Design system
2       P0         Core product
3       P0         Financial correctness
4       P0         Core differentiator
5       P0         Core UX
6       P1         Retention
7       P1         Product polish
8       P1         Collaboration
9       P1         India-first usability
10      P2         Analytics
11      P2         Travel
12      P2         Advanced expense entry
13      P2         Growth
14      P0         Launch quality
15      P0         Launch
16      P2         Monetization
17      P3         Optional AI
---
Phase Completion Rule
A phase is complete only when:
The feature works on Android.
The feature works on iOS.
Offline behavior has been considered.
Error states exist.
Empty states exist.
Loading states exist where needed.
Accessibility has been considered.
Domain logic is tested.
Existing functionality still works.
No unnecessary dependency was introduced.
No architectural boundary was violated.
The feature has been tested with realistic data.
---
Golden Development Loop
Every phase should follow:
``` text
Read PRD
   ↓
Read architecture.md
   ↓
Read rules.md
   ↓
Define phase scope
   ↓
Plan implementation
   ↓
Build small increment
   ↓
Run tests
   ↓
Test on real device
   ↓
Fix edge cases
   ↓
Review UI
   ↓
Complete phase
   ↓
Move to next phase
```
---
Final Principle
> **Do not optimize for how quickly the AI can generate the app.
> Optimize for how quickly a real user can trust and love the app.**
Settle should first become correct, then useful, then
beautiful, then scalable, and only then monetized.