# SyncEngine 🚀

[![Live Demo](https://img.shields.io/badge/Demo-Live_Preview-brightgreen.svg)](https://sync-engine-frontend.vercel.app/)
[![Go](https://img.shields.io/badge/Backend-Go_1.21+-00ADD8?logo=go)](https://golang.org/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://reactjs.org/)
[![Monaco Editor](https://img.shields.io/badge/Editor-Monaco-007ACC?logo=visualstudiocode)](https://microsoft.github.io/monaco-editor/)

SyncEngine is a highly concurrent, real-time collaborative code editor. It allows multiple users to write, edit, and execute code simultaneously in isolated rooms with sub-millisecond perceived latency.

The architecture leverages **Conflict-Free Replicated Data Types (CRDTs)** to guarantee eventual consistency without the heavy central processing overhead of Operational Transformation (OT).

---

## 🔗 Live Demo

**Experience it here:** [sync-engine-frontend.vercel.app](https://sync-engine-frontend.vercel.app/)

---

## ✨ Key Features

- **Real-Time Collaboration (CRDTs):** Custom-built Conflict-Free Replicated Data Types ensure absolute state consistency across distributed clients, even with concurrent remote edits.
- **Network-Optimized Client Buffering:** Implements a dynamic 50ms client-side debouncing and batching queue for WebSocket frames. This prevents network saturation and cloud rate-limiting during rapid typing or large copy-paste events.
- **Remote Code Execution:** Integrated with the JDoodle API to compile and run code in multiple languages (JavaScript, Python, Go, Java, C++, C) directly from the browser.
- **Live Presence & Telemetry:** Real-time remote cursor tracking, active user presence indicators, and heartbeat-driven ghost-user cleanup via Redis Pub/Sub.
- **Persistent Document State:** Periodic debounced snapshotting to MongoDB Atlas ensures code is saved efficiently without throttling the database IOPS.

---

## 🛠️ Architecture & Tech Stack

### Frontend (`/web`)
- **Framework:** React (Vite)
- **Editor Component:** Monaco Editor (VS Code Engine)
- **State & Network:** Custom React Hooks for WebSocket management (`useWebSocket.ts`) and CRDT calculations.
- **Deployment:** Vercel (`vercel.json` configured for optimal routing).

### Backend (`/cmd`, `/internal`)
- **Core Server:** Go (Golang)
- **Concurrency:** Native goroutines and channels for non-blocking message broadcasting.
- **Message Broker:** Upstash Redis (Pub/Sub) for horizontally scalable room communication.
- **Database:** MongoDB Atlas (persistent document storage).

---

## 📂 Project Structure

The repository is structured as a monorepo containing both the Go backend and the React frontend:

```text
SYNC-ENGINE/
├── cmd/
│   └── server/
│       └── main.go              # Go application entry point
├── internal/
│   ├── crdt/
│   │   └── crdt.go              # Conflict-Free Replicated Data Type math & logic
│   ├── executor/
│   │   ├── executor.go          # Interface for code execution
│   │   └── jdoodle.go           # JDoodle API adapter
│   └── websocket/
│       ├── handler.go           # HTTP to WebSocket upgrade logic
│       ├── hub.go               # Room state, Redis Pub/Sub, and Mongo auto-save
│       ├── manager.go           # Multi-room coordination
│       └── upgrader.go          # Gorilla WebSocket configuration
├── web/                         # React Frontend Application
│   ├── src/
│   │   ├── core/                # Frontend CRDT Engine implementation
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts  # Client-side buffering & batching logic
│   │   ├── types/
│   │   │   └── crdt.ts          # Shared TypeScript interfaces
│   │   ├── EditorArea.tsx       # Monaco Editor wrapper and UI
│   │   └── ...
│   ├── vercel.json              # Vercel deployment configuration
│   └── vite.config.ts           # Vite bundler configuration
├── go.mod / go.sum              # Go dependencies
└── .env                         # Environment variables (not tracked)
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Go 1.21+
- Node.js 18+
- Local or cloud instance of Redis (for Pub/Sub)
- Local or cloud instance of MongoDB (for document persistence)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/sync-engine.git
cd sync-engine
```

### 2. Backend Setup

Create a `.env` file in the root directory:

```env
PORT=8080
MONGO_URL=mongodb://127.0.0.1:27017
REDIS_URL=127.0.0.1:6379
REDIS_PASSWORD=
JDOODLE_CLIENT_ID=your_jdoodle_id
JDOODLE_CLIENT_SECRET=your_jdoodle_secret
```

Start the Go server:

```bash
go mod tidy
go run cmd/server/main.go
```

### 3. Frontend Setup

Open a new terminal and navigate to the `web` directory:

```bash
cd web
npm install
```

Create a `.env` file in the `web` directory:

```env
VITE_WS_URL=ws://localhost:8080
```

Start the Vite development server:

```bash
npm run dev
```

---

## 👨‍💻 Author

**Vijit Vishnoi**
Full-Stack & Backend Software Engineer
Focus: Go, Node.js, Microservices, and Real-Time Systems

- GitHub: [github.com/vijit-vishnoi](https://github.com/vijit-vishnoi)
