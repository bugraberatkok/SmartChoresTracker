# Smart Chores Tracker

Smart Chores Tracker is a full-stack household chore management application developed as a Capstone project. It combines collaborative task management with gamification features such as points, leaderboards, achievements, and weekly progress tracking.

The project is organized as a **modular monolith** with a Spring Boot backend and a React + TypeScript frontend.

---

## Project Status

The main MVP flow is implemented and working end-to-end.

### Implemented

- User registration and login
- JWT authentication
- Protected API endpoints
- Current-user endpoint
- Household creation, listing, update, and deletion
- `OWNER / ADMIN / MEMBER` authorization
- Automatic owner membership on household creation
- Household member listing
- Add member by email
- Secure household join using invite codes
- Lazy invite-code generation for existing households
- Remove/kick members with role-aware authorization
- Chore creation, assignment, update, deletion, and completion
- Normal and recurring chores
- Recurrence-day validation
- Recurrence start-date validation
- Per-occurrence completion tracking for recurring chores
- Chore points
- Household leaderboard
- Shared-rank handling for equal scores
- Achievement/trophy system
- Weekly completion progress
- React permission-aware UI
- Invite-code modal and copy flow
- Backend unit tests for critical business logic
- Frontend production build and ESLint validation

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
- Maven
- JUnit 5
- Mockito

### Frontend

- React 19
- TypeScript
- Vite
- CSS
- Fetch API
- ESLint

---

## Repository Structure

```text
SmartChoresTracker/
├── README.md
├── backend/
│   ├── pom.xml
│   ├── mvnw
│   ├── mvnw.cmd
│   └── src/
│       ├── main/
│       └── test/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
```

The backend uses a feature-oriented modular-monolith structure:

```text
com.capstone.choreapp
├── auth
├── user
├── group
│   └── membership
├── chore
├── gamification
├── common
│   └── exception
├── config
├── security
└── ChoreappApplication
```

The goal is to keep business areas isolated so features can evolve without mixing unrelated logic into authentication or infrastructure code.

---

## Main Domain Model

```text
User
 ├── owns / joins Groups
 ├── creates Chores
 └── can be assigned Chores

Group
 ├── owner -> User
 ├── memberships -> GroupMembership
 ├── chores -> Chore
 └── inviteCode

GroupMembership
 ├── user -> User
 ├── group -> Group
 └── role -> OWNER / ADMIN / MEMBER

Chore
 ├── group
 ├── createdBy
 ├── assignedUser
 ├── status
 ├── points
 ├── dueDate
 ├── recurring
 ├── recurrenceDays
 ├── recurrenceStartDate
 ├── completedDates
 └── completedAt
```

---

## Authentication

Authentication is JWT based.

Public endpoints:

```text
/api/auth/**
```

All other endpoints require a valid access token.

The authenticated user ID is stored in the JWT `sub` claim. Controllers can therefore resolve the user with:

```java
Long userId = Long.valueOf(authentication.getName());
```

---

## Roles and Authorization

Roles:

```text
OWNER
ADMIN
MEMBER
```

Central authorization helpers:

```text
requireMember()
requireManager()
requireOwner()
```

| Action | OWNER | ADMIN | MEMBER |
|---|:---:|:---:|:---:|
| View household | ✅ | ✅ | ✅ |
| View members | ✅ | ✅ | ✅ |
| View chores | ✅ | ✅ | ✅ |
| View/share invite code | ✅ | ✅ | ✅ |
| Create chore | ✅ | ✅ | ❌ |
| Edit chore | ✅ | ✅ | ❌ |
| Delete chore | ✅ | ✅ | ❌ |
| Complete own assigned chore | ✅ | ✅ | ✅ |
| Complete another member's chore | ✅ | ✅ | ❌ |
| Add member by email | ✅ | ✅ | ❌ |
| Kick MEMBER | ✅ | ✅ | ❌ |
| Kick ADMIN | ✅ | ❌ | ❌ |
| Delete household | ✅ | ❌ | ❌ |

A user cannot kick themselves. The household owner cannot be removed.

When a member is removed, chores assigned to that member are unassigned rather than deleted.

---

## Household Invite Flow

New households receive a random invite code.

Existing households that do not yet have one receive a code the first time a household member requests it.

### Get or create invite code

```http
POST /api/groups/{groupId}/invite-code
```

Example response:

```json
{
  "inviteCode": "A7F3C9"
}
```

### Join using invite code

```http
POST /api/groups/join-by-code
```

Example request:

```json
{
  "inviteCode": "A7F3C9"
}
```

Invite codes are normalized before lookup, so leading/trailing spaces and letter casing do not affect joining.

The previous numeric group-ID self-join flow has been removed.

---

## Chores

### Create chore

```http
POST /api/groups/{groupId}/chores
```

### List household chores

```http
GET /api/groups/{groupId}/chores
```

