# Ricoz Backend – Phase 3: Organizer, Events & Booking

Backend service for **Ricoz**, an Activity-First Run Club & Hobby Dating Application.

Phase 3 builds upon the Phase 1 Foundation and Phase 2 Identity systems, introducing **Organizer Event Management**, **Public Event Discovery with Filtering**, **Atomic Concurrency-Safe Event Bookings**, and **Organizer Attendee Management**.

---

## 1. Architecture & Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js               # MongoDB connection & lifecycle management
│   │   └── env.js                    # Zod-validated environment schema
│   ├── constants/
│   │   ├── booking.constants.js      # Booking statuses ('confirmed', 'cancelled')
│   │   ├── event.constants.js        # Event categories & statuses ('draft', 'published', 'cancelled', 'completed')
│   │   └── user.constants.js         # User roles ('user', 'organizer', 'admin'), genders, activities
│   ├── controllers/
│   │   ├── auth.controller.js        # Register, login, logout, getMe handlers
│   │   ├── booking.controller.js     # Event booking, cancellation, and history handlers
│   │   ├── event.controller.js       # Event CRUD, discovery, and attendee handlers
│   │   ├── health.controller.js      # Health check endpoint
│   │   └── user.controller.js        # Profile and admin role promotion handlers
│   ├── middlewares/
│   │   ├── auth.middleware.js        # JWT verification (Bearer header & HTTP-only cookies)
│   │   ├── error.middleware.js       # Centralized error handler
│   │   ├── not-found.middleware.js   # 404 handler for unmatched routes
│   │   ├── role.middleware.js        # Role-based access control (RBAC) middleware
│   │   └── validate.middleware.js    # Zod body, query, and ObjectId route validators
│   ├── models/
│   │   ├── booking.model.js          # Booking schema with unique compound index (user + event)
│   │   ├── event.model.js            # Event schema with compound indexing and schedule checks
│   │   └── user.model.js             # User schema with bcrypt hashing & safe serialization
│   ├── routes/
│   │   ├── index.js                  # Main API router aggregating health, auth, user, events, bookings
│   │   ├── auth.routes.js            # /api/auth routes
│   │   ├── booking.routes.js         # /api/bookings routes
│   │   ├── event.routes.js           # /api/events routes
│   │   ├── health.routes.js          # /api/health routes
│   │   └── user.routes.js            # /api/users routes (includes admin role promotion)
│   ├── services/
│   │   ├── auth.service.js           # Authentication & token generation logic
│   │   ├── booking.service.js        # Atomic reservation, rollback, and cancellation logic
│   │   ├── event.service.js          # Event CRUD, discovery filtering, and attendee logic
│   │   └── user.service.js           # User profile and role management logic
│   ├── utils/
│   │   ├── api-response.js           # Uniform JSON response envelope
│   │   └── token.js                  # JWT token signing, verification, and cookie options
│   ├── validators/
│   │   ├── auth.validator.js         # Registration & login Zod schemas
│   │   ├── booking.validator.js      # Booking query filter Zod schema
│   │   ├── event.validator.js        # Create, update, and query filter Zod schemas
│   │   └── user.validator.js         # Profile and role update Zod schemas
│   ├── app.js                        # Express application configuration & middleware pipeline
│   └── server.js                     # Server bootstrap, DB connectivity, & graceful shutdown
├── tests/
│   ├── app.test.js                   # Health, 404, invalid JSON, and Helmet headers tests
│   ├── auth.test.js                  # Registration, login, logout, and getMe tests
│   ├── booking.test.js               # Booking creation, duplicate rejection, and cancellation tests
│   ├── booking-concurrency.test.js   # Concurrent slot racing & atomic rollback tests
│   ├── database.test.js              # Database connection failure and URI masking tests
│   ├── env.test.js                   # Environment schema validation tests
│   ├── error.test.js                 # Centralized error handler tests
│   ├── event.test.js                 # Event creation, discovery, filtering, and attendee tests
│   ├── token.test.js                 # JWT verification and cookie options tests
│   ├── user.test.js                  # Profile management and RBAC access tests
│   └── user-model.test.js            # User model methods and bcrypt tests
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore patterns
├── package.json                      # Dependencies and scripts
└── README.md                         # Documentation & API specification
```

---

## 2. Event & Booking Lifecycle Constants

### Supported Event Categories
- `Running`, `Hiking`, `Badminton`, `Football`, `Cricket`, `Cycling`, `Padel`, `Climbing`, `Cooking`, `Other`

### Event Statuses
- `draft` – Private draft under preparation by the organizer.
- `published` – Publicly discoverable and open for bookings.
- `cancelled` – Cancelled by organizer; cannot be booked; booking history preserved.
- `completed` – Concluded event.

### Booking Statuses
- `confirmed` – Active, valid registration.
- `cancelled` – Registration cancelled by the user.

---

## 3. High-Concurrency Booking Engine

To prevent race conditions, overbooking, and incorrect capacities under simultaneous requests:

1. **Atomic Capacity Reservation**:
   Slots are reserved directly inside MongoDB using an atomic conditional update:
   ```javascript
   const reservedEvent = await Event.findOneAndUpdate(
     {
       _id: eventId,
       status: 'published',
       startDateTime: { $gt: new Date() },
       $expr: { $lt: ['$bookedCount', '$capacity'] }
     },
     { $inc: { bookedCount: 1 } },
     { new: true }
   );
   ```
   If two requests compete for the final remaining slot, exactly one matches the `$expr` condition; the second request returns `null` and receives `400 Bad Request: Event is fully booked`.

2. **Atomic Rollback Safeguard**:
   If booking record creation fails due to a network glitch or duplicate key conflict (`code: 11000`), the reserved slot is immediately rolled back:
   ```javascript
   await Event.findByIdAndUpdate(eventId, { $inc: { bookedCount: -1 } });
   ```

3. **Single-Execution Cancellation**:
   Cancellations atomically transition status from `'confirmed'` to `'cancelled'`, ensuring duplicate requests or repeated clicks decrement `bookedCount` **exactly once**:
   ```javascript
   const booking = await Booking.findOneAndUpdate(
     { _id: bookingId, user: userId, status: 'confirmed' },
     { $set: { status: 'cancelled', cancelledAt: new Date() } },
     { new: true }
   );
   if (booking) {
     await Event.findByIdAndUpdate(booking.event, { $inc: { bookedCount: -1 } });
   }
   ```

---

## 4. API Endpoints Specification

All API responses follow the standard JSON envelope:
- **Success**: `{ "success": true, "message": "...", "data": { ... } }`
- **Error**: `{ "success": false, "message": "...", "errors": [...] }`

### A. Organizer Event Management (`/api/events`)

#### 1. Create Event
- **`POST /api/events`**
- **Access**: Organizers & Admins only (`requireRoles('organizer', 'admin')`)
- **Request Body**:
```json
{
  "title": "Sunset 10K Trail Run",
  "description": "Scenic 10K trail run through forest paths followed by hydration and snacks.",
  "category": "Running",
  "activityType": "Trail Running",
  "location": {
    "city": "Seattle",
    "address": "Discovery Park Trailhead, Seattle, WA",
    "latitude": 47.657,
    "longitude": -122.405
  },
  "startDateTime": "2026-12-01T17:00:00.000Z",
  "endDateTime": "2026-12-01T19:30:00.000Z",
  "capacity": 25,
  "price": 0,
  "status": "published"
}
```
- **Response** (`201 Created`): Returns created event with `bookedCount: 0` and organizer attached.

#### 2. Get Organizer Events
- **`GET /api/events/organizer/my-events?page=1&limit=10&status=published`**
- **Access**: Organizers & Admins only
- **Response** (`200 OK`): Paginated list of events created by the authenticated organizer.

#### 3. Update Event
- **`PATCH /api/events/:eventId`**
- **Access**: Event Owner or Admin only
- **Permitted Fields**: `title`, `description`, `category`, `activityType`, `coverImage`, `location`, `startDateTime`, `endDateTime`, `capacity`, `price`, `status`.
- **Safeguards**: Cannot reduce capacity below current `bookedCount`; cannot modify past or cancelled events.

#### 4. Delete Event
- **`DELETE /api/events/:eventId`**
- **Access**: Event Owner or Admin only
- **Safeguards**: Rejects deletion if active bookings exist (`bookedCount > 0`). Organizers are instructed to cancel the event instead to preserve attendee records.

#### 5. Get Event Attendees
- **`GET /api/events/:eventId/attendees?page=1&limit=20`**
- **Access**: Event Owner or Admin only
- **Response** (`200 OK`): Paginated list of confirmed attendees with safe user details (`fullName`, `email`, `city`, `gender`).

---

### B. Public Event Discovery (`/api/events`)

#### 1. Discover Events
- **`GET /api/events`**
- **Access**: Authenticated users
- **Query Parameters**:
  - `search` (e.g., `?search=trail`) – Case-insensitive title search
  - `category` (e.g., `?category=Running`) – Category filter
  - `city` (e.g., `?city=Seattle`) – City filter
  - `activityType` (e.g., `?activityType=Trail`) – Activity type filter
  - `startDate` / `endDate` – ISO date range filter
  - `sortBy` (`startDateTime`, `createdAt`, `price`) – Sort field (default: `startDateTime`)
  - `sortOrder` (`asc`, `desc`) – Sort direction (default: `asc`)
  - `page` & `limit` – Pagination parameters
- **Rules**: Excludes cancelled and past events. Only returns upcoming published events.

#### 2. Get Event Details
- **`GET /api/events/:eventId`**
- **Access**: Authenticated users
- **Response** (`200 OK`): Event details with populated organizer info.

---

### C. Event Bookings (`/api/bookings`)

#### 1. Book Event
- **`POST /api/bookings/:eventId`**
- **Access**: Authenticated users
- **Rules**:
  - Event must be published, in the future, and have capacity.
  - Users cannot book their own events.
  - Duplicate bookings are rejected with `409 Conflict`.
- **Response** (`201 Created`): Confirmed booking details.

#### 2. Cancel Booking
- **`DELETE /api/bookings/:bookingId`**
- **Access**: Authenticated users (booking owner only)
- **Rules**: Rejects repeated cancellations; decrements `bookedCount` exactly once.
- **Response** (`200 OK`): Cancelled booking details.

#### 3. View Booking History
- **`GET /api/bookings/my-bookings?status=confirmed&page=1&limit=10`**
- **Access**: Authenticated users
- **Response** (`200 OK`): Paginated list of user's personal bookings with populated event details.

---

### D. Admin Role Management (`/api/users`)

#### Promote User Role
- **`PATCH /api/users/:userId/role`**
- **Access**: Admins only (`requireRoles('admin')`)
- **Request Body**: `{ "role": "organizer" }`
- **Response** (`200 OK`): Updated user object.

---

## 5. Development & Testing Commands

Execute commands from `backend/`:

```bash
cd backend

# Start development server with Nodemon hot-reload
npm run dev

# Start production server
npm start

# Run automated Vitest test suite
npm run test

# Run tests in interactive watch mode
npm run test:watch
```

---

## 6. Phase Boundary Notice

This release completes **Phase 3 (Organizer, Events & Booking)**. The upcoming phases will build on this foundation:
- **Phase 4**: QR Code Attendance, Social Post-Event Mixer & Mutual Matching
- **Phase 5**: Payment Gateway, Push Notifications & Production Deployment
