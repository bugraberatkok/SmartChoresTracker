# Smart Chores Tracker

Smart Chores Tracker is a full-stack household chore management application developed as a Capstone project. It combines collaborative task management with gamification to make shared responsibilities easier to organize and more engaging.

## Features

- JWT-based registration and login
- Household creation and invite-code joining
- `OWNER`, `ADMIN`, and `MEMBER` role-based permissions
- Chore creation, assignment, editing, deletion, and completion
- Recurring chores with per-date completion tracking
- Points, leaderboard, weekly progress, streaks, and achievements
- Custom household rewards and reward redemption
- Activity history for chore creation and completion
- User profiles with display names and avatars
- Responsive React interface with permission-aware controls

## Tech Stack

**Backend**
- Java 21
- Spring Boot 4.1
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL
- Flyway
- Maven
- JUnit / Mockito
- Spring Boot Actuator

**Frontend**
- React 19
- TypeScript
- Vite
- CSS
- ESLint

**DevOps**
- GitHub Actions CI
- Railway — backend and PostgreSQL
- Vercel — frontend

## Project Structure

```text
SmartChoresTracker/
├── backend/      # Spring Boot REST API
├── frontend/     # React + TypeScript client
├── .github/      # CI workflow
└── README.md
```

The backend follows a feature-oriented modular-monolith structure with separate modules for authentication, users, households, memberships, chores, gamification, rewards, and activity history.

## Running Locally

### Prerequisites

- Java 21
- Node.js 22+
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/bugraberatkok/SmartChoresTracker.git
cd SmartChoresTracker
```

### 2. Create the database

```sql
CREATE DATABASE choreapp;
```

### 3. Configure backend environment variables

```text
DB_URL=jdbc:postgresql://localhost:5432/choreapp
DB_USERNAME=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=YOUR_BASE64_ENCODED_SECRET
APP_TIME_ZONE=Europe/Istanbul
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Run the backend

```bash
cd backend
./mvnw spring-boot:run
```

On Windows Command Prompt / PowerShell:

```bash
mvnw.cmd spring-boot:run
```

Backend runs at `http://localhost:8080`.

### 5. Run the frontend

```bash
cd frontend
npm ci
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies local `/api` requests to the backend.

## Quality Checks

```bash
# Backend
cd backend
./mvnw clean verify

# Frontend
cd frontend
npm ci
npm run lint
npm run build
```

GitHub Actions runs backend verification plus frontend install, lint, and production build checks on pushes and pull requests.

## Deployment

The application is deployed with:

- **Frontend:** Vercel
- **Backend:** Railway
- **Database:** PostgreSQL on Railway

Database schema changes are managed with Flyway migrations.

---

Built as a Software Engineering Capstone project.
