import { fileURLToPath } from 'url';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Event } from '../models/event.model.js';
import { USER_ROLES } from '../constants/user.constants.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';
import {
  seedAdminAccount,
  hasAdminEnvCredentials,
  getAdminSeedConfig,
} from '../services/admin-seed.service.js';

/**
 * Returns a Date offset by whole days at a specific local hour.
 * @param {number} daysFromNow
 * @param {number} hour
 * @returns {Date}
 */
function upcomingDate(daysFromNow, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Finds an existing user by email or creates a new one.
 * @param {Record<string, any>} userData
 */
async function upsertSeedUser(userData) {
  const existing = await User.findOne({ email: userData.email.toLowerCase() });
  if (existing) {
    return { user: existing, created: false };
  }

  const user = await User.create(userData);
  return { user, created: true };
}

/**
 * Inserts a sample event if no matching title + organizer already exists.
 * @param {Record<string, any>} eventData
 */
async function upsertSeedEvent(eventData) {
  const existing = await Event.findOne({
    title: eventData.title,
    organizer: eventData.organizer,
  });
  if (existing) {
    return { event: existing, created: false };
  }

  const event = await Event.create(eventData);
  return { event, created: true };
}

function buildSeedEvents(primaryOrganizerId, secondaryOrganizerId) {
  const catalog = [
    {
      title: '5K Sunrise Run & Post-Run Espresso',
      description:
        'Easy-paced community 5K loop around Marine Drive followed by coffee and conversation. All paces welcome—nobody runs alone.',
      category: 'Running',
      activityType: '5K Social Run',
      city: 'Mumbai',
      address: 'Marine Drive Promenade, Gate 3',
      days: 2,
      hour: 7,
      durationHours: 2,
      capacity: 30,
      price: 0,
      organizer: primaryOrganizerId,
    },
    {
      title: 'Saturday Morning Trail Hike & Picnic',
      description:
        'Moderate 8 km forest trail with scenic ridge views and a relaxed group breakfast at the summit.',
      category: 'Hiking',
      activityType: 'Trail Hike',
      city: 'Pune',
      address: 'Sinhagad Fort Base Trailhead',
      days: 4,
      hour: 6,
      durationHours: 4,
      capacity: 20,
      price: 299,
      organizer: secondaryOrganizerId,
    },
    {
      title: 'Evening Mixed Doubles Padel Mixer',
      description:
        'Rotate partners every 20 minutes in a friendly social padel session. Rackets and balls provided for newcomers.',
      category: 'Padel',
      activityType: 'Social Mixer',
      city: 'Bengaluru',
      address: 'Indiranagar Padel Courts, 12th Main',
      days: 3,
      hour: 19,
      durationHours: 2,
      capacity: 16,
      price: 499,
      organizer: primaryOrganizerId,
    },
    {
      title: 'Midweek Badminton Rally & Chai',
      description:
        'Casual doubles rotation across 3 wooden courts. Ideal for intermediate and beginner players looking to meet active folks.',
      category: 'Badminton',
      activityType: 'Doubles Session',
      city: 'Delhi',
      address: 'Siri Fort Sports Complex, Court B',
      days: 5,
      hour: 18,
      durationHours: 2,
      capacity: 18,
      price: 250,
      organizer: secondaryOrganizerId,
    },
    {
      title: 'Sunday Waterfront Cycling Peloton (25K)',
      description:
        'Steady-pace 25 km coastal ride with a mid-route hydration stop and bakery brunch at the finish.',
      category: 'Cycling',
      activityType: 'Group Ride',
      city: 'Mumbai',
      address: 'Bandra Bandstand Amphitheatre',
      days: 6,
      hour: 6,
      durationHours: 3,
      capacity: 24,
      price: 0,
      organizer: primaryOrganizerId,
    },
    {
      title: 'Indoor Bouldering & Belay Social Night',
      description:
        'Tackle beginner-friendly V0–V3 boulder problems together, swap beta, and unwind at the lounge afterward.',
      category: 'Climbing',
      activityType: 'Bouldering',
      city: 'Bengaluru',
      address: 'Equilibrium Climbing Station, Indiranagar',
      days: 7,
      hour: 19,
      durationHours: 2,
      capacity: 14,
      price: 550,
      organizer: secondaryOrganizerId,
    },
    {
      title: 'Handmade Pasta & Natural Wine Evening',
      description:
        'Pair up at kitchen stations to roll fresh tagliatelle from scratch and share a long-table dinner.',
      category: 'Cooking',
      activityType: 'Culinary Workshop',
      city: 'Mumbai',
      address: 'Studio Kitchen, Kala Ghoda',
      days: 8,
      hour: 19,
      durationHours: 3,
      capacity: 12,
      price: 799,
      organizer: secondaryOrganizerId,
    },
    {
      title: '7v7 Under-the-Lights Social Football',
      description:
        'Friendly turf pickup game with balanced teams and zero ego. Bring turf boots or running shoes.',
      category: 'Football',
      activityType: 'Pickup Match',
      city: 'Hyderabad',
      address: 'Jubilee Hills Turf Arena',
      days: 9,
      hour: 20,
      durationHours: 2,
      capacity: 14,
      price: 300,
      organizer: primaryOrganizerId,
    },
    {
      title: 'Weekend Box Cricket Knockout & Brunch',
      description:
        'Fast-paced 6-over social matches mixed with music, cold brew, and plenty of banter.',
      category: 'Cricket',
      activityType: 'Box Cricket',
      city: 'Pune',
      address: 'Koregaon Park Rooftop Turf',
      days: 10,
      hour: 9,
      durationHours: 3,
      capacity: 24,
      price: 350,
      organizer: primaryOrganizerId,
    },
    {
      title: 'Twilight Parkour & Urban Mobility Jam',
      description:
        'Beginner-friendly outdoor balance, vaulting, and mobility workshop awaiting admin moderation approval.',
      category: 'Other',
      activityType: 'Parkour Session',
      city: 'Mumbai',
      address: 'Carter Road Open Promenade',
      days: 12,
      hour: 17,
      durationHours: 2,
      capacity: 15,
      price: 200,
      status: EVENT_STATUSES.PENDING,
      organizer: secondaryOrganizerId,
    },
  ];

  return catalog.map((item) => {
    const startDateTime = upcomingDate(item.days, item.hour);
    const endDateTime = new Date(startDateTime.getTime() + item.durationHours * 3600000);

    return {
      title: item.title,
      description: item.description,
      category: item.category,
      activityType: item.activityType,
      coverImage: null,
      organizer: item.organizer,
      location: {
        city: item.city,
        address: item.address,
      },
      startDateTime,
      endDateTime,
      capacity: item.capacity,
      bookedCount: 0,
      price: item.price,
      status: item.status || EVENT_STATUSES.PUBLISHED,
    };
  });
}

async function runSeed() {
  try {
    await connectDatabase();

    const seedUsers = [
      {
        fullName: 'Aarav Mehta',
        email: 'organizer@ricoz.app',
        password: 'SeedUser123',
        dateOfBirth: new Date('1994-05-15'),
        gender: 'male',
        city: 'Mumbai',
        bio: 'Run club pacer and weekend padel host.',
        interests: ['running', 'padel', 'cycling'],
        role: USER_ROLES.ORGANIZER,
      },
      {
        fullName: 'Maya Nair',
        email: 'maya.host@ricoz.app',
        password: 'SeedUser123',
        dateOfBirth: new Date('1996-08-22'),
        gender: 'female',
        city: 'Bengaluru',
        bio: 'Trail hiker, boulderer, and home pasta enthusiast.',
        interests: ['hiking', 'climbing', 'badminton'],
        role: USER_ROLES.ORGANIZER,
      },
      {
        fullName: 'Rohan Kapoor',
        email: 'member@ricoz.app',
        password: 'SeedUser123',
        dateOfBirth: new Date('1997-02-10'),
        gender: 'male',
        city: 'Pune',
        bio: 'Exploring run clubs and weekend outdoor meetups.',
        interests: ['running', 'hiking', 'football'],
        role: USER_ROLES.USER,
      },
    ];

    const createdUsers = [];
    for (const userData of seedUsers) {
      const { user, created } = await upsertSeedUser(userData);
      createdUsers.push(user);
      console.log(`[Seed] User ${user.email} (${user.role}): ${created ? 'created' : 'already exists'}`);
    }

    if (hasAdminEnvCredentials()) {
      const adminResult = await seedAdminAccount(getAdminSeedConfig());
      console.log(
        `[Seed] Admin ${adminResult.user.email} (${adminResult.user.role}): ${
          adminResult.created ? 'created' : 'already exists'
        }`
      );
    } else {
      const existingAdmin = await User.exists({ role: USER_ROLES.ADMIN });
      if (existingAdmin) {
        console.log('[Seed] Existing admin user detected; skipping env-based admin creation.');
      } else {
        throw new Error(
          'No admin account exists and ADMIN_EMAIL / ADMIN_PASSWORD are not set in backend/.env. Set both environment variables and run `npm run seed` or `npm run seed:admin`.'
        );
      }
    }

    const [primaryOrganizer, secondaryOrganizer] = createdUsers;
    const eventsToSeed = buildSeedEvents(primaryOrganizer._id, secondaryOrganizer._id);

    let createdCount = 0;
    for (const eventData of eventsToSeed) {
      const { event, created } = await upsertSeedEvent(eventData);
      if (created) createdCount += 1;
      console.log(`[Seed] Event "${event.title}": ${created ? 'created' : 'already exists'}`);
    }

    console.log(`[Seed] Done. Inserted ${createdCount} new events.`);
  } catch (error) {
    console.error('[Seed] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectExecution =
  process.platform === 'win32'
    ? invokedFile.toLowerCase() === currentFile.toLowerCase()
    : invokedFile === currentFile;

if (isDirectExecution) {
  runSeed();
}

