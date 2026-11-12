# Majestic Ops — Admin Guide

This guide is for the **shop owner** and **managers** who administer Majestic Ops.

---

## 1. Settings Overview

The Settings page has **9 tabs**, accessible from the sidebar under **Settings**.

| Tab | Purpose |
|-----|---------|
| **Shop** | Shop name, address, working hours, logo |
| **Departments** | Create, edit, and archive departments |
| **Users** | Manage staff accounts, roles, and PINs |
| **Holidays** | Configure shop holidays and off-days |
| **Roles** | Define roles and their permissions |
| **Notifications** | Configure notification preferences and channels |
| **AI** | Enable/disable AI features, set Gemini API key |
| **Voice** | Configure voice input/output languages and TTS settings |
| **System** | App version, cache management, data export |

---

## 2. Managing Departments

1. Go to **Settings → Departments**
2. Click **+ Add Department** to create a new one
3. Enter the department name (e.g., "Gold Section", "Billing", "Security")
4. To edit, click the department name; to archive, click the **⋮** menu → **Archive**

**Default departments** (created during setup): Melting, Designing, Manufacturing, Stone Setting, Polishing, Quality Check, Billing, Security.

---

## 3. Managing Users

1. Go to **Settings → Users**
2. Click **+ Add User** to invite a new staff member
3. Fill in:
   - **Name** and **Email**
   - **Role**: Owner, Manager, Craftsman, Billing, or Security
   - **Department**: Assign to one or more departments
   - **PIN**: Set a 4-digit PIN for quick login
4. To deactivate a user, click **⋮** → **Deactivate**

### Roles & Permissions

| Role | Can do |
|------|--------|
| **Owner** | Everything — full access to all settings and data |
| **Manager** | Assign tasks, approve, view reports, manage department |
| **Craftsman** | View assigned tasks, submit proofs, update status |
| **Billing** | Access billing-related tasks and reports |
| **Security** | View security tasks, gate-related operations |

---

## 4. Configuring AI & Voice Features

### AI Settings (Settings → AI)
- **Enable AI Alerts**: Toggle automatic AI-generated alerts on/off
- **Gemini API Key**: Enter your Google Gemini API key for AI features
- **Alert Frequency**: How often AI analyzes tasks (hourly, daily)
- **Alert Types**: Choose which alert categories to enable (overdue, workload, suggestions)

### Voice Settings (Settings → Voice)
- **Input Language**: English, Malayalam, or auto-detect
- **Output Language**: Language for TTS readback
- **Voice Speed**: Adjust speech rate for readback
- **Auto-listen**: Automatically read new task assignments aloud

---

## 5. Setting Up Holidays

1. Go to **Settings → Holidays**
2. Click **+ Add Holiday**
3. Enter the date, name (e.g., "Onam", "Christmas"), and whether it's a full or half day
4. Holidays are shown on the calendar view and affect task scheduling
5. Recurring annual holidays can be set to repeat each year

---

## 6. Routine & Template Management

### Templates
- Go to **Templates** in the sidebar
- Click **+ New Template** to create a reusable task blueprint
- Set default values for title, description, timing, department, and assignee
- **Template Chains**: Link multiple templates into a sequence — completing one automatically creates the next

### Routines
- Go to **Routines** in the sidebar
- Click **+ New Routine** to set up a recurring task
- Choose the template, frequency (daily, weekly, monthly, custom cron), and time
- Enable/disable routines as needed — disabled routines won't create tasks

---

## 7. Understanding the Dashboard

The **Home** dashboard shows at a glance:

- **Stats Cards**: Total tasks, completed today, pending, overdue
- **Charts**: Task completion trends, department workload distribution
- **Recent Activity**: Latest task updates across the shop
- **Pinned Note**: An editable note visible to all staff (owner-only editing)

### Senior Mode
- Toggle **Senior Mode** for a simplified, large-text dashboard
- Designed for senior staff who prefer bigger fonts and simpler navigation
- Available from the profile menu or Settings → System

---

## 8. TV Mode / Control Room Display

TV Mode turns any screen into a live operational dashboard for the shop floor.

### Setup
1. Open Majestic Ops on the TV/display computer
2. Navigate to **Live Board** from the sidebar
3. The display shows:
   - Live task board with real-time updates
   - Staff availability status
   - Current date and time
   - Announcements
4. The display auto-rotates through views every 10 seconds
5. Uses the dark theme automatically for better visibility on large screens

### Tips
- Use a dedicated browser in full-screen mode (F11)
- The TV display does not require interaction — it updates automatically
- Set the display computer to never sleep
- Bookmark the Live Board URL for quick access after restarts
