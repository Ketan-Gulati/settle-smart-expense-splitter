import { Platform } from 'react-native';
import { migrations } from './migrations';

const DB_NAME = 'settle.db';

export interface IDatabase {
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(cb: () => Promise<void>): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  closeAsync?(): Promise<void>;
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: IDatabase | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async getDb(): Promise<IDatabase> {
    if (this.db) return this.db;

    if (
      Platform.OS === 'web' ||
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')
    ) {
      this.db = this.createWebInMemoryDb();
      return this.db;
    }

    try {
      // Lazy dynamic import for native platforms to avoid bundler loading WebAssembly on web
      const SQLite = await import('expo-sqlite');
      const nativeDb = await SQLite.openDatabaseAsync(DB_NAME);
      this.db = nativeDb as unknown as IDatabase;
      return this.db;
    } catch {
      this.db = this.createWebInMemoryDb();
      return this.db;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (Platform.OS === 'web') {
      this.db = this.createWebInMemoryDb();
      this.initialized = true;
      return;
    }

    try {
      const db = await this.getDb();

      // Enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // Create migrations table if not exists
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Check applied migrations
      const applied = await db.getAllAsync<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version ASC;'
      );
      const appliedVersions = new Set(applied.map((m) => m.version));

      for (const migration of migrations) {
        if (!appliedVersions.has(migration.version)) {
          await db.withTransactionAsync(async () => {
            await db.execAsync(migration.up);
            await db.runAsync('INSERT INTO schema_migrations (version, name) VALUES (?, ?);', [
              migration.version,
              migration.name,
            ]);
          });
        }
      }

      this.initialized = true;
    } catch (e) {
      console.warn('Native SQLite init fallback:', e);
      this.initialized = true;
    }
  }

  public async close(): Promise<void> {
    if (this.db && Platform.OS !== 'web' && this.db.closeAsync) {
      await this.db.closeAsync();
    }
    this.db = null;
    this.initialized = false;
  }

