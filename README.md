# School Connect Portal 🏫

**Bridging the gap between Teachers, Students, and Parents through a seamless digital experience.**

The School Connect Portal is a modern, full-stack school management system designed to streamline communication and academic management. Built with performance, security, and real-time interaction at its core.

---

## 🚀 Key Features

### 👨‍💼 Admin Dashboard
- **Comprehensive Management**: Oversee Teachers, Students, Parents, Subjects, and Classes.
- **Data Insights**: Visualized statistics for school attendance and performance.

### 👩‍🏫 Teacher Dashboard
- **Academic Control**: Manage assignments, exams, and student results.
- **Attendance Tracking**: Efficiently mark and track student attendance by class and lesson.
- **Schedule Management**: Personal calendar view of assigned lessons.

### 🎓 Student Dashboard
- **Interactive Learning**: View latest assignments, lessons, and exam schedules.
- **Real-time Notifications**: Receive instant alerts when new assignments are posted.
- **Progress Tracking**: View academic results and attendance history.

### 👪 Parent Dashboard
- **Child Monitoring**: Keep track of multiple children's schedules and academic performance.
- **Communication**: Stay updated with school announcements and events.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- **Authentication**: [Clerk](https://clerk.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Real-time Notifications**: [Socket.io](https://socket.io/) (Custom Standalone Server)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **UI Components**: Recharts, React-Calendar, React-Toastify

---

## 🔄 Application Flow

### 1. Authentication & Role-Based Access
Users authenticate via Clerk. Our middleware then intelligently routes them to their specific dashboard (`/admin`, `/teacher`, `/student`, or `/parent`) based on their metadata role.

### 2. The Real-time Notification Engine
Our project implements a custom real-time notification system:
1.  **Trigger**: When a teacher creates an assignment, a Server Action is triggered.
2.  **Dispatch**: The action sends a secure internal HTTP request to our separate **Socket Server**.
3.  **Delivery**: The Socket Server identifies the connected students for that class and emits a WebSocket event.
4.  **Instant UI Update**: The student's browser receives the event, displays a beautiful toast notification, and automatically refreshes the assignment list—**no page refresh required!**

---

## 💻 Local Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Avinash-barodia/School-Connect-Portal.git
    cd School-Connect-Portal
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file and add:
    ```env
    DATABASE_URL="yo_db_url"
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_key"
    CLERK_SECRET_KEY="your_clerk_secret"
    NEXT_PUBLIC_SOCKET_URL="http://localhost:3002"
    SOCKET_SERVER_INTERNAL_URL="http://localhost:3002"
    ```

4.  **Database Sync**:
    ```bash
    npx prisma db push
    ```

5.  **Run the application**:
    - **Frontend**: `npm run dev`
    - **Socket Server**: `npm run socket`

---

## 🌐 Production Deployment

This project is optimized for a distributed deployment (Option B):

- **Database**: Hosted on [Neon](https://neon.tech/) (Serverless Postgres).
- **Socket Server**: Hosted on [Render](https://render.com/) (Web Service with persistent connection).
- **Dashboard**: Hosted on [Vercel](https://vercel.com/) (Next.js optimization).

*For detailed deployment steps, refer to the `implementation_plan.md` in our brain directory.*
