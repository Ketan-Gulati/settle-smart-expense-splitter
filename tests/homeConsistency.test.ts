import { SeedDataService } from '../src/repositories/seedDataService';
import { userRepository } from '../src/repositories/userRepository';
import { groupRepository } from '../src/repositories/groupRepository';
import { expenseRepository } from '../src/repositories/expenseRepository';
import { homeFeedService } from '../src/services/homeFeedService';
import { balanceService } from '../src/services/balanceService';

describe('Home Live Aggregations & Consistency Invariants', () => {
  beforeEach(async () => {
    // Seed initial dataset
    await SeedDataService.seedDevelopmentData();
  });

  test('homeTotalBalance strictly equals the sum of all individual group balances', async () => {
    const dashboard = await homeFeedService.getHomeDashboardData();
    const groups = await groupRepository.findAll();
    const user = await userRepository.getOrCreateDefaultUser();

    let sumGroupBalancesMinor = 0;
    for (const g of groups) {
      const balRes = await balanceService.getGroupBalances(g.id);
      expect(balRes.success).toBe(true);
      if (balRes.success) {
        sumGroupBalancesMinor += balRes.data.userBalances[user.id]?.netBalanceMinor || 0;
      }
    }

    expect(dashboard.totalNetBalanceMinor).toBe(sumGroupBalancesMinor);

    const topGroupsSum = dashboard.topGroups.reduce(
      (acc, item) => acc + item.netBalanceMinor,
      0
    );
    expect(dashboard.totalNetBalanceMinor).toBe(topGroupsSum);
  });

  test('homeTotalBalance immediately updates and matches sum after adding, editing, and deleting an expense', async () => {
    const user = await userRepository.getOrCreateDefaultUser();
    const groups = await groupRepository.findAll();
    const goaGroup = groups.find((g) => g.name === 'Goa 2026')!;
    const goaMembers = goaGroup.members || [];

    // 1. Add "test" expense ₹250 paid by You, split 3 ways between Ketan, Rohit, and Raj (or all)
    // Paid ₹250 (25000 minor). Split 3 ways: ~83.33 each. User lent +166.66 (16667 minor).
    const createRes = await expenseRepository.create({
      groupId: goaGroup.id,
      description: 'test',
      amountMinor: 25000,
      payerId: user.id,
      participantIds: goaMembers.slice(0, 3).map((m) => m.id),
      splitMethod: 'equal',
      createdBy: user.id,
    });
    expect(createRes.success).toBe(true);
    if (!createRes.success) throw new Error('Create expense failed');

    let dashboard = await homeFeedService.getHomeDashboardData();
    let calculatedSum = dashboard.topGroups.reduce((acc, item) => acc + item.netBalanceMinor, 0);
    expect(dashboard.totalNetBalanceMinor).toBe(calculatedSum);
    expect(dashboard.recentActivity[0]?.title).toBe('test');

    // 2. Edit "test" expense amount to ₹600
    const expenseId = createRes.data.id;
    const updateRes = await expenseRepository.update(expenseId, {
      groupId: goaGroup.id,
      description: 'test updated',
      amountMinor: 60000,
      payerId: user.id,
      participantIds: goaMembers.slice(0, 3).map((m) => m.id),
      splitMethod: 'equal',
      createdBy: user.id,
    });
    expect(updateRes.success).toBe(true);

    dashboard = await homeFeedService.getHomeDashboardData();
    calculatedSum = dashboard.topGroups.reduce((acc, item) => acc + item.netBalanceMinor, 0);
    expect(dashboard.totalNetBalanceMinor).toBe(calculatedSum);
    expect(dashboard.recentActivity[0]?.title).toBe('test updated');

    // 3. Delete "test" expense
    const deleteRes = await expenseRepository.delete(expenseId);
    expect(deleteRes).toBe(true);

    dashboard = await homeFeedService.getHomeDashboardData();
    calculatedSum = dashboard.topGroups.reduce((acc, item) => acc + item.netBalanceMinor, 0);
    expect(dashboard.totalNetBalanceMinor).toBe(calculatedSum);
  });
});
