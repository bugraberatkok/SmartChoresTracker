# Smart Chores Tracker

Smart Chores Tracker is a full-stack household/group chore management application built for a Capstone project.

The application allows users to create shared households, manage members, assign chores, complete tasks, track chore points, and provides a foundation for a larger gamification system with leaderboards, badges, progress tracking, recurring chores, and notifications.

> The repository name still contains `choreappBackend`, but the repository is now a **monorepo** containing both the Spring Boot backend and the React frontend.

---

## Project Status

The core household and chore management flow is currently working end-to-end.

### Working features

- User registration
- User login
- JWT authentication
- Protected API endpoints
- Current-user endpoint
- Household creation
- Household listing for both owners and members
- Household detail access for members
- Household update
- Household deletion
- Automatic `OWNER` membership when a household is created
- Household member listing
- Add member by email
- Self-join household flow using group ID
- Remove/kick a member
- `OWNER / ADMIN / MEMBER` authorization model
- Chore creation
- Chore assignment to a household member
- Chore listing
- Member-specific chore dashboards
- Chore update
- Chore deletion
- Chore completion
- Persistent completion state in PostgreSQL
- Chore points
- Frontend member point totals derived from completed chores
- Frontend member chore counts
- Frontend permission-aware controls
- Modal-based chore creation/edit/delete flow
- Modal-based household deletion flow

The main unfinished area is the **persistent gamification module**.

---

## Tech Stack

### Backend

- Java 21
- Spring Boot 4.1.0
- Spring Web MVC
- Spring Security
- OAuth2 Resource Server / JWT
- Spring Data JPA
- Jakarta Validation
- PostgreSQL
- Lombok
- Maven / Maven Wrapper

### Frontend

- React 19
- TypeScript
- Vite
- CSS
- Fetch API

### Development Database

- PostgreSQL

---

## Repository Structure

```text
choreappBackend/
├── README.md
├── backend/
│   ├── pom.xml
│   ├── mvnw
│   ├── mvnw.cmd
│   └── src/
│       └── main/
│           ├── java/com/capstone/choreapp/
│           └── resources/
│
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    └── src/
```

The backend follows a feature-oriented modular monolith structure.

```text
com.capstone.choreapp
├── auth
│   ├── controller
│   ├── dto
│   ├── exception
│   └── service
│
├── user
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── exception
│   └── repository
│
├── group
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── exception
│   ├── mapper
│   ├── repository
│   ├── service
│   └── membership
│       ├── controller
│       ├── dto
│       ├── entity
│       ├── exception
│       ├── mapper
│       ├── repository
│       └── service
│
├── chore
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── exception
│   ├── mapper
│   ├── repository
│   └── service
│
├── common
│   └── exception
│
├── config
├── security
└── ChoreappApplication
```

The purpose of this structure is to keep each feature as independent as possible. Future features such as gamification, recurring chores, and notifications should be added as separate modules instead of being mixed directly into authentication code.

---

## Main Domain Model

The current main entities are:

```text
User
Group
GroupMembership
Chore
```

Conceptually:

```text
User
 ├── owns Group
 ├── has GroupMembership
 ├── creates Chore
 └── can be assigned Chore

Group
 ├── owner -> User
 ├── memberships -> GroupMembership
 └── chores -> Chore

GroupMembership
 ├── user -> User
 ├── group -> Group
 └── role -> OWNER / ADMIN / MEMBER

Chore
 ├── group -> Group
 ├── createdBy -> User
 ├── assignedUser -> User (nullable)
 ├── status -> PENDING / COMPLETED
 ├── points
 ├── dueDate
 └── completedAt
```

The database currently contains tables corresponding to the main entities, including:

```text
users
chore_groups
group_memberships
chores
```

`chore_groups` is used instead of a generic SQL table name such as `group`.

---

## Authentication

Authentication is JWT based.

Public endpoints:

```text
/api/auth/**
```

All other API endpoints require authentication.

The JWT `sub` claim stores the authenticated **user ID**.

Therefore backend controllers commonly resolve the authenticated user with:

```java
Long userId = Long.valueOf(authentication.getName());
```

The configured access-token lifetime is currently:

```text
45 minutes
```

---

## Authorization and Roles

Household authorization is centralized through membership checks.

### Roles

```text
OWNER
ADMIN
MEMBER
```

### Core authorization helpers

```text
requireMember()
requireManager()
requireOwner()
```

Their intended meaning:

