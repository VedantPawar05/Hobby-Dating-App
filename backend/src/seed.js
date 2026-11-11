import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/user.model.js';
import { Event } from './models/event.model.js';

async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await connectDatabase();

  console.log('[Seed] Checking existing records...');
  const existingOrganizer = await User.findOne({ email: 'organizer@ricoz.com' });

  let organizerId;
  if (!existingOrganizer) {
    const organizer = await User.create({
      fullName: 'Jordan Miles',
      email: 'organizer@ricoz.com',
      password: 'RunnerPass123',
      dateOfBirth: new Date('1994-04-15'),
      city: 'Seattle',
      gender: 'non-binary',
      bio: 'Marathon pacer, trail lover, and founder of Emerald City Run Club.',
      interests: ['Running', 'Trail Running', 'Hiking'],
      role: 'organizer',
      isActive: true,
    });
    organizerId = organizer._id;
    console.log('[Seed] Created organizer user: organizer@ricoz.com / RunnerPass123');
  } else {
    organizerId = existingOrganizer._id;
  }

  const existingMember = await User.findOne({ email: 'member@ricoz.com' });
  if (!existingMember) {
    await User.create({
      fullName: 'Alex Chen',
      email: 'member@ricoz.com',
      password: 'MemberPass123',
      dateOfBirth: new Date('1996-08-20'),
      city: 'Seattle',
      gender: 'male',
      bio: 'Weekend 5K runner, bouldering beginner, and padel enthusiast.',
      interests: ['Running', 'Badminton', 'Climbing', 'Padel'],
      role: 'user',
      isActive: true,
    });
    console.log('[Seed] Created member user: member@ricoz.com / MemberPass123');
  }

  const eventCount = await Event.countDocuments({ organizer: organizerId });
  if (eventCount === 0) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const sampleEvents = [
      {
        title: 'Emerald City Sunrise 5K & Coffee',
        description: 'Join us for an easy-paced 5K morning run around Green Lake, followed by social coffee and pastries at the local roastery. All paces welcome!',
        category: 'Running',
        activityType: 'Road Running',
        organizer: organizerId,
        location: {
          city: 'Seattle',
          address: 'Green Lake Community Center, Seattle, WA',
        },
        startDateTime: new Date(now + 1 * day + 3 * 3600000), // tomorrow morning
        endDateTime: new Date(now + 1 * day + 5 * 3600000),
        capacity: 25,
        bookedCount: 4,
        price: 0,
        status: 'published',
      },
      {
        title: 'Mount Si Summit Weekend Trail Hike',
        description: 'A moderate-to-challenging 8-mile roundtrip trail hike with panoramic views of Mount Rainier and the Snoqualmie Valley. Bring hiking shoes, hydration, and trail snacks.',
        category: 'Hiking',
        activityType: 'Mountain Hiking',
        organizer: organizerId,
        location: {
          city: 'Seattle',
          address: 'Mount Si Trailhead, North Bend, WA',
        },
        startDateTime: new Date(now + 2 * day + 2 * 3600000),
        endDateTime: new Date(now + 2 * day + 7 * 3600000),
        capacity: 15,
        bookedCount: 6,
        price: 0,
        status: 'published',
      },
      {
        title: 'Weekend Padel Doubles & Social Mixer',
        description: 'Friendly 2-hour padel doubles games for beginners and intermediates. Rackets provided if needed. Enjoy a drink and meet fellow racket sports fans afterwards!',
        category: 'Padel',
        activityType: 'Padel Tennis',
        organizer: organizerId,
        location: {
          city: 'Seattle',
          address: 'Ballard Padel Club, Seattle, WA',
        },
        startDateTime: new Date(now + 3 * day),
        endDateTime: new Date(now + 3 * day + 2 * 3600000),
        capacity: 12,
        bookedCount: 8,
        price: 15,
        status: 'published',
      },
      {
        title: 'Bouldering & Craft Brew Evening',
        description: 'Indoor climbing session followed by social mixer at the local brewery next door. Great way to build grip strength and meet active adventure partners.',
        category: 'Climbing',
        activityType: 'Bouldering',
        organizer: organizerId,
        location: {
          city: 'Seattle',
          address: 'Seattle Bouldering Project, Poplar St, Seattle, WA',
        },
        startDateTime: new Date(now + 4 * day),
        endDateTime: new Date(now + 4 * day + 3 * 3600000),
        capacity: 20,
        bookedCount: 5,
        price: 20,
        status: 'published',
      },
      {
        title: 'Thursday Social Badminton League',
        description: 'Fast-paced indoor badminton games across 4 courts. Mixed doubles and singles match play. Feather shuttlecocks provided.',
        category: 'Badminton',
        activityType: 'Indoor Badminton',
        organizer: organizerId,
        location: {
          city: 'Seattle',
          address: 'Bellevue Badminton Center, Bellevue, WA',
        },
        startDateTime: new Date(now + 5 * day),
        endDateTime: new Date(now + 5 * day + 2 * 3600000),
        capacity: 16,
        bookedCount: 11,
        price: 10,
        status: 'published',
      },
    ];

    await Event.insertMany(sampleEvents);
    console.log(`[Seed] Successfully inserted ${sampleEvents.length} published sample events.`);
  }

  await disconnectDatabase();
  console.log('[Seed] Database seeding completed successfully.');
}

seed().catch((err) => {
  console.error('[Seed] Seeding failed:', err);
  process.exit(1);
});

