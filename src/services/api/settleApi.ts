import { ApiClient } from './client';
import { TokenStorage } from './tokenStorage';
import {
  AuthResultDTO,
  UserDTO,
  GroupDTO,
  ExpenseDTO,
  GroupBalancesDTO,
  PersonBalanceDetailDTO,
  SettlementDTO,
  ActivityEventDTO,
  DashboardDTO,
  NotificationDTO,
  RecurringScheduleDTO,
} from './types';

export class SettleApiService {
  // --- Auth ---
  public static async register(name: string, email: string, password: string): Promise<AuthResultDTO> {
    const res = await ApiClient.post<AuthResultDTO>('/auth/register', { name, email, password });
    await TokenStorage.setAccessToken(res.data.tokens.accessToken);
    await TokenStorage.setRefreshToken(res.data.tokens.refreshToken);
    return res.data;
  }

  public static async login(email: string, password: string): Promise<AuthResultDTO> {
    const res = await ApiClient.post<AuthResultDTO>('/auth/login', { email, password });
    await TokenStorage.setAccessToken(res.data.tokens.accessToken);
    await TokenStorage.setRefreshToken(res.data.tokens.refreshToken);
    return res.data;
  }

  public static async sendOtp(email: string, purpose: 'SIGNUP' | 'LOGIN' | 'PASSWORD_RESET'): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>('/auth/send-otp', { email, purpose });
    return res.data;
  }

  public static async verifyOtp(payload: {
    email: string;
    purpose: 'SIGNUP' | 'LOGIN' | 'PASSWORD_RESET';
    otp: string;
    name?: string;
    password?: string;
    newPassword?: string;
  }): Promise<AuthResultDTO | { message: string }> {
    const res = await ApiClient.post<AuthResultDTO | { message: string }>('/auth/verify-otp', payload);
    if ('tokens' in res.data && res.data.tokens) {
      await TokenStorage.setAccessToken(res.data.tokens.accessToken);
      await TokenStorage.setRefreshToken(res.data.tokens.refreshToken);
    }
    return res.data;
  }

  public static async saveInviteHandoff(inviteCode: string): Promise<string> {
    const res = await ApiClient.post<{ handoffId: string }>('/auth/invite-handoff', { inviteCode });
    return res.data.handoffId;
  }

  public static async getInviteHandoff(handoffId: string): Promise<string | null> {
    try {
      const res = await ApiClient.get<{ inviteCode: string | null }>(`/auth/invite-handoff/${handoffId}`);
      return res.data.inviteCode;
    } catch {
      return null;
    }
  }

  public static async verifyEmail(token: string): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>('/auth/verify-email', { token });
    return res.data;
  }

  public static async resendVerification(email: string): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>('/auth/resend-verification', { email });
    return res.data;
  }

  public static async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  }

  public static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword });
    return res.data;
  }

  public static async logout(): Promise<void> {
    const refreshToken = await TokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await ApiClient.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore network errors on logout
      }
    }
    await TokenStorage.clearTokens();
  }

  public static async logoutAll(): Promise<void> {
    try {
      await ApiClient.post('/auth/logout-all');
    } catch {
      // Ignore network errors
    }
    await TokenStorage.clearTokens();
  }

  public static async getMe(): Promise<UserDTO> {
    const res = await ApiClient.get<UserDTO>('/auth/me');
    return res.data;
  }

  // --- Users ---
  public static async getUserProfile(): Promise<UserDTO> {
    const res = await ApiClient.get<UserDTO>('/users/me');
    return res.data;
  }

  public static async getFriends(): Promise<UserDTO[]> {
    const res = await ApiClient.get<UserDTO[]>('/users/friends');
    return res.data;
  }

  public static async searchUsers(query: string): Promise<UserDTO[]> {
    const res = await ApiClient.get<UserDTO[]>(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  }

  public static async requestPasswordChangeOtp(): Promise<{ message: string; emailMasked: string }> {
    const res = await ApiClient.post<{ message: string; emailMasked: string }>('/users/change-password/request-otp');
    return res.data;
  }

  public static async changePassword(otp: string, newPassword: string): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>('/users/change-password', {
      otp,
      newPassword,
    });
    return res.data;
  }

  public static async getAccountDeletionStatus(): Promise<{
    canDelete: boolean;
    totalOwedByYouMinor: number;
    totalOwedToYouMinor: number;
    reason?: string;
  }> {
    const res = await ApiClient.get<{
      canDelete: boolean;
      totalOwedByYouMinor: number;
      totalOwedToYouMinor: number;
      reason?: string;
    }>('/users/me/deletion-status');
    return res.data;
  }

  public static async deleteAccount(): Promise<{ message: string }> {
    const res = await ApiClient.delete<{ message: string }>('/users/me');
    return res.data;
  }

  // --- Notifications & Action Center ---
  public static async getNotifications(): Promise<import('./types').NotificationDTO[]> {
    const res = await ApiClient.get<import('./types').NotificationDTO[]>('/notifications');
    return res.data;
  }

  public static async respondToNotification(
    notificationId: string,
    action: 'ACCEPT' | 'REJECT'
  ): Promise<{ status: string; message: string }> {
    const res = await ApiClient.post<{ status: string; message: string }>(
      `/notifications/${notificationId}/respond`,
      { action }
    );
    return res.data;
  }

  public static async dismissNotification(
    notificationId: string
  ): Promise<{ status: string; message: string }> {
    const res = await ApiClient.post<{ status: string; message: string }>(
      `/notifications/${notificationId}/dismiss`,
      {}
    );
    return res.data;
  }

  public static async registerPushToken(pushToken: string): Promise<void> {
    await ApiClient.post('/notifications/register-push-token', { pushToken });
  }

  public static async sendPaymentReminder(payload: {
    recipientUserId: string;
    groupId: string;
    groupName: string;
    amountMinor: number;
    durationText?: string;
    expenseSummary?: string;
  }): Promise<NotificationDTO> {
    const res = await ApiClient.post<NotificationDTO>('/notifications/remind', payload);
    return res.data;
  }

  // --- Groups ---
  public static async getGroups(): Promise<GroupDTO[]> {
    const res = await ApiClient.get<GroupDTO[]>('/groups');
    return res.data;
  }

  public static async getGroupDetails(groupId: string): Promise<GroupDTO> {
    const res = await ApiClient.get<GroupDTO>(`/groups/${groupId}`);
    return res.data;
  }

  public static async createGroup(
    name: string,
    groupType: string = 'OTHER',
    currency: string = 'INR',
    initialMemberUserIds?: string[]
  ): Promise<GroupDTO> {
    const res = await ApiClient.post<GroupDTO>('/groups', {
      name,
      groupType,
      currency,
      initialMemberUserIds,
    });
    return res.data;
  }

  public static async addGroupMember(groupId: string, userId: string): Promise<void> {
    await ApiClient.post(`/groups/${groupId}/members`, { userId });
  }

  public static async createGroupInvite(groupId: string): Promise<import('./types').GroupInvitationDTO> {
    const res = await ApiClient.post<import('./types').GroupInvitationDTO>(`/groups/${groupId}/invites`, {});
    return res.data;
  }

  public static async revokeGroupInvite(groupId: string, inviteId: string): Promise<void> {
    await ApiClient.delete(`/groups/${groupId}/invites/${inviteId}`);
  }

  public static async resolveInvite(codeOrToken: string): Promise<import('./types').InvitePreviewDTO> {
    const res = await ApiClient.get<import('./types').InvitePreviewDTO>(`/groups/invites/${encodeURIComponent(codeOrToken)}`);
    return res.data;
  }

  public static async joinGroupViaInvite(codeOrToken: string): Promise<GroupDTO> {
    const res = await ApiClient.post<GroupDTO>(`/groups/invites/${encodeURIComponent(codeOrToken)}/join`, {});
    return res.data;
  }

  // --- Expenses ---
  public static async getMyExpenses(page = 1, limit = 100): Promise<ExpenseDTO[]> {
    const res = await ApiClient.get<ExpenseDTO[]>('/expenses/my', { page, limit });
    return res.data;
  }

  public static async getGroupExpenses(groupId: string, page = 1, limit = 50): Promise<ExpenseDTO[]> {
    const res = await ApiClient.get<ExpenseDTO[]>(`/groups/${groupId}/expenses`, { page, limit });
    return res.data;
  }

  public static async getExpenseDetails(expenseId: string): Promise<ExpenseDTO> {
    const res = await ApiClient.get<ExpenseDTO>(`/expenses/${expenseId}`);
    return res.data;
  }

  public static async createExpense(data: {
    groupId: string;
    description: string;
    amountMinor: number;
    currency?: string;
    originalAmountMinor?: number;
    originalCurrency?: string;
    exchangeRate?: number;
    isLocked?: boolean;
    paidByUserId: string;
    splitMethod: string;
    category?: string;
    notes?: string;
    participants: Array<{ userId: string; amountMinor?: number; percentage?: number; shares?: number }>;
  }): Promise<ExpenseDTO> {
    const res = await ApiClient.post<ExpenseDTO>('/expenses', data);
    return res.data;
  }

  public static async updateExpense(
    expenseId: string,
    data: {
      description?: string;
      amountMinor?: number;
      currency?: string;
      originalAmountMinor?: number;
      originalCurrency?: string;
      exchangeRate?: number;
      isLocked?: boolean;
      paidByUserId?: string;
      splitMethod?: string;
      category?: string;
      notes?: string;
      participants?: Array<{ userId: string; amountMinor?: number; percentage?: number; shares?: number }>;
    }
  ): Promise<ExpenseDTO> {
    const res = await ApiClient.patch<ExpenseDTO>(`/expenses/${expenseId}`, data);
    return res.data;
  }

  public static async requestEditAccess(expenseId: string): Promise<{ message: string }> {
    const res = await ApiClient.post<{ message: string }>(`/expenses/${expenseId}/request-edit-access`);
    return res.data;
  }

  public static async deleteExpense(expenseId: string): Promise<void> {
    await ApiClient.delete(`/expenses/${expenseId}`);
  }

  // --- Balances ---
  public static async getGroupBalances(groupId: string): Promise<GroupBalancesDTO> {
    const res = await ApiClient.get<GroupBalancesDTO>(`/groups/${groupId}/balances`);
    return res.data;
  }

  public static async getPersonBalanceDetail(groupId: string, userId: string): Promise<PersonBalanceDetailDTO> {
    const res = await ApiClient.get<PersonBalanceDetailDTO>(`/groups/${groupId}/balances/${userId}`);
    return res.data;
  }

  // --- Settlements ---
  public static async getMySettlements(page = 1, limit = 50): Promise<SettlementDTO[]> {
    const res = await ApiClient.get<SettlementDTO[]>('/settlements/my', { page, limit });
    return res.data;
  }

  public static async getGroupSettlements(groupId: string, page = 1, limit = 50): Promise<SettlementDTO[]> {
    const res = await ApiClient.get<SettlementDTO[]>(`/groups/${groupId}/settlements`, { page, limit });
    return res.data;
  }

  public static async recordSettlement(
    groupId: string,
    toUserId: string,
    amountMinor: number,
    note?: string,
    fromUserId?: string
  ): Promise<SettlementDTO> {
    const res = await ApiClient.post<SettlementDTO>(`/groups/${groupId}/settlements`, {
      fromUserId,
      toUserId,
      amountMinor,
      note,
    });
    return res.data;
  }

  // --- Activity & Dashboard ---
  public static async getActivityFeed(page = 1, limit = 50): Promise<ActivityEventDTO[]> {
    const res = await ApiClient.get<ActivityEventDTO[]>('/activity', { page, limit });
    return res.data;
  }

  public static async getDashboard(): Promise<DashboardDTO> {
    const res = await ApiClient.get<DashboardDTO>('/dashboard');
    return res.data;
  }

  // --- Recurring Schedules (Monthly Bills) ---
  public static async getGroupRecurringSchedules(groupId: string): Promise<RecurringScheduleDTO[]> {
    const res = await ApiClient.get<RecurringScheduleDTO[]>(`/groups/${groupId}/recurring-schedules`);
    return res.data;
  }

  public static async createRecurringSchedule(
    groupId: string,
    data: {
      title: string;
      amountMinor: number;
      currency?: string;
      category?: string;
      paidByUserId?: string;
      frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
      behavior?: 'AUTO_ADD' | 'REMIND_CONFIRM';
      dayOfMonth?: number;
      startDate?: string;
      endDate?: string | null;
    }
  ): Promise<RecurringScheduleDTO> {
    const res = await ApiClient.post<RecurringScheduleDTO>(`/groups/${groupId}/recurring-schedules`, data);
    return res.data;
  }

  public static async updateRecurringSchedule(
    scheduleId: string,
    data: Partial<{
      title: string;
      amountMinor: number;
      category: string;
      frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
      behavior: 'AUTO_ADD' | 'REMIND_CONFIRM';
      isActive: boolean;
    }>
  ): Promise<RecurringScheduleDTO> {
    const res = await ApiClient.patch<RecurringScheduleDTO>(`/recurring-schedules/${scheduleId}`, data);
    return res.data;
  }

  public static async deleteRecurringSchedule(scheduleId: string): Promise<void> {
    await ApiClient.delete(`/recurring-schedules/${scheduleId}`);
  }
}