```text
requireMember
OWNER / ADMIN / MEMBER

requireManager
OWNER / ADMIN

requireOwner
OWNER only
```

### Current permission summary

| Action | OWNER | ADMIN | MEMBER |
|---|:---:|:---:|:---:|
| View household | ✅ | ✅ | ✅ |
| View members | ✅ | ✅ | ✅ |
| View household chores | ✅ | ✅ | ✅ |
| Create chore | ✅ | ✅ | ❌ |
| Edit chore | ✅ | ✅ | ❌ |
| Delete chore | ✅ | ✅ | ❌ |
| Complete own assigned chore | ✅ | ✅ | ✅ |
| Complete another member's chore | ✅ | ✅ | ❌ |
| Add member by email | ✅ | ✅ | ❌ |
| Kick MEMBER | ✅ | ✅ | ❌ |
| Kick ADMIN | ✅ | ❌ | ❌ |
| Kick OWNER | ❌ | ❌ | ❌ |
| Delete household | ✅ | ❌ | ❌ |

A user cannot kick themselves.

When a member is removed from a household, chores assigned to that member are **unassigned** instead of deleting the chores.

---

## Household Membership Flows

There are currently two ways to become a member.

### Manager adds an existing user

```http
POST /api/groups/{groupId}/members
```

Example:

```json
{
  "email": "member@example.com"
}
```

The requester must be `OWNER` or `ADMIN`.

The added user receives the `MEMBER` role.

### Self-join

```http
POST /api/groups/{groupId}/members/join
```

The currently authenticated user joins the group as `MEMBER`.

> **Important:** this is currently an MVP shortcut. A user who knows a valid group ID can attempt to join that household. This should be replaced by a secure invitation mechanism before treating the application as production-ready.

Recommended future replacement:

```text
random invite code
or
signed invite link
or
join request + manager approval
```

---

# Running the Project Locally

## Prerequisites

Install:

- Git
- Java 21
- PostgreSQL
- Node.js + npm
- IntelliJ IDEA is recommended for backend development, but not required

You do not need to install Maven globally because the backend contains the Maven Wrapper.

---

## 1. Clone the repository

```bash
git clone https://github.com/bugraberatkok/choreappBackend.git
cd choreappBackend
```

---

## 2. Create the PostgreSQL database

Start PostgreSQL and create an empty database.

Recommended database name:

```text
choreapp
```

Example SQL:

```sql
CREATE DATABASE choreapp;
```

Do **not** manually create the application tables.

The development configuration currently uses:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Hibernate will create/update the tables from the entities when the backend starts.

---

## 3. Backend Environment Variables

The backend expects these environment variables:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
```

Example values:

```text
DB_URL=jdbc:postgresql://localhost:5432/choreapp
DB_USERNAME=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=YOUR_BASE64_ENCODED_SECRET
```

### What each variable means

#### `DB_URL`

JDBC connection string for PostgreSQL.

Example:

```text
jdbc:postgresql://localhost:5432/choreapp
```

If another PostgreSQL port or database name is used, update this value.

#### `DB_USERNAME`

PostgreSQL username.

Common local value:

```text
postgres
```

#### `DB_PASSWORD`

Password belonging to the PostgreSQL user.

Do not commit this value into Git.

#### `JWT_SECRET`

Secret key used to sign and validate JWT access tokens.

The current backend expects this secret to be **Base64 encoded** and uses it with HMAC-SHA256 / HS256.

A convenient way to generate a suitable local secret is:

```bash
python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Copy the printed value into `JWT_SECRET`.

Do not use a short human-readable password as the JWT secret and do not commit the secret.

---

## 4. Configure Environment Variables in IntelliJ

A convenient local setup is:

```text
Run
→ Edit Configurations
→ ChoreappApplication
→ Environment variables
```

Add:

```text
DB_URL=jdbc:postgresql://localhost:5432/choreapp
DB_USERNAME=postgres
DB_PASSWORD=YOUR_PASSWORD
JWT_SECRET=YOUR_BASE64_SECRET
```

Then run `ChoreappApplication`.

Backend default address:

```text
http://localhost:8080
```

---

## 5. Run Backend from Terminal

From the repository root:

```bash
cd backend
```

### Windows CMD / PowerShell

```bash
mvnw.cmd spring-boot:run
```

### Git Bash / macOS / Linux

```bash
./mvnw spring-boot:run
```

The backend should start on:

```text
http://localhost:8080
```

---

## 6. Run Frontend