### Get chore

```http
GET /api/groups/{groupId}/chores/{choreId}
```

### Update chore

```http
PATCH /api/groups/{groupId}/chores/{choreId}
```

### Delete chore

```http
DELETE /api/groups/{groupId}/chores/{choreId}
```

### Complete chore

```http
PATCH /api/groups/{groupId}/chores/{choreId}/complete
```

Normal chores use a single completion state.

Recurring chores track completed calendar occurrences separately using `completedDates`.

A recurring occurrence can only be completed when:

- the selected date belongs to `recurrenceDays`
- the selected date is not before `recurrenceStartDate`

Changing a recurring chore to a non-recurring chore clears recurrence-specific completion data.

---

## Gamification

Gamification is implemented on the backend and consumed by the React frontend.

### Leaderboard

```http
GET /api/groups/{groupId}/gamification/leaderboard
```

Each entry contains:

```text
userId
name
totalPoints
completedChores
rank
```

Recurring chore points are counted once for each completed occurrence.

Members with the same number of points share the same rank.

---

### Achievements

```http
GET /api/groups/{groupId}/gamification/members/{memberUserId}/achievements
```

Current achievements:

| Code | Requirement |
|---|---|
| `FIRST_CHORE` | Complete 1 chore |
| `FIFTY_POINTS` | Earn 50 points |
| `TWO_HUNDRED_POINTS` | Earn 200 points |

Achievement responses include current progress and whether the achievement has been earned.

---

### Weekly Progress

```http
GET /api/groups/{groupId}/gamification/members/{memberUserId}/progress
```

The endpoint returns Monday-Sunday completion counts.

For recurring chores, the occurrence date is used.

For normal chores, the chore's calendar/due date is used so the graph represents the chore schedule rather than the exact wall-clock moment when the completion button was clicked.

---

## Frontend Flow

```text
Login / Register
      ↓
Household list
      ↓
Create household / Join with invite code
      ↓
Members
      ↓
Member dashboard
      ↓
Chores + Leaderboard + Achievements + Weekly Progress
```

The frontend uses backend authorization rules and also hides management controls from users who do not have permission to use them.

---

# Running Locally

## Prerequisites

Install:

- Git
- Java 21
- PostgreSQL
- Node.js + npm

---

## 1. Clone

```bash
git clone https://github.com/bugraberatkok/SmartChoresTracker.git
cd SmartChoresTracker
```

---

## 2. PostgreSQL

Create a local database:

```sql
CREATE DATABASE choreapp;
```

The development configuration uses Hibernate schema updates, so application tables are created/updated from the entities.

---

## 3. Backend Environment Variables

Configure:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
```

Example:

```text
DB_URL=jdbc:postgresql://localhost:5432/choreapp
DB_USERNAME=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=YOUR_BASE64_ENCODED_SECRET
```

Generate a suitable JWT secret with Python:

```bash
python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Do not commit database passwords or JWT secrets.

---

## 4. Run Backend

```bash
cd backend
```

Windows:

```bash
mvnw.cmd spring-boot:run
```

Git Bash / macOS / Linux:

```bash
./mvnw spring-boot:run
```

Backend:

```text
http://localhost:8080
```

---

## 5. Run Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite normally starts at:

```text
http://localhost:5173
```

Frontend `/api/*` requests are proxied to the Spring Boot backend.

---

# Validation and Tests

## Backend

Critical business logic currently has Mockito/JUnit tests for:

- leaderboard point and rank calculation
- recurring chore completion validation
- secure invite-code joining

Run all backend tests:

```bash
cd backend
mvn clean test
```

Expected result:

```text
BUILD SUCCESS
```

---

## Frontend

Run ESLint:

```bash
cd frontend
npm run lint
```

Create a production build:

```bash
npm run build
```

Both checks should complete without errors before merging changes.

---

# Development Roadmap

The current MVP is functional. Possible next improvements include:

- Promote/demote household members between `ADMIN` and `MEMBER`
- Notifications and reminders
- Custom household rewards / parent-defined goals
- More achievements
- Streak-based gamification
- Invite-code regeneration/revocation
- Invite expiration
- Better audit/history views
- Expanded automated test coverage
- Integration tests / Testcontainers
- CI pipeline for backend tests, frontend lint, and frontend build
- Deployment configuration

---

## Current MVP Summary

```text
Authentication          ✅
JWT authorization       ✅
Households              ✅
Memberships             ✅
Secure invite codes     ✅
Role-based permissions  ✅
Chore CRUD              ✅
Recurring chores        ✅
Completion tracking     ✅
Points                  ✅
Leaderboard             ✅
Achievements            ✅
Weekly progress         ✅
Backend unit tests      ✅
Frontend lint           ✅
Frontend build          ✅
```

Smart Chores Tracker is now at a solid MVP stage and is ready for further feature development and deployment-oriented improvements.
