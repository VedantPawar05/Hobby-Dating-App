# Production Deployment & Database Backup Guide

This document outlines deployment configurations, operational procedures, and backup/restoration runbooks for the **Hobby Dating** platform.

---

## 1. Environment & Secrets Management

The platform utilizes separated deployments for the Next.js frontend and the Node.js/Express backend.

### Backend Production Environment Variables (`backend/.env`)

| Variable | Description | Security Requirements |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | Set to `production`. Activates strict validation, structured logging, and masks internal error details. |
| `PORT` | Listening HTTP port | Standard container port (e.g. `5000` or assigned by host). |
| `MONGODB_URI` | Connection URI | Production MongoDB connection string (e.g. MongoDB Atlas replica set with TLS/SSL enabled). Never use unauthenticated local URIs. |
| `CLIENT_URL` | Allowed frontend origins | Exact production domain(s) (e.g. `https://hobbydating.com,https://app.hobbydating.com`). Never set to `*` in production. |
| `JWT_SECRET` | Secret key for signing auth tokens | Must be a cryptographically random string (min 32 characters). Boot will fail fast in production if set to the dev default. |
| `JWT_EXPIRES_IN` | Access token lifespan | Default `15m` to limit replay attack windows. |
| `COOKIE_SECRET` | Secret key for signing cookies | High-entropy string (min 32 characters). Boot will fail fast in production if set to default. |
| `ADMIN_EMAIL` | Initial administrator email | Set during initial deployment seed. |
| `ADMIN_PASSWORD` | Initial administrator password | Temporary bootstrap password. Must be rotated immediately after seeding. |

### Frontend Production Environment Variables (`frontend/.env.production`)

| Variable | Description | Security Requirements |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public backend API URL | Full HTTPS endpoint (e.g. `https://api.hobbydating.com/api`). |

> [!IMPORTANT]
> Never commit `.env` or `.env.production` files to version control. Set environment variables directly in cloud platform dashboards (Render, Railway, Vercel, AWS Secrets Manager, Kubernetes Secrets).

---

## 2. Database Backup & Disaster Recovery Runbook

### A. Managed Backups (Recommended: MongoDB Atlas)
For production deployments on MongoDB Atlas:
1. Enable **Continuous Cloud Backups (Point-in-Time Recovery - PITR)** with a minimum 7-day retention window.
2. Schedule daily snapshots with regional replication.
3. Configure automated alert triggers for cluster storage utilization exceeding 80% and connection spikes.

### B. Self-Hosted / Manual Snapshot Backup Procedure
To execute an on-demand encrypted backup archive:

```bash
# Set timestamp variable
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/mongodb"
mkdir -p "$BACKUP_DIR"

# Execute compressed backup using mongodump
mongodump \
  --uri="$MONGODB_URI" \
  --gzip \
  --archive="$BACKUP_DIR/hobbydating_backup_${TIMESTAMP}.archive.gz"

# Verify archive existence and non-zero size
ls -lh "$BACKUP_DIR/hobbydating_backup_${TIMESTAMP}.archive.gz"
```

### C. Restoration Runbook & Disaster Recovery Drill

> [!CAUTION]
> Database restoration can permanently overwrite or erase live data. Always double-check that `$TARGET_MONGODB_URI` points to the intended target environment, and always capture an on-demand pre-restore snapshot of the current state before executing any restoration.

#### 1. Dry Run Verification
Inspect and validate archive integrity without modifying any database state:
```bash
mongorestore \
  --uri="$TARGET_MONGODB_URI" \
  --gzip \
  --archive="/var/backups/mongodb/hobbydating_backup_TIMESTAMP.archive.gz" \
  --dryRun
```

#### 2. Restoration Execution Modes

##### Non-Destructive Restore (Default)
Inserts documents from the archive. If a document already exists with the same `_id`, `mongorestore` reports a duplicate key error and leaves existing records untouched:
```bash
mongorestore \
  --uri="$TARGET_MONGODB_URI" \
  --gzip \
  --archive="/var/backups/mongodb/hobbydating_backup_TIMESTAMP.archive.gz" \
  --nsInclude="*.*"
```

##### Clean Point-in-Time Recovery with `--drop`
The `--drop` flag causes `mongorestore` to **drop each existing collection from the target database before restoring it from the backup**:
```bash
# STRICT WARNING: Use only during total system recovery or dedicated staging restores!
mongorestore \
  --uri="$TARGET_MONGODB_URI" \
  --gzip \
  --archive="/var/backups/mongodb/hobbydating_backup_TIMESTAMP.archive.gz" \
  --drop
```
> [!WARNING]
> **Consequences of `--drop`**:
> - Completely erases target collections before recreating them. Any data written since the backup snapshot was taken will be permanently destroyed.
> - Required when restoring to a state where partial records or conflicting unique keys would otherwise cause duplicate-key failures.
> - Never execute `--drop` in production without a second authorized engineer review and a fresh pre-restore backup.

#### 3. Pre-Launch Staging Restoration Drill
Before deploying to production, perform an isolated end-to-end restore drill:
1. **Restore Archive into Isolated Staging DB**:
   ```bash
   mongorestore --uri="$STAGING_MONGODB_URI" --gzip --archive="./staging_drill.archive.gz" --drop
   ```
