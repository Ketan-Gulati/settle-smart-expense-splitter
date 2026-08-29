export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  settleId?: string;
  avatarUrl: string | null;
  createdAt?: string;
}

export type NotificationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'READ';

export type NotificationType =
  | 'GROUP_MEMBER_JOINED'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_EDIT_REQUEST'
  | 'EXPENSE_EDIT_GRANTED'
  | 'EXPENSE_EDIT_DENIED'
  | 'PAYMENT_RECEIVED'
  | 'GROUP_SETTLED_UP'
  | 'GROUP_INVITE'
  | 'INVITE_ACCEPTED'
  | 'INVITE_REJECTED'
  | 'PAYMENT_REMINDER'
  | 'RECURRING_BILL_DUE'
  | 'GENERAL';

export interface NotificationDTO {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
  type: NotificationType;
  groupId?: string;
  groupName?: string;
  expenseId?: string;
  expenseTitle?: string;
  amountMinor?: number;
  status: NotificationStatus;
  title: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResultDTO {
  user: UserDTO;
  tokens: AuthTokensDTO;
}

export type GroupType = 'TRIP' | 'APARTMENT' | 'HOME' | 'COUPLE' | 'FRIENDS' | 'OTHER';

export interface GroupMemberDTO {
  id: string;
  userId: string;
  name: string;
  email?: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface GroupInvitationDTO {
  id: string;
  groupId: string;
  inviteCode: string;
  inviteLink: string;
  createdByUserId: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface InvitePreviewDTO {
  groupId: string;
  groupName: string;
  groupType: GroupType;
  currency: string;
  createdByName: string;
  memberCount: number;
  members: Array<{ id: string; name: string; avatarUrl: string | null }>;
  inviteCode: string;
  totalSpentMinor?: number;
  expenseCount?: number;
}

export interface UserSearchDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface GroupDTO {
  id: string;
  name: string;
  groupType?: GroupType;
  currency: string;
  createdBy: string;
  createdAt: string;
  isArchived: boolean;
  memberCount: number;
  members?: GroupMemberDTO[];
  activeInvite?: GroupInvitationDTO | null;
}

export interface ExpenseSplitDTO {
  userId: string;
  userName: string;
  amountMinor: number;
}

export interface ExpenseDTO {
  id: string;
  groupId: string;
  groupName: string;
  description: string;
  amountMinor: number;
  currency: string;
  originalAmountMinor?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  isLocked?: boolean;
  createdByUserId?: string;
  allowedEditorIds?: string[];
  paidByUserId: string;
  paidByUserName: string;
  splitMethod: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
  splits: ExpenseSplitDTO[];
}

export interface MemberBalanceDTO {
  userId: string;
  name: string;
  avatarUrl: string | null;
  netBalanceMinor: number;
}

export interface GroupBalancesDTO {
  groupId: string;
  userNetBalanceMinor: number;
  members: MemberBalanceDTO[];
}

export interface PersonBalanceDetailDTO {
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  netBalanceWithPersonMinor: number;
  youPaidForPersonMinor: number;
  personPaidForYouMinor: number;
  sharedExpenseCount: number;
  sharedExpenses: Array<{
    id: string;
    description: string;
    amountMinor: number;
    currency: string;
    date: string;
    payerId: string;
    payerName: string;
    userShareMinor: number;
    personShareMinor: number;
  }>;
}

export interface SettlementDTO {
  id: string;
  groupId: string;
  groupName?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountMinor: number;
  currency: string;
  note: string | null;
  createdAt: string;
}

export interface ActivityEventDTO {
  id: string;
  type: 'EXPENSE' | 'SETTLEMENT';
  title: string;
  groupId: string;
  groupName: string;
  timestamp: string;
  totalAmountMinor: number;
  currency: string;
  payerName: string;
  userShareMinor: number;
  subtitle?: string;
  statusText?: string;
}

export interface DashboardGroupCardDTO {
  id: string;
  name: string;
  currency: string;
  userNetBalanceMinor: number;
  unsettledExpenseCount: number;
  memberCount: number;
}

export interface DashboardDTO {
  totalNetBalanceMinor: number;
  groups: DashboardGroupCardDTO[];
  recentActivity: ActivityEventDTO[];
}

export interface RecurringScheduleDTO {
  id: string;
  groupId: string;
  groupName?: string;
  title: string;
  amountMinor: number;
  currency: string;
  category: string | null;
  paidByUserId: string;
  paidByUserName: string;
  splitMethod: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
  behavior: 'AUTO_ADD' | 'REMIND_CONFIRM';
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  startDate: string;
  endDate: string | null;
  nextOccurrenceAt: string;
  lastGeneratedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCommentDTO {
  id: string;
  expenseId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface CategorySpendSummaryDTO {
  category: string;
  totalMinor: number;
  percentage: number;
  expenseCount: number;
}

export interface GroupSpendSummaryDTO {
  groupId: string;
  groupName: string;
  userShareMinor: number;
  percentage: number;
  currency: string;
}

export interface MonthlyTrendItemDTO {
  month: string;
  totalShareMinor: number;
  paidUpfrontMinor: number;
}

export interface AnalyticsSummaryDTO {
  period: string;
  totalUserShareMinor: number;
  totalPaidUpfrontMinor: number;
  monthOverMonthPercentChange: number;
  categoryBreakdown: CategorySpendSummaryDTO[];
  groupDistribution: GroupSpendSummaryDTO[];
  monthlyTrend: MonthlyTrendItemDTO[];
}
