# Implementation Plan - Unique Settle ID, Action Center Notifications & Header/Menu Reorganization

## Context & User Intent
1. **Search Privacy & Direct Lookup**:
   - Disallow random public user discovery by name.
   - Searching must strictly support:
     1. **Existing Friends** (co-members from existing shared groups/invitations).
     2. **Unique Settle ID** (e.g. `settle_kg_9281` or short tag).
     3. **Direct Email ID**.
2. **Action Center (Invitations & Notifications)**:
   - When user A invites user B to a group (via friend selection, Settle ID, or email), an invitation notification is delivered to User B's **Action Center**.
   - User B sees the invitation with **Accept** or **Reject** action buttons.
   - If User B **accepts**: they become an enrolled member of the group.
   - If User B **rejects**: a notification is sent back to User A (*"User B has rejected your invitation to [Group Name]"*).
3. **Header & Navigation Reorganization**:
   - **Top-Left Avatar**: Opens User Profile & Settings (displaying their Unique Settle ID with 1-tap copy, account info, email, currency, sign-out).
   - **Top-Right**: Shows a **Hamburger Menu (☰)** button with an unread badge indicator.
   - **Slide-out / Modal Action Center & Menu Page**: Contains the **Notifications & Action Center** tab (Group Invitations, alerts) and quick links.

---

## User Review Required
> [!NOTE]
> All group member invitations triggered during group creation will now generate interactive Action Center notifications for invited users so they can Accept or Reject in real-time.

---

## Proposed Technical Changes

### 1. Backend Architecture
- **Schema / Database**:
  - Add `settleId` unique field to `User` model (generated automatically on registration if null, e.g. based on username + unique suffix).
  - Add `Notification` model with fields:
    - `id`, `recipientUserId`, `actorUserId`, `type` (`GROUP_INVITE`, `INVITE_ACCEPTED`, `INVITE_REJECTED`, `GENERAL`), `groupId`, `groupName`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`, `READ`), `title`, `message`, `metadata`, `createdAt`, `updatedAt`.
- **Modules**:
  - `backend/src/modules/notifications/notification.service.ts`: `createNotification`, `getUserNotifications`, `respondToInvite(notificationId, accept)`.
  - `backend/src/modules/notifications/notification.controller.ts` & `notification.routes.ts`: `GET /api/v1/notifications`, `POST /api/v1/notifications/:id/respond`.
  - `backend/src/modules/users/user.service.ts`: Update `searchUsers` to strictly query by exact `email` or `settleId` and match local friends.

### 2. Frontend Architecture
- **App Header (`src/components/AppHeader.tsx`)**:
  - Avatar on top-left routes to `/profile` (User Settings, Settle ID with 1-tap copy, Currency, Logout).
  - Top-Right displays Hamburger Menu `☰` with badge count routing to `/menu` (Action Center & Notifications).
- **Profile / Settings Screen (`app/profile.tsx` & `app/settings.tsx`)**:
  - Displays avatar, name, email, and prominent **Unique Settle ID** with copy button.
- **Action Center & Menu Screen (`app/menu.tsx` / modal)**:
  - Tabbed or dedicated Action Center displaying pending invitations with **Accept** / **Reject** buttons and notification history.
- **Group Creation Flow (`app/groups/new.tsx`)**:
  - Clean Step 2: Friends chips + Search strictly by Settle ID or Email.
  - Sending invites automatically dispatches Action Center notifications.

---

## Verification Plan
1. `npm run typecheck` across root and backend.
2. Verify Step 2 friend search strictly requires Settle ID or Email and shows Friends chips.
3. Test Top-Left Avatar $\to$ Profile & Settle ID.
4. Test Top-Right Hamburger $\to$ Action Center with Accept/Reject invitation workflow.