2. **Re-create and Verify Indexes**: 
   ```bash
   cd backend && npm run db:indexes
   ```
3. **Verify Record Counts & Integrity**:
   Inspect document counts across primary collections:
   ```javascript
   // Run in mongosh connected to restored staging DB:
   db.users.countDocuments();
   db.events.countDocuments();
   db.bookings.countDocuments();
   db.matches.countDocuments();
   db.conversations.countDocuments();
   db.messages.countDocuments();
   ```
4. **Smoke Test Backend Against Restored DB**:
   - Verify readiness probe: `GET /api/health/ready` returns HTTP 200 `{ "status": "ready" }`.
   - Perform read query on user profile and past event listings.
5. **Log Drill Results**: Record operator, date, archive filename, restoration duration, and document counts in the deployment log.

##### Clean Point-in-Time Recovery with `--drop`
The `--drop` flag causes `mongorestore` to **drop each existing collection from the target database before restoring it from the backup**:
```bash
# STRICT WARNING: Use only during total system recovery or dedicated staging restores!
mongorestore \
  --uri="$TARGET_MONGODB_URI" \
  --gzip \
  --archive="/var/backups/mongodb/hobbydating_backup_TIMESTAMP.archive.gz" \
  --drop
```
> [!WARNING]
> **Consequences of `--drop`**:
> - Completely erases target collections before recreating them. Any data written since the backup snapshot was taken will be permanently destroyed.
> - Required when restoring to a state where partial records or conflicting unique keys would otherwise cause duplicate-key failures.
> - Never execute `--drop` in production without a second authorized engineer review and a fresh pre-restore backup.

#### 3. Pre-Launch Staging Restoration Drill
Before deploying to production, perform an isolated end-to-end restore drill:
1. **Restore Archive into Isolated Staging DB**:
   ```bash
   mongorestore --uri="$STAGING_MONGODB_URI" --gzip --archive="./staging_drill.archive.gz" --drop
   ```
2. **Re-create and Verify Indexes**:
   ```bash
   cd backend && npm run db:indexes
   ```
3. **Verify Record Counts & Integrity**:
   Inspect document counts across primary collections:
   ```javascript
   // Run in mongosh connected to restored staging DB:
   db.users.countDocuments();
   db.events.countDocuments();
   db.bookings.countDocuments();
   db.matches.countDocuments();
   db.conversations.countDocuments();
   db.messages.countDocuments();
   ```
4. **Smoke Test Backend Against Restored DB**:
   - Verify readiness probe: `GET /api/health/ready` returns HTTP 200 `{ "status": "ready" }`.
   - Perform read query on user profile and past event listings.
5. **Log Drill Results**: Record operator, date, archive filename, restoration duration, and document counts in the deployment log.

---

## 3. Container & Process Health Monitoring

The backend exposes three standardized health endpoints:

1. **Liveness Probe**: `GET /api/health/live`
   - Returns HTTP 200 `{ "status": "live", "uptime": <seconds> }`.
   - Used by Kubernetes or Docker swarm to confirm the Node.js event loop is responsive.
2. **Readiness Probe**: `GET /api/health/ready`
   - Checks MongoDB connection state (`mongoose.connection.readyState === 1`).
   - Returns HTTP 200 when ready to receive live user traffic.
   - Returns HTTP 503 Service Unavailable if database is connecting, reconnecting, or down.
3. **General Status**: `GET /api/health`
   - Reports environment, database state, and runtime timestamp.

---

## 4. Graceful Shutdown & Zero-Downtime Deployment

The backend implements `handleShutdown` listeners for `SIGTERM` and `SIGINT`:
1. Closes HTTP listener to reject new incoming connections.
2. Terminates the Socket.io WebSocket server, allowing active client connections to disconnect cleanly.
3. Stops background scheduled tasks (such as event lifecycle transitions).
4. Flushes and disconnects MongoDB connections via `disconnectDatabase()`.
5. Enforces a 10-second timeout fallback (`process.exit(1)`) if hanging sockets prevent process termination.

### PM2 Process Manager Configuration (`ecosystem.config.cjs`)

```javascript
module.exports = {
  apps: [
    {
      name: 'hobby-dating-backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

---

## 5. Security & Protection Checklist

- [x] **Rate Limiting**: Authentication (`25 req/15m`), Bookings (`40 req/15m`), Organizer Applications (`10 req/15m`), Reports (`10 req/15m`), Account Security (`15 req/15m`), Messages (`60 req/1m`), QR Scans (`180 req/15m`).
- [x] **NoSQL Injection Defense**: Recursive `noSqlSanitizer` strips query operator keys (`$` and `.`) from all request bodies, params, and queries.
- [x] **XSS Sanitization**: HTML escaping on chat message payloads; Helmet security headers (nosniff, frameguard, HSTS).
- [x] **CORS Enforcement**: Exact origin matching with regex and array support; wildcards prohibited on authenticated endpoints.
- [x] **Structured Logging**: Automatic masking of passwords, JWT tokens, cookies, secrets, and private chat content. Stack traces suppressed in production responses.
- [x] **Socket Authorization**: Server-side JWT authentication on connection and room-membership verification on all conversation join/typing events.
