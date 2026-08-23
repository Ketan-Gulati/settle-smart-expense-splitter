import { EntityId } from '../domain/common/types';
import { databaseService } from '../database/db';
import { UserEntity } from './userRepository';

export interface GroupEntity {
  id: EntityId;
  name: string;
  type: string;
  currency: string;
  ownerId: EntityId;
  createdAt: string;
  archivedAt?: string;
  members?: UserEntity[];
  expenseCount?: number;
  totalSpentMinor?: number;
}

export interface CreateGroupInput {
  name: string;
  type?: string;
  currency?: string;
  ownerId: EntityId;
  initialMemberNames: string[];
}

export class GroupRepository {
  public async create(input: CreateGroupInput): Promise<GroupEntity> {
    const db = await databaseService.getDb();
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const groupType = input.type || 'friends';
    const currency = input.currency || 'INR';

    await db.withTransactionAsync(async () => {
      // 1. Insert group
      await db.runAsync(
        'INSERT INTO groups (id, name, type, currency, owner_id) VALUES (?, ?, ?, ?, ?);',
        [groupId, input.name, groupType, currency, input.ownerId]
      );

      // 2. Add owner as member (only once)
      const ownerMemberId = `gm_${Date.now()}_owner`;
      await db.runAsync(
        'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?);',
        [ownerMemberId, groupId, input.ownerId, 'owner']
      );

      // Track inserted userIds to prevent duplicate membership
      const addedUserIds = new Set<string>([input.ownerId]);

      // 3. Create & add initial members (ignoring owner if re-passed by name or duplicate entries)
      for (const rawName of input.initialMemberNames) {
        const memberName = rawName.trim();
        if (!memberName) continue;

        // Find if user already exists with this exact name, or create new
        const existingUser = await db.getFirstAsync<any>(
          'SELECT id FROM users WHERE name = ? COLLATE NOCASE;',
          [memberName]
        );

        let memberUserId: string;
        if (existingUser) {
          memberUserId = existingUser.id;
        } else {
          memberUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await db.runAsync('INSERT INTO users (id, name, default_currency) VALUES (?, ?, ?);', [
            memberUserId,
            memberName,
            currency,
          ]);
        }

        if (addedUserIds.has(memberUserId)) {
          continue; // Prevent duplicate membership
        }

        addedUserIds.add(memberUserId);
        const memberId = `gm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?);',
          [memberId, groupId, memberUserId, 'member']
        );
      }
    });

    const fullGroup = await this.findById(groupId);
    if (!fullGroup) throw new Error('Failed to retrieve created group');
    return fullGroup;
  }

  public async findById(id: EntityId): Promise<GroupEntity | null> {
    const db = await databaseService.getDb();
    const groupRow = await db.getFirstAsync<any>('SELECT * FROM groups WHERE id = ?;', [id]);
    if (!groupRow) return null;

    // Load members and guarantee uniqueness by user id
    const memberRows = await db.getAllAsync<any>(
      `SELECT u.id, u.name, u.email, u.avatar, u.default_currency, u.created_at
       FROM users u
       INNER JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC;`,
      [id]
    );

    const seenIds = new Set<string>();
    const uniqueMembers: UserEntity[] = [];
    for (const u of memberRows) {
      if (!seenIds.has(u.id)) {
        seenIds.add(u.id);
        uniqueMembers.push({
          id: u.id,
          name: u.name,
          email: u.email || undefined,
          avatar: u.avatar || undefined,
          defaultCurrency: u.default_currency,
          createdAt: u.created_at,
        });
      }
    }

    // Calculate total expense summary
    const expenseSummary = await db.getFirstAsync<any>(
      `SELECT COUNT(id) as count, COALESCE(SUM(amount_minor), 0) as total
       FROM expenses WHERE group_id = ?;`,
      [id]
    );

    return {
      id: groupRow.id,
      name: groupRow.name,
      type: groupRow.type,
      currency: groupRow.currency,
      ownerId: groupRow.owner_id,
      createdAt: groupRow.created_at,
      archivedAt: groupRow.archived_at || undefined,
      members: uniqueMembers,
      expenseCount: expenseSummary?.count || 0,
      totalSpentMinor: expenseSummary?.total || 0,
    };
  }

  public async findAll(): Promise<GroupEntity[]> {
    const db = await databaseService.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT g.*, 
        (SELECT COUNT(id) FROM expenses WHERE group_id = g.id) as expense_count,
        (SELECT COALESCE(SUM(amount_minor), 0) FROM expenses WHERE group_id = g.id) as total_spent
       FROM groups g 
       WHERE g.archived_at IS NULL
       ORDER BY g.created_at DESC;`
    );

    const groups: GroupEntity[] = [];
    for (const r of rows) {
      const memberRows = await db.getAllAsync<any>(
        `SELECT u.id, u.name, u.email, u.avatar, u.default_currency, u.created_at
         FROM users u
         INNER JOIN group_members gm ON gm.user_id = u.id
         WHERE gm.group_id = ?;`,
        [r.id]
      );

      groups.push({
        id: r.id,
        name: r.name,
        type: r.type,
        currency: r.currency,
        ownerId: r.owner_id,
        createdAt: r.created_at,
        archivedAt: r.archived_at || undefined,
        members: memberRows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email || undefined,
          avatar: u.avatar || undefined,
          defaultCurrency: u.default_currency,
          createdAt: u.created_at,
        })),
        expenseCount: r.expense_count || 0,
        totalSpentMinor: r.total_spent || 0,
      });
    }

    return groups;
  }

  public async addMember(groupId: EntityId, memberName: string): Promise<UserEntity> {
    const db = await databaseService.getDb();
    const group = await this.findById(groupId);
    if (!group) throw new Error('Group not found');

    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const memberId = `gm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO users (id, name, default_currency) VALUES (?, ?, ?);', [
        newUserId,
        memberName.trim(),
        group.currency,
      ]);
      await db.runAsync(
        'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?);',
        [memberId, groupId, newUserId, 'member']
      );
    });

    return {
      id: newUserId,
      name: memberName.trim(),
      defaultCurrency: group.currency,
      createdAt: new Date().toISOString(),
    };
  }
}

export const groupRepository = new GroupRepository();
