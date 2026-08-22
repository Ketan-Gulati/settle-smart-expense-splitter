PRD --- Settle
Document status: Product Requirements Document  
Version: 0.1  
Date: 22 August 2026  
Product: Settle  
Platform: Android + iOS  
Initial model: Free, consumer-first, local/offline-first MVP with a
path to cloud sync and monetization
---
1. Product Overview
1.1 What are we building?
Settle is a modern shared-expense and group-settlement app for
friends, roommates, couples, families, and travel groups.
The app allows users to:
Record shared expenses quickly.
Split expenses between multiple people.
Track who paid and who consumed.
Calculate each person's true financial position.
Explain exactly why a person owes or is owed money.
Optimize the group's outstanding debts into the smallest, simplest
set of real-world payments.
Help users settle their balances without unnecessary intermediary
payments.
Manage recurring shared expenses.
View group spending and financial history.
The core product philosophy is:
> **Don't just show who owes whom. Tell people what they actually need
> to do.**
Example
If:
Ketan owes Rohit ₹200.
Rohit owes Raj ₹300.
Settle should recognize that Ketan does not need to pay Rohit first.
The recommended settlement is:
Ketan → Raj: ₹200
Rohit → Raj: ₹100
This preserves the underlying financial obligations while minimizing
unnecessary money transfers.
---
2. Product Vision
Vision
Make shared money management so simple that friend groups never need to
manually calculate or argue about who owes whom.
Mission
Turn a messy network of shared expenses into a clear, explainable,
optimized settlement plan.
Core promise
> **Know what you owe. Know what you're owed. Settle smarter.**
Product principles
Clarity over accounting complexity
Actionable balances over transaction noise
Fast expense entry
Every balance should be explainable
The underlying ledger must remain accurate and auditable
Core functionality should be free
Offline-first wherever practical
Privacy-first financial data handling
Mobile-first UX
Build the financial engine for scale from day one
---
3. Problem Statement
Existing expense-splitting apps solve the basic problem of recording
expenses, but users can still experience several forms of friction:
Too many individual debts are difficult to understand.
Users may see that they owe Person A while Person A owes Person B,
without being told that a direct payment to Person B could settle
the chain.
Users often need to mentally calculate their net position across
several people.
It can be difficult to understand why a particular person owes a
particular amount.
Repeated expenses require repetitive data entry.
Recurring household or friend-group expenses are tedious to
maintain.
Users may forget to record expenses or settle balances.
Group expense apps can feel like accounting tools rather than simple
consumer apps.
Premium restrictions can place useful features behind a
subscription.
Settle should make the experience feel like:
> **Add expense → Settle automatically → Done.**
---
4. Target Users
4.1 Primary users
A. Friend groups
People who regularly spend money together:
Dinner
Movies
Cabs
Groceries
Events
Weekend outings
Parties
Shared purchases
B. Travel groups
Groups going on:
Trips
Vacations
Road trips
International travel
Group stays
Typical expenses:
Hotels
Flights
Food
Cabs
Tickets
Activities
Shopping
C. Roommates
People sharing:
Rent
Electricity
Internet
Groceries
Maid
Water
Household purchases
D. Couples
Partners who regularly share:
Food
Travel
Rent
Shopping
Entertainment
Household expenses
E. Families
Shared family spending and recurring expenses.
---
5. User Personas
Persona 1 --- The Group Treasurer
A friend who usually pays first and later asks everyone to settle.
Needs:
Fast expense entry
Clear outstanding balances
Easy reminders
Minimal manual calculation
Persona 2 --- The Casual User
Only uses the app occasionally.
Needs:
Very simple onboarding
No accounting knowledge
Clear "what do I owe?" information
Easy settlement
Persona 3 --- The Roommate
Uses the app every week or month.
Needs:
Recurring expenses
Templates
Monthly settlement
Shared household tracking
Persona 4 --- The Trip Organizer
Creates groups and records many expenses during trips.
Needs:
Multi-currency
Categories
Receipt support
Trip summaries
Budget tracking
Fast group onboarding
---
6. Core User Jobs
Users should be able to answer these questions instantly:
"What do I owe right now?"
Example:
> You owe ₹840.
"Who do I need to pay?"
> Rahul ₹540\
> Rohit ₹300
"Who owes me?"
> Aman ₹400\
> Raj ₹220
"Why do I owe Rahul ₹540?"
The app should provide a transparent breakdown.
"Can we settle the entire group?"
The app should generate an optimized settlement plan.
"Can I avoid unnecessary payments?"
Yes. The settlement engine should route payments through the group where
mathematically valid.
"What did we spend this month?"
The group dashboard should answer this.
---
7. Core Product Concepts
7.1 Expense
An expense records:
Amount
Currency
Description
Date/time
Category
One or more payers
One or more participants
Split method
Notes
Optional receipt
Optional location
Optional tags
7.2 Split
Supported split types:
Equal
Exact amount
Percentage
Shares
Custom
7.3 Settlement
A settlement records an actual payment between users.
Example:
> Ketan paid Rohit ₹500.
Settlements must remain separate from original expenses.
7.4 Pairwise balance
The net financial relationship between two users.
Example:
> Rahul owes Ketan ₹300.
This should be derived from the ledger rather than treated as the source
of truth.
7.5 Net position
A user's overall position within a group.
Example:
> You are +₹1,240.
Meaning the user should ultimately receive ₹1,240 after considering all
obligations.
7.6 Optimized settlement
A mathematically derived set of transfers that settles the group while
minimizing unnecessary transactions.
---
8. MVP Features
8.1 Onboarding
Requirements
App introduction
Create profile
Optional guest mode
Display name
Profile photo optional
Preferred currency
Basic permissions only when needed
Goal
A new user should be able to create their first group in under one
minute.
---
9. Groups
9.1 Create group
Fields:
Group name
Group type
Currency
Members
Group types:
Friends
Trip
Roommates
Couple
Family
Custom
9.2 Group management
Users can:
Add members
Remove members
Rename group
Change group icon
Change group settings
Archive group
Leave group
9.3 Invite members
Support:
Invite link
QR code
Native share sheet
---
10. Expense Management
10.1 Add expense
Minimum flow:
Enter amount.
Enter description.
Select payer(s).
Select participants.
Select split method.
Save.
10.2 Fast expense entry
The most common expense should be possible in approximately 5--10
seconds.
Support smart defaults based on previous activity.
Example:
> Dinner
The app can suggest:
Same participants as previous dinner
Same category
Same payer
10.3 Multiple payers
Example:
Dinner = ₹4,000
Ketan paid ₹2,000
Rahul paid ₹2,000
The expense can still be split across all participants.
10.4 Edit/delete expenses
Users can:
Edit expenses
Correct payer
Correct split
Add/remove participants
Delete expense
All changes should preserve an audit trail in the underlying data model
where appropriate.
---
11. Split Methods
Equal
₹1,000 / 4 people = ₹250 each.
Exact
Ketan = ₹200  
Rahul = ₹300  
Aman = ₹150  
Rohit = ₹350
Percentage
Ketan = 25%  
Rahul = 25%  
Aman = 20%  
Rohit = 30%
Shares
Ketan = 1 share  
Rahul = 2 shares  
Aman = 1 share  
Rohit = 2 shares
Custom
Arbitrary participant amounts with validation.
Validation
The app must ensure:
> Sum of participant shares/amounts = total expense.
Rounding must be deterministic and transparent.
---
12. Balance Engine
This is the most important technical component of the product.
Requirements
The balance engine must calculate:
Individual expense obligations.
Pairwise net balances.
User net position.
Group-wide net balances.
Optimized settlement recommendations.
Source of truth
The application should treat the ledger as the source of truth.
Do not store a manually editable field such as:
> Rahul owes Ketan ₹500.
Instead, derive it from:
Expenses
Expense splits
Settlements
Adjustments/refunds
This makes the system auditable and scalable.
---
13. Smart Settlement Engine
13.1 Purpose
Convert a complex network of outstanding balances into a simpler set of
actual payments.
13.2 Example
Input:
Ketan → Rohit ₹200
Rohit → Raj ₹300
Recommended output:
Ketan → Raj ₹200
Rohit → Raj ₹100
The app should explain:
> "Instead of sending ₹200 to Rohit and having Rohit forward it to Raj,
> you can pay Raj directly. Rohit only needs to pay Raj the remaining
> ₹100."
13.3 Larger groups
The engine should consider the complete group graph.
Example:
A → B ₹500  
B → C ₹300  
C → D ₹200  
D → A ₹100
The engine should derive a simplified settlement plan.
13.4 Objective
Primary objective:
> Minimize the number of required real-world transfers.
Secondary considerations can later include:
Payment convenience
Currency
User preferences
Payment method availability
Whether a person is currently active in the group
13.5 Transparency
Every optimized recommendation must be explainable.
Users should be able to tap:
> "Why am I paying Raj?"
and see the underlying obligation chain.
---
14. Personal Balance Dashboard
The main personal screen should prioritize actionable information.
Example:
Your position
+₹3,400
You are owed
Rahul --- ₹1,200  
Aman --- ₹2,340  
Rohit --- ₹1,280
You owe
Aditya --- ₹820  
Rohit --- ₹600
Recommended settlement
Pay:
Aditya ₹820
Rohit ₹600
Receive:
Rahul ₹1,200
Aman ₹2,340
Rohit ₹1,280
Net position
+₹3,400
---
15. Pairwise "Explain Balance"
Every balance should have an explanation.
Example:
Ketan ↔ Rahul
Rahul owes you ₹300
Breakdown
Dinner  
Rahul owes ₹600
Movie  
Rahul owes ₹300
Groceries  
You owe Rahul ₹600
Settlement  
You paid Rahul ₹0
Final
Rahul owes you ₹300
This feature should be available from every balance.
---
16. Group Dashboard
Show:
Total group spending
Current outstanding balance
Number of members
Spending by category
Recent expenses
Who has paid the most
Who is owed the most
Settlement status
Monthly spending
Example:
Goa 2026
₹32,480 total spent
4 members
Food --- ₹8,420  
Stay --- ₹12,000  
Transport --- ₹5,240  
Activities --- ₹4,800  
Other --- ₹2,020
---
17. Settlement Center
A dedicated area for settlement.
Features
See who owes whom
See optimized settlement
Settle individual balance
Settle all
Record cash settlement
Record bank/UPI settlement
Settlement history
Undo/correct settlement where appropriate
Example:
> **12 outstanding obligations**
>
> **Can be settled with 6 payments**
CTA:
View smart settlement
---
18. Recurring Expenses
Users can create recurring expenses.
Examples:
Rent
Internet
Electricity
Netflix
Maid
Groceries
Fields:
Amount
Frequency
Start date
End date optional
Payer
Participants
Split method
Support:
Daily
Weekly
Monthly
Custom recurring schedules
---
19. Expense Templates
Users can save common expenses.
Example:
Friday Dinner
Default:
Participants: Ketan, Rahul, Aman, Rohit
Category: Food
Split: Equal
Next time:
Enter amount → Save.
---
20. Smart Defaults
The app should use local historical data to suggest:
Previous participants
Previous payer
Previous category
Previous split method
Previous description
This does not require an AI API.
Users should always be able to override suggestions.
---
21. Search
Search expenses by:
Description
Person
Category
Amount
Date
Group
Tag
Filters:
Date range
Paid by
Participant
Category
Amount range
---
22. Categories
Default categories:
Food
Transport
Accommodation
Entertainment
Shopping
Groceries
Utilities
Rent
Travel
Bills
Other
Users can create custom categories.
---
23. Monthly Close
Useful for long-running groups.
Example:
August 2026
Total shared expenses:
₹18,420
Your share:
₹6,820
You paid:
₹9,400
You should receive
₹2,580
CTA:
Settle August
This should provide a clear monthly snapshot without deleting or
resetting historical records.
---
24. Reminders
Optional reminders:
Unrecorded expense reminder
Recurring expense reminder
Outstanding balance reminder
Settlement reminder
Group activity notification
Notifications must be configurable.
Avoid spam.
---
25. Settlement Reminder Sharing
Provide predefined messages that users can share.
Example:
> Hey! Just a reminder that ₹920 is still outstanding from our shared
> expenses. You can settle it whenever convenient.
Options:
Casual
Friendly
Direct
Support native sharing and WhatsApp sharing where available.
---
26. India-First Features
UPI
Where technically and legally appropriate, support UPI payment
intent/deep links.
Example:
> Rahul owes you ₹920
Pay ₹920 via UPI
The app should not hold user funds.
The app should only facilitate initiating the payment and recording the
settlement.
Currency
Default:
INR
Support additional currencies for travel and international groups.
---
27. Multi-Currency
Users should be able to:
Record expenses in different currencies.
View group totals in a preferred currency.
Convert historical expenses using a defined exchange rate.
Preserve original transaction currency.
Important:
Historical expenses should not silently change because exchange rates
changed.
Store the exchange rate used at transaction time.
---
28. Analytics
Free features should include:
Spending by category
Spending by person
Monthly spending
Group spending trend
Personal contribution
Personal share
Net position over time
Charts should remain understandable and useful rather than becoming a
dashboard full of unnecessary graphs.
---
29. Export
Support:
CSV export
PDF summary
Group expense report
Monthly summary
Export should preserve original amounts and currencies.
---
30. Receipt Support
V1
Allow attaching a receipt image to an expense.
Future
Add on-device OCR where feasible.
Potential workflow:
Take receipt photo.
Extract merchant/date/amount/items locally.
User confirms extracted values.
Create expense.
Receipt processing should not be dependent on an expensive external AI
API for the core product.
---
31. Itemized Bills
Future feature.
Example:
Restaurant bill:
Pizza --- ₹600 → Ketan + Rahul  
Pasta --- ₹450 → Aman  
Drinks --- ₹300 → Rahul + Rohit
Tax/service charge can be distributed proportionally or manually.
This should integrate with receipt scanning.
---
32. Offline-First Requirement
The app should remain usable without internet for core functionality.
Offline functionality:
View groups
View expenses
Add expenses
Edit expenses
Calculate balances
Calculate settlement recommendations
Search local data
View analytics
Sync can happen when connectivity returns.
---
33. Data Architecture
Recommended conceptual architecture
``` text
Users
  |
Groups
  |
  +-- Members
  |
  +-- Expenses
  |     +-- Payers
  |     +-- Participants
  |     +-- Splits
  |
  +-- Settlements
  |
  +-- Adjustments
  |
  +-- Recurring Expenses
  |
  +-- Templates
```
Derived layer:
``` text
Ledger
   ↓
Balance Engine
   ↓
Pairwise Balances
   ↓
Net Positions
   ↓
Settlement Optimizer
   ↓
Recommended Transfers
```
The settlement optimizer must never overwrite the original ledger.
---
34. Suggested Technology Direction
Mobile
React Native + Expo
Reason:
Existing React knowledge
Android + iOS from one codebase
Fast iteration
Good fit for vibe-coded development
Local data
Prefer:
SQLite or an equivalent structured local database.
State management
A lightweight predictable state-management solution such as Zustand can
be considered.
Backend
Not required for the first local MVP.
Future options:
Supabase
Firebase
Custom backend
Backend selection should be based on:
Real-time sync requirements
Cost
Security
Scalability
Data ownership
Authentication
MVP:
Guest/local profile
Future:
Email
Google
Apple
Phone authentication
---
35. Privacy & Security
Financial data is sensitive.
Requirements:
Minimal data collection.
Clear privacy policy.
Secure authentication.
Encrypted network traffic.
Secure server-side storage once cloud sync exists.
Never store payment credentials.
Never store UPI PINs.
Never process funds directly unless the product later becomes a
regulated financial service and all required compliance is
addressed.
Allow users to delete their account and data.
Allow group owners to understand what happens to group data when a
member leaves.
---
36. Monetization Strategy
Product philosophy
Core expense splitting should remain free.
Do not monetize basic functionality through:
Expense limits
Group limits
Artificial transaction caps
Ads inside core financial workflows
Potential future monetization
1. Travel affiliate revenue
For trip groups:
Hotels
Activities
Travel services
Insurance
Transportation
2. Optional cloud storage
Potential paid features:
Large receipt storage
Long-term document storage
3. Advanced personal analytics
Potential premium analytics could include deeper historical reports, but
core analytics should remain free.
4. Business product
Long-term opportunity:
Settle for Teams
Features:
Employee expense management
Reimbursements
Approval workflows
Expense policies
Accounting exports
Admin dashboard
Team reports
Corporate integrations
This can become the primary monetization engine while keeping the
consumer product free.
5. Partnerships
Potential partnerships with:
Travel platforms
Financial products
Student services
Group activities
Any commercial placement must be clearly disclosed and should not
compromise user trust.
---
37. Growth Strategy
Viral loop
A group expense app naturally has a built-in invitation loop.
One person creates a group.
Then invites:
3 friends
5 roommates
10 trip members
Every new member becomes a potential new user.
Shareable moments
Allow users to share:
Trip summaries
Settlement requests
Group reports
Expense cards
Import
A major future growth feature should be:
> **Import your existing expenses from other expense-management apps.**
Reducing migration friction is critical for competing with an
established product.
---
38. Product Differentiators
Settle should not compete only on "free."
Differentiator 1
Global Smart Settlement
Optimize the entire group's debt network.
Differentiator 2
Explain Every Balance
Users can always understand where a number came from.
Differentiator 3
Action-Oriented Home
Show:
> Pay ₹X\
> Receive ₹Y\
> Net +₹Z
rather than only displaying transaction history.
Differentiator 4
Recurring Expense Automation
Reduce repetitive entry for long-running groups.
Differentiator 5
India-first Settlement
UPI + WhatsApp + INR-first experience.
Differentiator 6
Free Core Product
Useful features are not artificially restricted.
Differentiator 7
Fast Expense Entry
Common expenses should require minimal interaction.
---
39. UX Requirements
General
Mobile-first.
Fast.
Minimal cognitive load.
Clear typography.
Strong hierarchy for monetary values.
Accessible contrast.
Dark mode.
Avoid excessive decorative UI.
Avoid unnecessary animations.
Never hide important balances behind menus.
Money display
Use consistent formatting:
₹1,240
₹12,500
₹1,25,000
Always clearly indicate whether a value is:
Owed
Owing
Paid
Settled
Net positive
Net negative
Color
Color should reinforce meaning but never be the only indicator.
Example:
Positive: green + "You are owed"
Negative: red/orange + "You owe"
Settled: neutral/success state
---
40. Primary Navigation
Initial proposal:
Home
Personal financial position.
Groups
All groups.
Activity
Recent expenses and settlements.
Settle
Outstanding and optimized settlement actions.
Profile/settings can be accessed from the appropriate navigation area.
---
41. Home Screen
Example:
``` text
Good evening, Ketan

YOUR NET POSITION
+₹3,400

You are owed       You owe
₹4,820             ₹1,420

[ Settle ]

YOUR GROUPS

Goa Trip
+₹1,840

Flatmates
-₹620

College Friends
+₹2,180
```
The exact UI should be refined through design iteration.
---
42. Group Screen
Example:
``` text
Goa 2026

₹32,480 total spent
4 members

You
+₹1,840

[ Add Expense ]

Overview
Expenses
Balances
Settle

Recent

Dinner             ₹2,400
Hotel              ₹12,000
Airport Cab         ₹780
```
---
43. Success Metrics
Activation
% of new users creating a group.
% creating first expense.
Time from install to first expense.
Engagement
Expenses added per active group.
Weekly active groups.
Monthly active users.
Number of active groups per user.
Recurring expense usage.
Core value
% of groups reaching at least one settlement.
Average time from expense creation to settlement.
Number of transactions avoided by smart settlement.
Average number of original obligations vs optimized transfers.
Retention
Day 1
Day 7
Day 30
Monthly group retention
Growth
Invites per active user.
Invite acceptance rate.
New users per existing group.
Group-to-user viral coefficient.
Monetization
Affiliate conversion.
Premium conversion where applicable.
Business-product leads.
Revenue per active user.
---
44. MVP Success Criteria
The MVP is successful if a real friend group can:
Create a group.
Add members.
Record expenses.
Use different split methods.
Correct mistakes.
See individual balances.
See their net position.
Understand why a balance exists.
Generate a globally optimized settlement plan.
Record settlements.
End with all balances at zero.
The most important test:
> **Can a real group use Settle for a month without needing to maintain
> a separate spreadsheet, WhatsApp calculation, or manual calculator?**
If yes, the product has achieved its core objective.
---
45. MVP Scope --- Explicitly Excluded
Do not build these initially:
AI chatbot
AI financial advisor
Full banking integration
Card transaction imports
Full accounting software
Complex social feed
In-app messaging platform
Direct money custody
Lending
Credit scores
Cryptocurrency
Complex business accounting
Large travel marketplace
Receipt OCR as a launch blocker
These can be considered only after the core expense and settlement
engine is reliable.
---
46. Development Phases
Phase 0 --- Product foundation
Finalize name/branding.
Finalize UX architecture.
Define data model.
Define balance calculation rules.
Define settlement algorithm.
Define rounding rules.
Define edge cases.
Phase 1 --- Local MVP
Onboarding
Groups
Members
Expenses
Splits
Local database
Balance engine
Smart settlement
Settlement history
Search
Basic analytics
Phase 2 --- Real-world beta
Invite links
QR invitations
Notifications
Recurring expenses
Templates
Smart defaults
Export
Dark mode
Error handling
Performance improvements
Phase 3 --- Cloud
Authentication
Cloud sync
Multi-device support
Conflict resolution
Secure backups
Account management
Phase 4 --- India-first features
UPI intents
WhatsApp sharing
INR optimization
Better reminders
Multi-currency
Phase 5 --- Growth
Splitwise/import migration
Receipt scanning
Itemized bills
Trip mode
Advanced analytics
Web app
Phase 6 --- Monetization
Travel partnerships
Optional premium services
Business product
Team expense management
Partnerships/integrations
---
47. Critical Edge Cases
The balance engine must correctly handle:
One payer, many participants.
Many payers, many participants.
User owes themselves.
Zero-value expenses.
Decimal currencies.
Currency conversion.
Unequal splits.
Percentage rounding.
Share rounding.
Multiple settlements.
Partial settlements.
Overpayment.
Refunds.
Deleted expenses.
Edited expenses.
User leaving a group.
User being removed.
Archived groups.
Recurring expense cancellation.
Offline edits.
Sync conflicts.
Duplicate expenses.
Duplicate settlements.
Very large groups.
Long-running groups with thousands of transactions.
Circular debt networks.
Multiple connected debt chains.
Disconnected subgroups.
---
48. Non-Functional Requirements
Performance
Core calculations should feel instantaneous for normal consumer groups.
Scalability
The architecture should support:
Thousands of transactions per group.
Large numbers of groups.
Large user base.
Cloud synchronization.
Eventual web client/API.
Reliability
Financial calculations must prioritize correctness over speed.
Offline
Core expense and balance operations should work offline where possible.
Observability
Future backend should support:
Error logging
Audit events
Sync diagnostics
Performance monitoring
Calculation mismatch detection
---
49. Product North Star
The North Star metric should not simply be downloads.
A more meaningful metric is:
> **Successful settlements completed through Settle.**
A stronger secondary metric:
> **Optimized payments generated per active group.**
The product succeeds when users stop thinking about expense accounting
and simply trust Settle to tell them:
> **"Here's where you stand, and here's what you need to do."**
---
50. Final Product Definition
Settle is a free, modern shared-expense app that records group
expenses, calculates transparent balances, and intelligently optimizes
the entire group's debts into the simplest possible settlement plan.
The defining experience is:
``` text
Record expenses
      ↓
Calculate true balances
      ↓
Explain balances
      ↓
Optimize debt network
      ↓
Show who actually needs to pay whom
      ↓
Settle
      ↓
Everyone is balanced
```
Product slogan:
> **Split expenses. Settle smarter.**