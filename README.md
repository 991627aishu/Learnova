# LMS Platform

A production-ready Learning Management System with three roles: **Student**, **Instructor**, and **Admin**.

## Tech Stack

- **Frontend:** React (Vite), TypeScript, TailwindCSS, React Router, React Query, Zustand, React Hook Form, ShadCN-style UI, Framer Motion, Recharts, Monaco Editor, KaTeX, React Player
- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, Multer, Zod

## Prerequisites

- Node.js 18+
- PostgreSQL

## Setup

1. **Install dependencies (from repo root):**
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

2. **Database:**
   - Create a PostgreSQL database (e.g. `lms`).
   - Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`:
     ```
     DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/lms?schema=public"
     ```

3. **Generate Prisma client and push schema:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npx prisma db seed   # optional: creates admin@lms.dev, instructor@lms.dev, student@lms.dev with password "password123"
   ```

4. **Run the app:**
   ```bash
   # From repo root
   npm run dev
   ```
   - Backend: http://localhost:3001  
   - Frontend: http://localhost:5173  

   Or run separately:
   ```bash
   npm run dev:backend   # backend only
   npm run dev:frontend  # frontend only
   ```

## Default accounts (after seed)

| Role       | Email              | Password   |
|-----------|--------------------|------------|
| Admin     | admin@lms.dev      | password123 |
| Instructor| instructor@lms.dev | password123 |
| Student   | student@lms.dev    | password123 |

## Project structure

```
lms-platform/
├── frontend/     # Vite + React app
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── store/
│       ├── hooks/
│       └── lib/
└── backend/      # Express API
    └── src/
        ├── controllers/
        ├── routes/
        ├── middlewares/
        ├── services/
        └── prisma/
```

## Features

- **Student:** Dashboard, browse/enroll courses, course player (video, progress), wishlist, certificates, quiz results, profile.
- **Instructor:** Dashboard, create courses, curriculum builder (sections/lectures), analytics, earnings, reviews.
- **Admin:** User/course/category management, moderation, reports, analytics, settings.
