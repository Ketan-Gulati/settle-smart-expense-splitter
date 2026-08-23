import { EntityId } from '../domain/common/types';
import { databaseService } from '../database/db';

export interface UserEntity {
  id: EntityId;
  name: string;
  email?: string;
  avatar?: string;
  defaultCurrency: string;
  createdAt: string;
}

export interface CreateUserInput {
  id?: EntityId;
  name: string;
  email?: string;
  avatar?: string;
  defaultCurrency?: string;
}

export class UserRepository {
  public async getOrCreateDefaultUser(): Promise<UserEntity> {
    const db = await databaseService.getDb();
    const existing = await db.getFirstAsync<any>('SELECT * FROM users LIMIT 1;');
    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        email: existing.email || undefined,
        avatar: existing.avatar || undefined,
        defaultCurrency: existing.default_currency,
        createdAt: existing.created_at,
      };
    }

    const defaultId = 'user_default';
    const name = 'Ketan';
    const currency = 'INR';

    await db.runAsync('INSERT INTO users (id, name, default_currency) VALUES (?, ?, ?);', [
      defaultId,
      name,
      currency,
    ]);

    return {
      id: defaultId,
      name,
      defaultCurrency: currency,
      createdAt: new Date().toISOString(),
    };
  }

  public async findById(id: EntityId): Promise<UserEntity | null> {
    const db = await databaseService.getDb();
    const row = await db.getFirstAsync<any>('SELECT * FROM users WHERE id = ?;', [id]);
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      avatar: row.avatar || undefined,
      defaultCurrency: row.default_currency,
      createdAt: row.created_at,
    };
  }

  public async create(input: CreateUserInput): Promise<UserEntity> {
    const db = await databaseService.getDb();
    const id = input.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currency = input.defaultCurrency || 'INR';

    await db.runAsync(
      'INSERT INTO users (id, name, email, avatar, default_currency) VALUES (?, ?, ?, ?, ?);',
      [id, input.name, input.email || null, input.avatar || null, currency]
    );

    return {
      id,
      name: input.name,
      email: input.email,
      avatar: input.avatar,
      defaultCurrency: currency,
      createdAt: new Date().toISOString(),
    };
  }

  public async findAll(): Promise<UserEntity[]> {
    const db = await databaseService.getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM users ORDER BY name ASC;');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email || undefined,
      avatar: r.avatar || undefined,
      defaultCurrency: r.default_currency,
      createdAt: r.created_at,
    }));
  }
}

export const userRepository = new UserRepository();