Open another terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Vite normally starts the frontend on:

```text
http://localhost:5173
```

The frontend sends requests to paths beginning with:

```text
/api
```

Vite proxies those requests to:

```text
http://localhost:8080
```

So the normal development setup is:

```text
Browser
http://localhost:5173
       |
       | /api/*
       v
Vite dev proxy
       |
       v
Spring Boot
http://localhost:8080
       |
       v
PostgreSQL
```

The backend development CORS configuration currently allows local frontend origins including ports `5173` and `3000`.

---

# Main API Endpoints

All endpoints except `/api/auth/**` require:

```http
Authorization: Bearer <accessToken>
```

---

## Authentication

### Register

```http
POST /api/auth/register
```

Example:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test123!"
}
```

### Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "test@example.com",
  "password": "Test123!"
}
```

The response contains an `accessToken`.

### Current user

```http
GET /api/users/me
```

---

## Households / Groups

### Create household

```http
POST /api/groups
```

```json
{
  "name": "Green Street Home",
  "description": "Shared apartment"
}
```

The creator automatically becomes `OWNER`.

### List current user's households

```http
GET /api/groups
```

This includes households where the current user is a member, not only households they own.

### Get household

```http
GET /api/groups/{groupId}
```

Any member of the household can access it.

### Update household

```http
PATCH /api/groups/{groupId}
```

Currently restricted to the owner.

Example:

```json
{
  "name": "Updated Household",
  "description": "Updated description"
}
```

### Delete household

```http
DELETE /api/groups/{groupId}
```

Owner-only.

The current delete flow removes:

```text
chores
→ memberships
→ household
```

This allows a populated household to be deleted without leaving child rows behind.

---

## Membership

### List members

```http
GET /api/groups/{groupId}/members
```

### Add member by email

```http
POST /api/groups/{groupId}/members
```

```json
{
  "email": "member@example.com"
}
```

Requires `OWNER` or `ADMIN`.

### Self-join

```http
POST /api/groups/{groupId}/members/join
```

No body is required.

The authenticated user joins as `MEMBER`.

### Remove member

```http
DELETE /api/groups/{groupId}/members/{userId}
```

The current permission rules are:

```text
OWNER can remove ADMIN or MEMBER
ADMIN can remove MEMBER
ADMIN cannot remove another ADMIN
OWNER cannot be removed
requester cannot remove themselves
```

Assigned chores belonging to a removed user are unassigned.

---

## Chores

### Create chore

```http
POST /api/groups/{groupId}/chores
```

Requires `OWNER` or `ADMIN`.

Example:

```json
{
  "title": "Clean the kitchen",
  "description": "Wash the dishes and wipe the counter",
  "assignedUserId": 3,
  "points": 10,
  "dueDate": "2026-08-26T20:00:00Z"
}
```

Important fields:

```text
createdByUserId
```

is the user who created the chore.

```text
assignedUserId
```

is the user responsible for completing the chore.

These values are intentionally different concepts.

### List household chores

```http
GET /api/groups/{groupId}/chores
```

Accessible to household members.

### Get chore

```http
GET /api/groups/{groupId}/chores/{choreId}
```

### Update chore

```http
PATCH /api/groups/{groupId}/chores/{choreId}
```

Requires `OWNER` or `ADMIN`.

Example partial update:

```json
{
  "title": "Clean kitchen and table",
  "description": "Kitchen first, then dining table",
  "points": 15
}
```

The update DTO also supports changing the assigned user and due date.

### Delete chore

```http
DELETE /api/groups/{groupId}/chores/{choreId}
```

Requires `OWNER` or `ADMIN`.

Returns:

```text
204 No Content
```

### Complete chore

```http
PATCH /api/groups/{groupId}/chores/{choreId}/complete
```

A chore can currently be completed by:

```text
the assigned user
or
OWNER / ADMIN
```

Completion changes:

```text
status = COMPLETED
completedAt = current timestamp
```

Calling the endpoint again for an already completed chore is handled idempotently and does not create another completion transition.

There is currently **no reopen/uncomplete endpoint**.

---

# Frontend Flow

The current frontend provides:

```text
Login / Register
      ↓
Household list
      ↓
Create household / Join household
      ↓
Member list
      ↓
Member dashboard
      ↓
Assigned chores
```

Important frontend behavior:

