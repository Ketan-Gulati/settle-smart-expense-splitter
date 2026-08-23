import { userRepository } from './userRepository';
import { groupRepository } from './groupRepository';
import { expenseRepository } from './expenseRepository';

export class SeedDataService {
  public static async seedDevelopmentData(): Promise<void> {
    // 1. Ensure user exists
    const currentUser = await userRepository.getOrCreateDefaultUser();

    // Check if groups already exist
    const existingGroups = await groupRepository.findAll();
    if (existingGroups.length > 0) {
      return; // Already seeded
    }

    // 2. Create Group 1: Goa 2026 (User is owed +₹4,250)
    const goaGroup = await groupRepository.create({
      name: 'Goa 2026',
      ownerId: currentUser.id,
      initialMemberNames: ['Ketan', 'Rohit', 'Raj'],
      currency: 'INR',
      type: 'trip',
    });

    const goaMembers = goaGroup.members || [];
    const ketan = goaMembers.find((m) => m.name === 'Ketan')?.id || currentUser.id;
    const raj = goaMembers.find((m) => m.name === 'Raj')?.id || currentUser.id;

    // Expense 1: Dinner at Jamie's (₹3,600 paid by You, split equally among 4 => You lent ₹2,700)
    await expenseRepository.create({
      groupId: goaGroup.id,
      description: "Dinner at Jamie's",
      amountMinor: 360000,
      payerId: currentUser.id,
      participantIds: goaMembers.map((m) => m.id),
      splitMethod: 'equal',
      createdBy: currentUser.id,
      date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    });

    // Expense 2: Airport Cab (₹900 paid by Ketan, split equally among 4 => You borrowed ₹225)
    await expenseRepository.create({
      groupId: goaGroup.id,
      description: 'Airport Cab',
      amountMinor: 90000,
      payerId: ketan,
      participantIds: goaMembers.map((m) => m.id),
      splitMethod: 'equal',
      createdBy: currentUser.id,
      date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });

    // Expense 3: Villa Booking (₹2,400 paid by You, split with Raj)
    await expenseRepository.create({
      groupId: goaGroup.id,
      description: 'Villa Booking',
      amountMinor: 240000,
      payerId: currentUser.id,
      participantIds: [currentUser.id, raj],
      splitMethod: 'equal',
      createdBy: currentUser.id,
      date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    });

    // 3. Create Group 2: Apartment Bills (User owes -₹830)
    const aptGroup = await groupRepository.create({
      name: 'Apartment Bills',
      ownerId: currentUser.id,
      initialMemberNames: ['Raj', 'Aman'],
      currency: 'INR',
      type: 'home',
    });

    const aptMembers = aptGroup.members || [];
    const aptRaj = aptMembers.find((m) => m.name === 'Raj')?.id || currentUser.id;

    // Expense 4: Internet Bill (₹1,140 paid by Raj, split 3 ways => You borrowed ₹380)
    await expenseRepository.create({
      groupId: aptGroup.id,
      description: 'Internet Bill',
      amountMinor: 114000,
      payerId: aptRaj,
      participantIds: aptMembers.map((m) => m.id),
      splitMethod: 'equal',
      createdBy: currentUser.id,
      date: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    });

    // Expense 5: Electricity Bill (₹1,350 paid by Raj, split 3 ways => You borrowed ₹450)
    await expenseRepository.create({
      groupId: aptGroup.id,
      description: 'Electricity Bill',
      amountMinor: 135000,
      payerId: aptRaj,
      participantIds: aptMembers.map((m) => m.id),
      splitMethod: 'equal',
      createdBy: currentUser.id,
      date: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    });

    // 4. Create Group 3: Weekend Dinner
    const dinnerGroup = await groupRepository.create({
      name: 'Weekend Dinner',
      ownerId: currentUser.id,
      initialMemberNames: ['Rohit', 'Sneha', 'Aman', 'Ketan', 'Pooja'],
      currency: 'INR',
      type: 'couple',
    });

    const dinnerMembers = dinnerGroup.members || [];
    const dinnerRohit = dinnerMembers.find((m) => m.name === 'Rohit')?.id || currentUser.id;

    // Expense 6: Dinner at Dishoom (₹2,700 paid by Rohit, split equally among 6 => You borrowed ₹450)
    await expenseRepository.create({
      groupId: dinnerGroup.id,
      description: 'Dinner at Dishoom',
      amountMinor: 270000,
      payerId: dinnerRohit,
      participantIds: dinnerMembers.map((m) => m.id),
      splitMethod: 'equal',
      createdBy: currentUser.id,
      date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    });
  }
}
