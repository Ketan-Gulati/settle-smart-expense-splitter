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

export type NotificationType = 'GROUP_INVITE' | 'INVITE_ACCEPTED' | 'INVITE_REJECTED' | 'EXPENSE_ADDED' | 'GENERAL';
export type NotificationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'READ';

export interface NotificationDTO {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
  type: NotificationType;
  groupId?: string;
  groupName?: string;
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