- The household list is loaded from the backend.
- Member permissions are resolved from membership roles.
- A normal member can open their own dashboard.
- `OWNER` and `ADMIN` can manage member chores.
- Member dashboards filter chores by `assignedUserId`.
- Completing a chore calls the backend `/complete` endpoint.
- Completion therefore survives page refresh.
- Chore create/edit/delete operations call the backend.
- Household deletion calls the backend.
- Member point totals are currently calculated from completed chores.
- Member chore counts are calculated from assigned chores.

---

# Gamification Handoff

This is the most important next development area.

## What already exists

Each chore already has:

```text
points
status
assignedUser
completedAt
```

This means a completed chore already contains the information needed to award a score.

The frontend currently derives a member's visible point total approximately as:

```text
sum(points of COMPLETED chores assigned to that member)
```

The frontend also currently contains placeholder/hardcoded trophy definitions and a progress view.

These are **not yet a persistent backend gamification system**.

---

## Recommended gamification direction

Create a separate backend module, for example:

```text
gamification
├── controller
├── dto
├── entity
├── repository
└── service
```

Do not put leaderboard/badge logic into `AuthService`.

Possible responsibilities:

### Member statistics

Provide household-specific member statistics such as:

```text
totalPoints
completedChores
assignedChores
completionRate
```

Possible endpoint:

```http
GET /api/groups/{groupId}/members/{userId}/stats
```

### Leaderboard

Possible endpoint:

```http
GET /api/groups/{groupId}/leaderboard
```

Possible response:

```json
[
  {
    "userId": 3,
    "name": "Alice",
    "points": 120,
    "completedChores": 9
  }
]
```

### Badges / achievements

Examples:

```text
First Chore
50 Points
100 Points
5 Chores Completed
10 Chores Completed
Perfect Week
```

Possible implementation choices:

1. derive badges dynamically from chore history, or
2. persist earned badges in a dedicated table.

If badges need an earned timestamp or should never disappear, persisting them is usually more useful.

### Completion integration

Current chore completion transition:

```text
PENDING
  ↓
COMPLETED
```

A future integration could be:

```text
ChoreService.completeChore(...)
        ↓
GamificationService.onChoreCompleted(...)
        ↓
update score / achievements
```

### Important: prevent duplicate scoring

The complete endpoint can be called more than once.

Therefore a persistent points system must not award points twice.

Gamification should only award points on the real state transition:

```text
PENDING -> COMPLETED
```

and not when a chore was already completed.

An alternative architecture is to avoid storing a mutable score initially and derive the score from completed chores. That approach naturally avoids score desynchronization, but leaderboard performance and badge history should be considered.

---

# MVP Roadmap

## MVP 1 — Core task flow

Status: **Completed**

- [x] Register
- [x] Login
- [x] JWT authentication
- [x] Create chore
- [x] List chores
- [x] Complete chore
- [x] Persist completion

---

## MVP 2 — Household and assignment

Status: **Mostly completed**

- [x] Create household
- [x] List user's households
- [x] Household membership
- [x] Assign chores to members
- [x] Chore edit
- [x] Chore delete
- [x] Member kick
- [x] Household delete
- [x] Chore point value
- [x] Client-side point summary
- [ ] Persistent/centralized gamification statistics
- [ ] Secure invitation flow

---

## MVP 3 — Gamification

Status: **Next major target**

- [ ] Backend member statistics
- [ ] Leaderboard
- [ ] Persistent or derived total score strategy
- [ ] Badge/achievement rules
- [ ] Badge API
- [ ] Replace hardcoded frontend trophies with backend data
- [ ] Real progress/history data
- [ ] Better gamification visual feedback

---

## MVP 4 — Recurring chores and notifications

Status: **Not started**

- [ ] Recurring chore model
- [ ] Daily/weekly recurrence rules
- [ ] Generate next chore occurrence
- [ ] Due-date reminders
- [ ] Notifications
- [ ] Optional email/push integration
- [ ] Overdue chore handling

---

# Known Limitations / Improvement Backlog

These items are not blockers for the current MVP but should be addressed as the project matures.

## High priority

### Secure household invitations

Current self-join uses the numeric group ID.

Replace it with:

```text
invite code / invite token / approval request
```

### Real gamification backend

Current visible score is derived by the frontend.

The backend should become the source of truth for gamification-related data.

### Dynamic calendar

The current member dashboard calendar contains a hardcoded August week.

Replace it with a dynamically generated current week/month based on real dates.

### Role management

Roles exist in the backend, but there is currently no complete promote/demote management flow.

Useful future actions:

