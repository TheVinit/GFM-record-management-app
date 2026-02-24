# 🎓 GFM Record Management System

A premium, state-of-the-art record management application designed for Guardian Faculty Members (GFM) to track student progress, attendance, and financial status with ease and precision.

## 🚀 Key Features

### 📊 Dashboard & Analytics
- **Admin Dashboard**: High-level overview of students, faculty, and system health.
- **Teacher Dashboard**: Personalized view for GFMs to manage their assigned batches.
- **Real-time Stats**: Track attendance, fee payments, and academic performance.

### 👥 User Management
- **Role-Based Access**: Secure login for Admins, Teachers, Students, and Attendance Takers.
- **Profile Management**: Complete student profiling including academic history, achievements, and document uploads.
- **Admin Control**: Bulk import staff and students via CSV templates.

### 💰 Financial Tracking (Fees)
- **Status Monitoring**: Instantly identify 'Paid', 'Pending', and 'Not Paid' students.
- **Visual Alerts**: Financial defaulters are highlighted in red for immediate attention.
- **Report Generation**: Export detailed fee reports and defaulter lists in CSV format.

### 📅 Attendance & Academics
- **Daily Attendance**: Easy-to-use interface for marking and tracking student presence.
- **Course Management**: Configure semesters, credits, and evaluation schemes.
- **Academic Records**: Centralized storage for ISE, MSE, and ESE marks.

## 🛠️ Technology Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Database (Cloud)**: [Supabase](https://supabase.com/) (PostgreSQL & Auth)
- **Database (Local)**: [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (Caching Layer)
- **Styling**: Vanilla CSS for premium, high-performance UI components.
- **Icons**: [Ionicons](https://ionic.io/ionicons)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)

## 📁 Project Structure

- `app/`: Expo Router pages (Admin, Teacher, Student screens).
- `components/`: Reusable UI components (Modals, Headers, Tables).
- `constants/`: Global variables, color tokens, and mappings.
- `services/`: API integration with Supabase Auth and Session management.
- `storage/`: SQLite caching logic and database initialization.
- `utils/`: Common helper functions (Date formatting, Validation).
- `csv-templates/`: Reference files for bulk data imports.

## 📥 Setup for Teammates

For detailed instructions on how to run this project on your machine, please refer to the **[TEAM_SETUP.txt](./TEAM_SETUP.txt)** file.

---
**GFM Record Management System** - *Efficiency in Education.*
