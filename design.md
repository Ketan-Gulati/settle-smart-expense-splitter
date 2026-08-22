Settle --- Design System & UI Direction
Version: 0.1  
Date: 22 August 2026  
Platform: Android + iOS
---
1. Design Vision
Settle should feel like a premium native consumer product, not a
spreadsheet, banking dashboard, or AI-generated SaaS template.
The visual experience should communicate:
Trust
Clarity
Calm
Precision
Personality
Speed
Financial confidence
The core design principle is:
> **Make complicated group money feel visually simple.**
The user should not need to understand accounting terminology to
understand their position.
---
2. Design North Star
The product should answer three questions immediately:
1. Where do I stand?
> **You are owed ₹3,420**
2. What do I need to do?
> **Pay Raj ₹800**
3. What happens next?
> **Settle 2 payments and you're done.**
The UI should prioritize these answers over raw transaction data.
---
3. Visual Personality
Settle should be:
Minimal but not empty.
Expressive but not loud.
Premium but not luxurious.
Playful but not childish.
Technical but not developer-oriented.
Animated but not distracting.
Distinctive but not gimmicky.
---
4. Explicit Anti-Pattern Rules
The following are intentionally prohibited as default design patterns.
Avoid
Harsh gradients
Rainbow color systems
Purple-and-black AI aesthetics
Neon colors
Generic pastel palettes
Excessive glassmorphism
Liquid glass everywhere
Heavy shadows
Excessive blur
Pure-white flat screens with no hierarchy
Generic 3-card rows
Repetitive bento grids
Card grids as the solution to every layout problem
Terminal/code-window aesthetics
Fake testimonials
Fake product demonstrations
Generic 3-tier pricing sections
Checkmark-bullet-heavy layouts
Radial orb backgrounds
Dot-grid backgrounds
Decorative sparkle icons
Random floating objects
Excessive Lucide/icon decoration
Emoji-heavy interfaces
Colored left stripes
Skeleton loaders used as decoration
Excessive pills
Excessive rounded containers
Random 3D objects
Meaningless animated arrows
Overly soft "everything is a card" layouts
Generic AI-generated fintech dashboards
Default Inter/Geist/Space Grotesk typography without deliberate
selection
Em-dashes in interface copy
Copy patterns such as "It's not X, it's Y" used repeatedly
These patterns may be used only when there is a clear product reason and
the result remains visually restrained.
---
5. Design Language
Settle should use a structured editorial interface rather than a
collection of floating cards.
Think in terms of:
``` text
Typography
+
Spacing
+
Hierarchy
+
Surface
+
Motion
+
Data visualization
```
rather than:
``` text
Cards
+
Gradients
+
Icons
+
Shadows
+
Pills
```
---
6. Layout Philosophy
Use strong composition.
Screens should have:
One clear primary focus
Strong hierarchy
Intentional whitespace
Meaningful grouping
Consistent alignment
Predictable touch targets
Avoid:
Equal visual weight for every element
Dense dashboards
Too many cards
Excessive borders
Excessive separators
---
7. Primary Navigation
Recommended navigation:
``` text
Home
Groups
Activity
Settle
```
Profile/settings can live within the appropriate navigation context.
The navigation should feel native to the platform.
Do not reproduce a desktop navigation bar on mobile.
---
8. Home Screen Design
The Home screen is the most important screen.
It should not look like a conventional finance dashboard.
Example
``` text
Good evening, Ketan

YOUR POSITION

+₹3,420

You are owed ₹4,820
You owe ₹1,400

[ Settle ]

RECENT ACTIVITY

Dinner
₹2,400
You paid

Cab
₹480
Rahul paid

YOUR GROUPS

Goa 2026
+₹1,840

Flatmates
-₹620
```
The most important value should dominate visually.
---
9. Financial Hierarchy
Monetary values should have clear hierarchy.
Primary
Large:
``` text
+₹3,420
```
Secondary
Medium:
``` text
₹820
```
Supporting
Small:
``` text
You paid
Yesterday
Food
```
Never make:
``` text
₹3,420
```
look visually identical to:
``` text
Yesterday
```
---
10. Positive and Negative States
Use semantic language.
Positive
``` text
+₹3,420
You are owed
```
Negative
``` text
-₹820
You owe
```
Settled
``` text
Settled
₹0 outstanding
```
Color can reinforce these states, but color must not be the only
indicator.
---
11. Color System
Use a restrained semantic palette.
The final exact colors should be selected during visual exploration.
Conceptually:
``` text
Primary
Secondary
Background
Surface
Elevated Surface
Text Primary
Text Secondary
Text Muted
Border
Positive
Negative
Warning
Destructive
```
Requirements
Strong contrast
Limited accent colors
Semantic consistency
Light and dark themes
No rainbow category system
Important
Do not make every category a different bright color.
---
12. Typography
Typography should feel intentional and product-specific.
Do not select a font simply because it is popular in AI-generated
interfaces.
Typography should distinguish:
``` text
Display / Financial amount
Heading
Subheading
Body
Label
Caption
Numeric metadata
```
Financial numbers
Use:
High legibility
Strong weight
Consistent numeral treatment
Appropriate letter spacing
Avoid excessively decorative typefaces for monetary values.
---
13. Spacing System
Use a consistent spacing scale.
Suggested base:
``` text
4
8
12
16
20
24
32
40
48
64
```
Do not invent arbitrary spacing values throughout the app.
Spacing should create hierarchy without requiring borders everywhere.
---
14. Corner Radius
Use restrained corner radii.
Not every element needs to be a pill or a highly rounded rectangle.
Suggested conceptual levels:
``` text
Small
Medium
Large
Full / Pill
```
Use full pill shapes primarily for:
Compact filters
Tags
Status indicators
Small controls
Avoid making every button, card, and container a pill.
---
15. Shadows & Elevation
Use shadows sparingly.
Prefer:
Contrast
Surface variation
Borders
Spacing
before heavy shadows.
If shadows are used:
Keep them subtle.
Use them to communicate elevation.
Avoid large blurry shadows around every card.
---
16. Surfaces
Use a small number of meaningful surface levels.
Example:
``` text
Background
   ↓
Surface
   ↓
Elevated Surface
```
Do not create a different background treatment for every section.
---
17. Cards
Cards are allowed but should not become the default layout primitive.
Use cards when they represent a meaningful object:
Expense
Group
Settlement action
Report
Important balance
Avoid:
``` text
Everything = Card
```
Prefer flat sections when cards do not add meaning.
---
18. Expense Row
An expense row should be compact and scannable.
Example:
``` text
●  Dinner

   Rahul · Yesterday

                    ₹2,400
                    You paid
```
The visual hierarchy should be:
``` text
Description
Person/date
Amount
Status
```
Avoid unnecessary icons for every metadata field.
---
19. Group Design
Groups should feel like living spaces rather than folders.
Example:
``` text
GOA 2026

₹32,480
Total spent

4 people

You
+₹1,840

[ Add expense ]

Overview   Expenses   Balances   Settle
```
A group can have a subtle visual identity through:
Color accent
Image
Illustration
Typography
Context-specific visual treatment
Do not use random decorative graphics.
---
20. Group Identity
Different group types can have subtle visual personalities.
Examples:
Trip
Slightly more expressive.
Roommates
Calm and practical.
Friends
Casual and energetic.
Family
Warm and simple.
Couple
Minimal and personal.
The underlying design system must remain consistent.
---
21. Expense Creation UX
This is one of the most frequently used flows.
It should feel extremely fast.
Default flow
``` text
Amount
   ↓
Description
   ↓
Payer
   ↓
Participants
   ↓
Split
   ↓
Save
```
Do not force users through unnecessary screens.
---
22. Amount Input
The amount should be the visual focus.
Example:
``` text
Dinner

        ₹2,400
```
Use a dedicated numeric keypad where appropriate.
The interface should make entering money feel effortless.
Avoid unnecessary formatting while typing.
---
23. Split UI
The split interface should prioritize understanding.
Example:
``` text
₹2,400

Ketan     ₹600
Rahul     ₹600
Aman      ₹600
Rohit     ₹600

             Total ₹2,400
```
For percentage or shares:
Show both:
Input method
Resulting amount
Never force users to mentally convert percentages into money.
---
24. Smart Defaults
When adding an expense, use previous behavior to reduce work.
Example:
``` text
Dinner

Suggested group:
Ketan
Rahul
Aman
Rohit

Split:
Equal

Payer:
You
```
Suggestions should be subtle.
Do not make the app feel invasive.
---
25. Balance Screen
The balance screen should prioritize actionable information.
Example:
``` text
YOUR BALANCE

+₹3,420

YOU ARE OWED

Rahul          ₹1,200
Aman           ₹2,340
Rohit          ₹1,280

YOU OWE

Aditya          ₹820
Rohit           ₹600
```
The user should not have to inspect dozens of transactions to know what
they need to do.
---
26. Balance Explanation
Every balance should be explainable.
Example:
``` text
Rahul owes you ₹300

Dinner       +₹600
Movie        +₹300
Groceries    -₹600
------------------
Total        +₹300
```
Use progressive disclosure.
Do not show all accounting details by default.
---
27. Smart Settlement Screen
This is the signature screen.
It should feel visually special without becoming gimmicky.
Header
``` text
SMART SETTLEMENT

12 outstanding obligations

can become

6 payments
```
Then:
``` text
You → Raj

₹200

Rohit → Raj

₹100
```
Primary CTA
``` text
Settle all
```
---
28. Settlement Visualization
Use visualization where it genuinely improves understanding.
Potential design:
``` text
Ketan ────────₹200──────→ Raj
Rohit ────────₹100──────→ Raj
```
The network can animate from:
``` text
Complex
```
to:
``` text
Optimized
```
This can become one of Settle's signature interactions.
---
29. "Why Am I Paying This Person?"
This should be an elegant explanation rather than a technical diagram.
Example:
``` text
Why are you paying Raj?

You owe Rohit ₹200.

Rohit owes Raj ₹300.

Instead of sending ₹200 to Rohit first,
you can pay Raj directly.

Rohit then only needs to pay Raj ₹100.

This settles the same obligations
with less movement of money.
```
Use progressive disclosure.
---
30. Settlement Completion
The completion state can be one of the places where motion is
expressive.
Example:
``` text
✓

Everyone is settled

₹0 outstanding
```
Potential animation:
Balance values converge toward zero.
Settlement lines disappear.
A subtle completion animation plays.
Haptic feedback confirms completion.
Do not use confetti by default.
---
31. Activity Screen
Activity should feel chronological and lightweight.
Example:
``` text
TODAY

Dinner
You paid ₹2,400

Cab
Rahul paid ₹480

YESTERDAY

Movie
Aman paid ₹1,200
```
Avoid turning every item into a large card.
---
32. Analytics
Analytics should be visual but restrained.
Use:
Line charts
Bars
Donuts only where useful
Small comparison visuals
Sparklines
Avoid:
Decorative charts
3D pie charts
Excessive gradients
Charts without a clear takeaway
Every chart should answer a question.
Example:
> **You spent 24% more on food this month.**
---
33. Motion System
Motion should communicate:
Cause
Effect
Continuity
State
Feedback
Suggested motion levels
Micro
100--180ms
For:
Press
Toggle
Small state changes
Standard
180--300ms
For:
Navigation
Cards
Bottom sheets
Number transitions
Expressive
300--600ms
For:
Settlement transformation
Major state changes
Important visual moments
Avoid slow animations that make normal navigation feel sluggish.
---
34. Gesture System
Use gestures where they improve speed.
Potential interactions:
Swipe expense
``` text
← Edit
→ Delete
```
Swipe settlement
``` text
→ Mark settled
```
Drag chart
Inspect historical values.
Pull interaction
Refresh/sync where appropriate.
Gestures must have discoverable alternatives for accessibility.
---
35. Haptics
Use haptics sparingly.
Good:
Expense saved
Settlement completed
Important toggle
Successful action
Bad:
Every tap
Every scroll
Every animation
---
36. 3D Direction
3D can be used as a signature visual layer.
Potential uses:
Settlement completion object
Trip visualization
Group identity
Subtle parallax
Hero moments
3D must never obscure:
Amounts
Buttons
Navigation
Financial information
Performance takes priority.
---
37. Dark Mode
Dark mode should not simply invert the light theme.
Design a dedicated dark palette.
Requirements:
Proper contrast
Reduced glare
Clear surface hierarchy
Semantic colors remain understandable
Charts remain readable
Images do not become visually broken
Avoid pure black everywhere unless deliberately chosen.
---
38. Responsive Behavior
Although mobile is the primary platform, support:
Small phones
Large phones
Tablets where practical
Different aspect ratios
Android navigation variations
iOS safe areas
Do not hardcode layouts around one device screenshot.
---
39. Accessibility
Support:
Screen readers
Dynamic font sizing
Touch targets
Sufficient contrast
Reduced motion
Semantic labels
Never rely only on:
Color
Position
Animation
to communicate a financial state.
---
40. Loading States
Prefer cached data when available.
Use loading states only when the user is genuinely waiting.
Good:
``` text
Refreshing balances...
```
Avoid creating skeleton loaders for every screen merely because they
look modern.
---
41. Empty States
Every empty state should answer:
What is empty?
Why does it matter?
What should I do next?
Example:
``` text
No expenses yet

Add your first shared expense
to start tracking the group.

[ Add expense ]
```
---
42. Error States
Errors should be:
Clear
Specific
Actionable
Calm
Example:
``` text
Couldn't sync right now.

Your expense is safely stored on this device.
We'll try again when you're online.
```
Avoid generic:
``` text
Something went wrong.
```
unless no better explanation is possible.
---
43. Notifications
Notifications should be useful, not promotional noise.
Good:
> Rahul added Dinner · ₹2,400
> You owe Raj ₹200
> Your recurring rent expense was added
Avoid:
> Hey! Come check your amazing financial dashboard!
---
44. Microcopy
Use direct language.
Prefer:
> You owe ₹820
over:
> Your outstanding financial obligation is ₹820
Prefer:
> You're owed ₹3,420
over:
> Your net receivable position is ₹3,420
Prefer:
> Settle all
over:
> Initiate optimized group settlement workflow
---
45. Iconography
Use one coherent icon language.
Icons should:
Communicate function.
Have consistent stroke/weight.
Have consistent sizing.
Avoid decorative icon clusters.
Do not place an icon next to every sentence.
---
46. Imagery
Imagery should support the product.
Good:
Group avatars
Trip images
User-selected group cover
Receipt images
Contextual illustrations
Avoid:
Generic stock people
Fake testimonials
Random 3D finance illustrations
Generic "happy users" imagery
---
47. Design Tokens
All major visual properties should be centralized.
Conceptually:
``` text
design/
├── colors
├── typography
├── spacing
├── radius
├── elevation
├── motion
├── icons
└── themes
```
Components should consume tokens rather than hardcoded visual values.
---
48. Component Design Principles
A component should have one clear responsibility.
Good:
``` text
BalanceAmount
SettlementRow
ExpenseRow
GroupHeader
AmountInput
```
Avoid:
``` text
UniversalSuperCard
```
that contains 30 variants and dozens of unrelated props.
Prefer composition over giant configurable components.
---
49. Design-to-Code Rules
Before implementing a new screen:
Define the hierarchy.
Identify the primary action.
Identify the primary financial information.
Define empty/loading/error states.
Define motion.
Define responsive behavior.
Check against `rules.md`.
Then implement.
Do not ask the AI:
> "Make this screen look premium."
Instead specify:
Hierarchy
Intent
Interaction
Visual language
Motion
Constraints
---
50. AI Design Boundaries
AI may:
Generate component variations.
Suggest layouts.
Generate animation prototypes.
Generate styling code.
Suggest typography combinations.
Create UI scaffolding.
AI must not automatically:
Redesign the entire application.
Introduce a new visual language per screen.
Add random dependencies.
Add decorative effects everywhere.
Replace the established design system.
Change typography arbitrarily.
Add gradients because the screen feels empty.
Add 3D because a screen feels boring.
Add cards because a layout feels sparse.
Every significant visual departure should be deliberate.
---
51. Design Review Checklist
Before accepting a screen, ask:
Hierarchy
Can I identify the main information within 1--2 seconds?
Is the primary action obvious?
Financial clarity
Is it immediately clear whether I owe or am owed?
Are monetary values easy to scan?
Can important balances be explained?
Visual quality
Does it feel intentional?
Does it avoid generic AI aesthetics?
Is there unnecessary decoration?
Are colors restrained?
Interaction
Does motion communicate something?
Are gestures useful?
Does the UI respond quickly?
Accessibility
Can the information be understood without color?
Are touch targets large enough?
Does the layout work with larger text?
Performance
Is animation smooth?
Are expensive visual effects justified?
Would this work on a mid-range Android device?
---
52. Design Quality Bar
A screen should not ship simply because:
> "It looks good."
It should satisfy:
``` text
Useful
+
Understandable
+
Fast
+
Accessible
+
Consistent
+
Distinctive
+
Performant
```
---
53. Signature Settle Experiences
The following should eventually become recognizable Settle interactions:
1. Net Position
A beautiful animated representation of:
``` text
+₹3,420
```
that changes naturally as expenses are added.
2. Smart Settlement
A complex network transforms into a small number of optimized payments.
``` text
12 obligations
       ↓
6 payments
```
3. Balance Explanation
Tap a balance and see the underlying financial path in an elegant,
understandable way.
4. Settlement Completion
The entire group's balances converge toward:
``` text
₹0 outstanding
```
with a subtle, satisfying completion interaction.
These are better opportunities for visual "wow" than decorative effects.
---
54. Final Design Principle
> **Settle should look expensive to build, but simple to use.**
The user should see:
Clear numbers
Clear actions
Beautiful transitions
Thoughtful details
They should not see:
The complexity of the accounting engine
The complexity of the sync system
Random AI-generated decoration
Technical implementation details
The complexity belongs underneath.
The experience should feel effortless.