```text
OWNER promotes MEMBER -> ADMIN
OWNER demotes ADMIN -> MEMBER
```

---

## Medium priority

### Reopen a completed chore

Completion is currently one-way.

Possible endpoint:

```http
PATCH /api/groups/{groupId}/chores/{choreId}/reopen
```

Business rules need to define whether points/badges are reversed.

### Standardize validation responses

Custom domain exceptions are centralized, but validation errors and some generic bad-input cases can be standardized further.

A consistent API error structure makes frontend handling easier.

### Frontend UI cleanup

Some administrative controls still use simple browser confirmation/alert behavior.

Replace remaining native dialogs with reusable application modal components.

Also consider extracting repeated modal/button styles into reusable React components.

### Group settings UI

Backend household update exists, but a richer frontend household settings page would improve name/description and role administration.

---

## Engineering / Production improvements

- [ ] Automated backend unit tests
- [ ] Integration tests for authorization
- [ ] Frontend component/API tests
- [ ] End-to-end tests
- [ ] OpenAPI / Swagger documentation
- [ ] Flyway or Liquibase database migrations
- [ ] Dockerfile for backend
- [ ] Dockerfile for frontend
- [ ] Docker Compose for PostgreSQL + backend + frontend
- [ ] CI pipeline
- [ ] Production CORS configuration
- [ ] Production environment profiles
- [ ] Logging improvements
- [ ] Pagination for large chore/member lists
- [ ] Better frontend loading/error states
- [ ] Accessibility review
- [ ] Responsive/mobile polish

---

# Suggested End-to-End Smoke Test

Before merging a large feature, the following scenario gives good coverage.

## Account A — owner

1. Register Account A.
2. Login.
3. Create a household.
4. Confirm Account A is `OWNER`.

## Account B — member

5. Register Account B.
6. Add B from A by email, or use the current join flow.
7. Login as B.
8. Confirm the household appears in B's household list.
9. Confirm B can open the household and see members.

## Chore assignment

10. Login as A.
11. Open B's member dashboard.
12. Create a chore assigned to B.
13. Edit the chore.
14. Confirm B only sees chores assigned to B.

## Completion

15. Login as B.
16. Complete B's chore.
17. Refresh the page.
18. Confirm the chore remains `COMPLETED`.
19. Confirm `completedAt` exists in the database.
20. Confirm B's point total reflects the completed chore.

## Permissions

21. Confirm B cannot create/edit/delete chores.
22. Confirm an unrelated household member cannot complete B's chore.
23. Confirm A can manage chores.

## Member removal

24. Login as A.
25. Remove B.
26. Confirm B no longer sees the household.
27. Confirm chores previously assigned to B are now unassigned rather than deleted.

## Household deletion

28. Create a disposable household with members and chores.
29. Delete it as its owner.
30. Confirm its chores and memberships are removed.

---

# Development Notes for Collaborators

Before starting work:

```bash
git checkout main
git pull origin main
```

For a feature:

```bash
git checkout -b feature/gamification
```

Keep secrets local.

Never commit:

```text
database passwords
JWT secrets
.env files
IDE-specific secret configuration
```

Useful ignored build/dependency directories include:

```text
backend/target/
frontend/node_modules/
frontend/dist/
```

Before committing frontend work:

```bash
cd frontend
npm run build
```

Before committing backend work:

```bash
cd backend
./mvnw test
```

On Windows:

```bash
mvnw.cmd test
```

---

# Suggested Next Work Session

A practical next sequence is:

```text
1. Design gamification data strategy
2. Add backend member stats / leaderboard
3. Integrate scoring with chore completion safely
4. Replace frontend hardcoded trophy data
5. Make calendar dynamic
6. Replace numeric group-ID join with invite code
7. Add tests
8. Add recurring chores
9. Add notifications
```

For gamification, decide one question first:

> Should total points be persisted in a dedicated model, or derived from completed chores?

That choice affects score updates, undo/reopen behavior, leaderboard queries, badge history, and duplicate-award protection.

---

# Current Development Philosophy

The project is intentionally being developed as a **modular monolith**.

The goal is not to split the application into unnecessary microservices.

Instead:

```text
one deployable backend
+
clear feature boundaries
+
independent modules
```

This keeps the Capstone implementation understandable while allowing future modules such as:

```text
gamification
recurring
notification
```

to be added without rewriting authentication, group, or chore logic.

---

## License

This repository is currently an academic Capstone project. Add a formal license if the project is later distributed publicly under a specific license.