  private createWebInMemoryDb(): IDatabase {
    const memoryStore: {
      users: any[];
      groups: any[];
      group_members: any[];
      expenses: any[];
      expense_payers: any[];
      expense_splits: any[];
    } = {
      users: [],
      groups: [],
      group_members: [],
      expenses: [],
      expense_payers: [],
      expense_splits: [],
    };

    return {
      execAsync: async () => {},
      withTransactionAsync: async (cb: () => Promise<void>) => {
        await cb();
      },
      runAsync: async (sql: string, params: any[] = []) => {
        const lower = sql.toLowerCase().trim();
        if (lower.startsWith('insert into users')) {
          memoryStore.users.push({
            id: params[0],
            name: params[1],
            email: params[2] ?? null,
            avatar: params[3] ?? null,
            default_currency: params[4] ?? 'INR',
            created_at: new Date().toISOString(),
          });
        } else if (lower.startsWith('insert into groups')) {
          memoryStore.groups.push({
            id: params[0],
            name: params[1],
            type: params[2],
            currency: params[3],
            owner_id: params[4],
            created_at: new Date().toISOString(),
            archived_at: null,
          });
        } else if (lower.startsWith('insert into group_members')) {
          memoryStore.group_members.push({
            id: params[0],
            group_id: params[1],
            user_id: params[2],
            role: params[3],
            joined_at: new Date().toISOString(),
          });
        } else if (lower.startsWith('insert into expenses')) {
          memoryStore.expenses.push({
            id: params[0],
            group_id: params[1],
            description: params[2],
            amount_minor: params[3],
            currency: params[4],
            category_id: params[5] ?? null,
            date: params[6],
            notes: params[7] ?? null,
            created_by: params[8],
            created_at: new Date().toISOString(),
          });
        } else if (lower.startsWith('insert into expense_payers')) {
          memoryStore.expense_payers.push({
            expense_id: params[0],
            user_id: params[1],
            amount_minor: params[2],
          });
        } else if (lower.startsWith('insert into expense_splits')) {
          memoryStore.expense_splits.push({
            expense_id: params[0],
            user_id: params[1],
            amount_minor: params[2],
            split_method: params[3],
          });
        } else if (lower.startsWith('update expenses set')) {
          const expIdx = memoryStore.expenses.findIndex((e) => e.id === params[7]);
          if (expIdx !== -1) {
            memoryStore.expenses[expIdx] = {
              ...memoryStore.expenses[expIdx],
              group_id: params[0],
              description: params[1],
              amount_minor: params[2],
              currency: params[3],
              category_id: params[4],
              date: params[5],
              notes: params[6],
            };
          }
        } else if (lower.startsWith('delete from expense_payers where expense_id =')) {
          memoryStore.expense_payers = memoryStore.expense_payers.filter(
            (p) => p.expense_id !== params[0]
          );
        } else if (lower.startsWith('delete from expense_splits where expense_id =')) {
          memoryStore.expense_splits = memoryStore.expense_splits.filter(
            (s) => s.expense_id !== params[0]
          );
        } else if (lower.startsWith('delete from expenses where id =')) {
          memoryStore.expenses = memoryStore.expenses.filter((e) => e.id !== params[0]);
        }
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async <T>(sql: string, params: any[] = []): Promise<T | null> => {
        const lower = sql.toLowerCase().trim();
        if (lower.includes('from users where id =')) {
          const user = memoryStore.users.find((u) => u.id === params[0]);
          return (user as unknown as T) || null;
        }
        if (lower.includes('from users where name =')) {
          const nameParam = params[0]?.toLowerCase();
          const user = memoryStore.users.find((u) => u.name?.toLowerCase() === nameParam);
          return (user as unknown as T) || null;
        }
        if (lower.includes('from users limit 1') || lower.includes('from users;')) {
          return (memoryStore.users[0] as unknown as T) || null;
        }
        if (lower.includes('from groups where id =')) {
          const group = memoryStore.groups.find((g) => g.id === params[0]);
          return (group as unknown as T) || null;
        }
        if (lower.includes('from expenses where id =')) {
          const exp = memoryStore.expenses.find((e) => e.id === params[0]);
          return (exp as unknown as T) || null;
        }
        if (lower.includes('from expense_payers where expense_id =')) {
          const p = memoryStore.expense_payers.find((x) => x.expense_id === params[0]);
          return (p as unknown as T) || null;
        }
        if (
          lower.includes('count(id) as count') &&
          lower.includes('from expenses where group_id =')
        ) {
          const matching = memoryStore.expenses.filter((e) => e.group_id === params[0]);
          const total = matching.reduce((acc, e) => acc + (e.amount_minor || 0), 0);
          return { count: matching.length, total } as unknown as T;
        }
        return null;
      },
      getAllAsync: async <T>(sql: string, params: any[] = []): Promise<T[]> => {
        const lower = sql.toLowerCase().trim();
        if (lower.includes('from groups')) {
          return memoryStore.groups.map((g) => {
            const exp = memoryStore.expenses.filter((e) => e.group_id === g.id);
            const total = exp.reduce((acc, e) => acc + (e.amount_minor || 0), 0);
            return {
              ...g,
              expense_count: exp.length,
              total_spent: total,
            };
          }) as unknown as T[];
        }
        if (lower.includes('from users') && lower.includes('group_members')) {
          const memberUserIds = memoryStore.group_members
            .filter((gm) => gm.group_id === params[0])
            .map((gm) => gm.user_id);
          return memoryStore.users.filter((u) => memberUserIds.includes(u.id)) as unknown as T[];
        }
        if (lower.includes('from expenses where group_id =')) {
          return memoryStore.expenses
            .filter((e) => e.group_id === params[0])
            .slice()
            .sort((a, b) => {
              const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
              if (dateDiff !== 0) return dateDiff;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }) as unknown as T[];
        }
        if (lower.includes('from expense_splits where expense_id =')) {
          return memoryStore.expense_splits.filter(
            (s) => s.expense_id === params[0]
          ) as unknown as T[];
        }
        if (lower.includes('from users')) {
          return memoryStore.users as unknown as T[];
        }
        return [];
      },
    };
  }
}

export const databaseService = DatabaseService.getInstance();
