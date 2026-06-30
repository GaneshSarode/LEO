<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# LEO - Last-minute Execution Officer

> **An aggressive, AI-powered productivity companion that helps you plan, prioritize, execute, and complete commitments before deadlines are missed.**

**Live Link:** [https://leo-hackathon-69667.web.app/](https://leo-hackathon-69667.web.app/)

## Problem Statement

**The Last-Minute Life Saver**

Students, professionals, and entrepreneurs often miss deadlines because existing productivity tools rely on passive reminders that are easy to ignore. The challenge is to build an AI-powered companion that proactively assists users in planning, prioritizing, and completing tasks before deadlines are missed.

---

# Solution Overview

**LEO** transforms traditional task management into an AI-driven execution system.

Instead of simply reminding users about upcoming deadlines, LEO continuously analyzes task complexity, available time, workload, and progress to generate actionable execution plans. The application predicts deadline risks, recommends recovery strategies, and adapts schedules dynamically to maximize the likelihood of successful completion.

The system is designed around the philosophy:

> **"Don't remind users about deadlines. Help them beat them."**

---

# Key Features

## 📑 Multimodal Syllabus Extraction
Users can upload a PDF (e.g., a university syllabus or project spec), and LEO instantly reads the document, extracting all assignments, exams, and deadlines into a structured, actionable task list powered by Google Gemini’s multimodal capabilities.

## 🧠 AI Task Planning
- AI-powered task decomposition into manageable subtasks
- Estimated completion durations
- Daily execution plans stretching continuously from wake to sleep

## ⚡ Intelligent Prioritization
- Automatic priority calculation based on time remaining
- Deadline-aware scheduling
- Dynamic reprioritization via AI context

## 🔔 Dynamic Urgency Escalation & Push Notifications
LEO continuously monitors time. Tasks escalate through color-coded urgency levels. If a task enters the “Critical Phase” (under 6 hours), LEO fires browser-level system push notifications to actively alert the user — even if the tab is in the background.

## 🗣️ Autonomous AI Daily Briefings
Instead of making the user figure out what to do, LEO’s AI analyzes the user’s workload, role, and deadlines to generate a personalized, highly actionable daily briefing with prioritized tasks and time estimates.

## 🎵 Study with Music (Spotify Integration)
LEO features a “Start Sessions” option where users can add their custom Spotify playlist links to study with uninterrupted focus directly inside the app environment.

## 👾 Dynamic Pixel-Art Motivation System
A dedicated LEO pixel-cat mascot cycles through motivational slogans dynamically to keep the user focused and visually engaged against an animated starfield background.

---

# Technologies Used

| Category | Technology / Details |
|----------|----------------------|
| **Frontend Framework** | Next.js 14 (React) |
| **Styling & UI** | Custom Vanilla CSS — Dark Mode, Animated Backgrounds, Glassmorphism |
| **State Management** | React Hooks (useState, useEffect) + Browser localStorage |
| **AI — Primary** | Google Gemini API (Gemini 1.5 Flash) |
| **AI — Secondary** | Groq API (Llama 3.1 8B) |
| **Database** | Google Firestore (Firebase) — real-time task persistence |
| **Deployment** | Firebase Hosting (Google Cloud) |

---

# Google Technologies Utilized

### 🔹 Google Gemini API
**Models used:** Gemini 1.5 Flash (Primary Engine) • Llama 3.1 8B via Groq (Fallback)

Gemini is the core multimodal brain of LEO. It is heavily utilized for the complex Syllabus-to-Task pipeline, where it parses unformatted PDF documents and returns structured JSON arrays of tasks with timestamps. Gemini also powers the Daily Briefing and Autonomous Planning features.

- **Multimodal PDF parsing:** reads and understands university syllabi, project specs, and handouts.
- **Structured JSON extraction:** converts unstructured deadline text into actionable task objects.

### 🔹 Firebase Hosting (Google Cloud)
The entire application is deployed and globally distributed using Google’s Firebase Hosting.
- **Global CDN:** assets served globally with ultra-low latency.
- **Zero-config deployment:** instant deployment to production.

### 🔹 Google Firestore
LEO uses Google Firestore as its real-time NoSQL database for task persistence, user session storage, and deadline tracking.
- **Persistent deadlines:** tasks survive browser refresh and re-login
- **Scalable storage:** no server management required

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `NEXT_PUBLIC_GEMINI_API_KEY` and `NEXT_PUBLIC_GROQ_API_KEY` in `.env.local`
3. Run the app:
   `npm run dev`

---

# Developed For

**Vibe2Ship Hackathon 2026**

Built with **Google AI Studio**, **Gemini**, and **Google Cloud**.

---

## Author

**Ganesh Ashok Sarode**
