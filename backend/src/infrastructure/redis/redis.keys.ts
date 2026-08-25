export class CacheKeys {
  private static readonly PREFIX = 'settle';

  /**
   * Group metadata (name, currency, type, isArchived, memberCount)
   * TTL: 5 minutes (invalidated on group update/delete)
   */
  public static groupMetadata(groupId: string): string {
    return `${this.PREFIX}:group:${groupId}:meta`;
  }

  /**
   * Group members list (id, userId, role, name, avatarUrl)
   * TTL: 5 minutes (invalidated on member add/remove)
   */
  public static groupMembers(groupId: string): string {
    return `${this.PREFIX}:group:${groupId}:members`;
  }

  /**
   * Public invite resolution preview (group name, member count, public member avatars)
   * TTL: 10 minutes (invalidated on group update or member change)
   */
  public static invitePreview(codeOrToken: string): string {
    return `${this.PREFIX}:invite:${codeOrToken}:preview`;
  }

  /**
   * User search autocomplete results
   * TTL: 60 seconds
   */
  public static userSearch(query: string): string {
    return `${this.PREFIX}:search:users:${query.toLowerCase().trim()}`;
  }

  /**
   * Public user profile
   * TTL: 10 minutes
   */
  public static userPublicProfile(userId: string): string {
    return `${this.PREFIX}:user:${userId}:public_profile`;
  }
}
