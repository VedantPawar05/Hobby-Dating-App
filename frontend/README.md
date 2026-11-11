# Ricoz Frontend – Phase 1: Foundation, Authentication & Event Discovery

The frontend application for **Ricoz**, an Activity-First Run Club & Hobby Platform built with **Next.js (App Router)**, **React**, **Tailwind CSS**, and **Axios**.

---

## 1. Architecture & Folder Structure

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.js         # Member Login page with redirect support
│   │   │   └── register/page.js      # Registration page (client validation, age 18+)
│   │   ├── (main)/
│   │   │   ├── layout.js             # Main page container layout
│   │   │   ├── dashboard/page.js     # User hub displaying confirmed & cancelled bookings
│   │   │   ├── events/
│   │   │   │   ├── page.js           # Event discovery with multi-filter & pagination
│   │   │   │   └── [eventId]/page.js # Event details & real-time booking action
│   │   │   └── profile/page.js       # User profile details & editing form
│   │   ├── globals.css               # Tailwind CSS base and utility styles
│   │   ├── layout.js                 # Root App Router layout wrapping AuthProvider
│   │   └── page.js                   # Landing hero with featured activities
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.js     # Route guard redirecting unauthenticated users
│   │   ├── common/
│   │   │   ├── Button.js             # Button component with variants & loading spinners
│   │   │   ├── Card.js               # Card, CardHeader, CardBody, and CardFooter
│   │   │   ├── EmptyState.js         # Empty state display with actions
│   │   │   ├── ErrorState.js         # Error alert with retry handler
│   │   │   ├── Input.js              # Accessible form input with error & label support
│   │   │   ├── LoadingState.js       # Loading skeletons and spinners
│   │   │   └── Modal.js              # Accessible dialog modal
│   │   ├── events/
│   │   │   ├── EventCard.js          # Activity card with date, city, price, & capacity
│   │   │   └── EventFilters.js       # Search, category pills, city, and sort controls
│   │   ├── layout/
│   │   │   ├── Footer.js             # Global application footer
│   │   │   └── Navbar.js             # Sticky header with responsive mobile drawer
│   │   └── profile/
│   │       └── ProfileForm.js        # Profile edit form with validation & feedback
│   ├── constants/
│   │   └── categories.js             # Category lists, sort options, and gender options
│   ├── context/
│   │   └── AuthContext.js            # React Context API for user auth state & persistence
│   ├── services/
│   │   ├── api.js                    # Centralized Axios instance with interceptors
│   │   ├── auth.service.js           # Auth API service (register, login, logout, me)
│   │   ├── event.service.js          # Events & bookings API service
│   │   └── user.service.js           # User profile API service
│   └── utils/
│       └── formatters.js             # Date, time, currency, and capacity helpers
├── .env.example                      # Environment variables template
├── .env.local                        # Local environment configuration
├── .gitignore                        # Git ignore rules
├── next.config.js                    # Next.js configuration
├── package.json                      # Dependencies & npm scripts
├── postcss.config.js                 # PostCSS configuration
├── tailwind.config.js                # Custom Tailwind color palette & themes
└── README.md                         # Documentation
```

---

## 2. Environment Variables

Configure `frontend/.env.local` (or copy from `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for backend Express API endpoints | `http://localhost:5000/api` |

---

## 3. Key Features Implemented

### A. Authentication & Session Management
- **Registration (`/register`)**: Full name, email, password (min 8 chars, 1 uppercase, 1 lowercase, 1 number), date of birth (enforced 18+ requirement), city, and gender.
- **Login (`/login`)**: Email & password authentication with redirect query handling (`?redirect=/events/...`).
- **Session Persistence**: Dual-layer authentication configured with `withCredentials: true` (HTTP-only cookies) and `localStorage` Bearer tokens.
- **Protected Routes (`ProtectedRoute.js`)**: Seamless redirect of unauthenticated visitors with destination preservation.

### B. Event Discovery (`/events`)
- Live event search by title.
- Category pill selector matching backend categories (`Running`, `Hiking`, `Badminton`, `Football`, `Cycling`, `Padel`, `Climbing`, `Cooking`, `Other`).
- City filtering and activity type search.
- Sort dropdown by upcoming date, recently created, or price.
- Paginated display with total count and page indicators.
- Skeleton loading and empty state fallbacks.

### C. Event Details & Booking Action (`/events/[eventId]`)
- Comprehensive activity view: cover image/dynamic category gradients, full description, schedule, location, capacity, and verified organizer profile.
- Real-time booking button directly calling `POST /api/bookings/:eventId`.
- Instant booking status reflection (`Spot Confirmed` vs `Book My Spot`).
- Cancel booking button calling `DELETE /api/bookings/:bookingId`.
- Capacity enforcement (disables when sold out or activity has started).

### D. User Profile & Hub
- **Profile (`/profile`)**: Displays user avatar, verified email, city, bio, and hobby tags. Allows updating permitted profile fields with instant client feedback.
- **My Hub (`/dashboard`)**: Displays member's confirmed and cancelled bookings with direct links to event details and cancellation actions.

---

## 4. Available Scripts

Run from `frontend/`:

```bash
cd frontend

# Start Next.js development server on port 3000
npm run dev

# Create optimized production build
npm run build

# Start production server
npm start
```
