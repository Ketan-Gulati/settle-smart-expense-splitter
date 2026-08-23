import { groupRepository } from '../src/repositories/groupRepository';
import { userRepository } from '../src/repositories/userRepository';
import { databaseService } from '../src/database/db';

describe('Group Membership Integrity Regression Tests', () => {
  beforeAll(async () => {
    await databaseService.initialize();
  });

  it('prevents inserting duplicate members when owner is re-passed or duplicate names are given', async () => {
    const defaultUser = await userRepository.getOrCreateDefaultUser();

    // Create group with owner name also in initialMemberNames + repeated member names
    const testGroup = await groupRepository.create({
      name: 'Goa Integrity Test',
      ownerId: defaultUser.id,
      initialMemberNames: ['Alex', 'Ketan', 'Ketan', 'Rohit'],
      currency: 'INR',
    });

    const members = testGroup.members || [];
    const memberIds = members.map((m) => m.id);
    const uniqueIds = new Set(memberIds);

    // Verify all member IDs are strictly unique
    expect(memberIds.length).toBe(uniqueIds.size);

    // Count how many 'Ketan' members exist
    const ketanMembers = members.filter((m) => m.name === 'Ketan');
    expect(ketanMembers.length).toBe(1);

    // Verify owner 'Alex' is present exactly once
    const alexMembers = members.filter((m) => m.id === defaultUser.id);
    expect(alexMembers.length).toBe(1);
  });
});
