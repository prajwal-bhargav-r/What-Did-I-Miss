# What Did I Miss? — Intelligent Chat Catch-Up Assistant

A privacy-first, local-processing AI micro-application designed to help users catch up on long, unread group chats (WhatsApp exports, academic groups, engineering teams, and event logistics channels) in minutes.

---

## 1. Setup, Installation & Build Instructions

### Prerequisites
- **Node.js** 18+ and **npm**

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
The application runs on `http://localhost:3000`.

### Type-Check & Lint
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

---

## 2. Core Features Implemented

1. **Multi-Format Chat Import (`src/services/chatParser.ts`)**:
   - Import `.txt`, `.log`, or `.md` chat exports via drag-and-drop or file selection (supports uploading multiple conversation files simultaneously).
   - Paste copied messages directly into the analyzer.
   - Automatically detects date ordering (`MDY`, `DMY`, `YMD`), handles WhatsApp iOS/Android timestamps, bracketed timestamps, time-only messages, missing timestamps, multiline messages, emojis, `<Media omitted>` placeholders, and system events.
   - Identifies duplicate/repeated messages without losing chronological history.

2. **Grounded Multi-Length Conversation Summary (`src/services/localAiEngine.ts`)**:
   - Switch instantaneously between **Very Short**, **Standard**, and **Detailed** summaries.
   - Clusters **Main Topics Discussed**, extracts **Important Announcements**, records **Significant Decisions**, and detects **Unanswered Questions** where subsequent messages did not resolve an inquiry.

3. **Contextual Priority & Urgency Detection**:
   - Classifies every message into **High Priority**, **Medium Priority**, or **Low Priority** with an explicit explanation (`Why marked important`).
   - Filters out jokes, sarcasm, and hypothetical statements (`"Haha imagine if the midterm was tomorrow at 6am lol jk"`) so they are never promoted to false deadlines or tasks.
   - Preserves 100% of original messages for inspection in the **All Messages** transcript.

4. **Action Items & Missed Tasks**:
   - Extracts tasks, assignees (`Explicit`, `Self-assigned`, or `Uncertain / Not specified`), deadlines, priority levels, and links to the exact supporting message and timestamp.
   - Supports marking tasks as **Completed**, **Pending**, or **Saved for Later**.

5. **Deadline, Date & Event Detection**:
   - Chronological event timeline distinguishing **Explicitly Stated Dates**, **Relative Dates Resolved from Message Timestamps** (e.g., `"tomorrow by 11:59 PM"` anchored to message date `Oct 12, 2026 → Oct 13, 2026`), and **Ambiguous Dates** (e.g., `"next Friday"` or `"Monday or Tuesday"`, or relative expressions on messages lacking a calendar date), prompting the user to confirm the exact date.

6. **Personal Mentions (“Important for You”)**:
   - Configurable user profile for **Your Name**, **Nicknames/@Handles**, and **Followed Keywords/Topics**.
   - Surfaces direct mentions, tasks assigned to you, questions directed at you, replies to your messages, and followed topic updates without assuming any chat participant is you by default.

7. **Grounded “Ask AI” Conversation Q&A**:
   - Answers natural-language questions strictly grounded in the imported conversation, citing the exact message numbers (`#N`), senders, and timestamps with 1-click source verification.

8. **Privacy-First Local Architecture (`src/services/storageService.ts`)**:
   - Zero external API calls or cloud uploads.
   - Optional local persistence using browser **IndexedDB** (`WhatDidIMissLocalDB`), session-only RAM mode toggle, and 1-click **Delete All Conversations & Local Data**.
