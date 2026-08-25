import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../errors/AppError';
import { UpdateUserInput } from './user.schemas';

export interface PublicUserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface DetailedUserProfile extends PublicUserProfile {
  email: string;
  createdAt: string;
}

export class UserService {
  public static async getProfile(userId: string): Promise<DetailedUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found', 'NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  public static async updateProfile(userId: string, input: UpdateUserInput): Promise<DetailedUserProfile> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  public static async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found', 'NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }

  public static async searchUsers(query: string, currentUserId: string): Promise<PublicUserProfile[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: currentUserId },
        OR: [
          { name: { contains: normalizedQuery, mode: 'insensitive' } },
          { email: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      take: 10,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
    }));
  }
}
