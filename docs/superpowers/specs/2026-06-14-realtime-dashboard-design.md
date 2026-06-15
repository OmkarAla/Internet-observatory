# Phase 3: Real-Time Dashboard — Design Spec

> **Date:** 2026-06-14
> **Status:** Approved
> **Approach:** Server-Side Scheduling with Socket.IO

---

## Goal

Replace polling/refresh-based UI with real-time updates via WebSockets. Check results appear instantly without page refresh. Status changes trigger in-card alerts.

**Note:** UI will be built with TailwindCSS for now. Proper visual design comes after all phases are complete.

---

## Requirements

| Requirement | Decision |
|-------------|----------|
| Check triggering | Auto-check on user-configurable interval per endpoint |
| UI update | Surgical (no page refresh, only affected card re-renders) |
| Alert type | In-card banner on status change, fades after 5s |
| History updates | Live — new results appear at top of history list |
| Multi-client | Shared — all connected clients see same updates |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                      │
│  ┌─────────┐  ┌─────────┐  ┌──────────────────────┐   │
│  │Website  │  │API      │  │  Socket.IO Client    │   │
│  │List     │  │List     │  │  - subscribe to IDs  │   │
│  │         │  │         │  │  - listen for updates│   │
│  └────┬────┘  └────┬────┘  └──────────┬───────────┘   │
│       │            │                   │                │
│       └────────────┴───────────────────┘                │
│                      │                                  │
│              surgical DOM updates                       │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket (Socket.IO)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    Server (Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ REST API     │  │ Socket.IO    │  │ Timer        │  │
│  │ (CRUD)       │  │ Server       │  │ Manager      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                           │                              │
│                     ┌─────▼─────┐                        │
│                     │  MongoDB  │                        │
│                     └───────────┘                        │
└──────────────────────────────────────────────────────────┘
```

---

## Socket.IO Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `subscribe` | Client → Server | `{ id, type }` | Subscribe to website/API updates |
| `unsubscribe` | Client → Server | `{ id, type }` | Stop receiving updates |
| `check:result` | Server → Client | `{ id, type, result }` | New check result |
| `circuit:change` | Server → Client | `{ id, state }` | Circuit breaker state changed |

**Rooms:** Each endpoint gets a room: `website:64f8a...`, `api:64f8b...`

---

## Components

### 1. Socket.IO Server (`server/services/socketService.js`)

- Initializes Socket.IO with CORS config
- Handles `subscribe`/`unsubscribe` events
- Manages rooms (clients join/leave)
- Provides `broadcast(result)` function for timer manager

### 2. Timer Manager (`server/services/timerManager.js`)

- `startTimer(id, type, intervalMs, checkFn)` — creates `setInterval`
- `clearTimer(key)` — clears specific timer
- `loadTimersFromDB()` — reloads all timers on server restart
- In-memory `Map` — lost on restart, reloaded from DB

### 3. Socket.IO Client Hook (`client/src/hooks/useSocket.js`)

- `subscribe(id, type)` — joins room
- `unsubscribe(id, type)` — leaves room
- `onCheckResult(callback)` — listens for updates
- Auto-connects on mount, disconnects on unmount

### 4. Alert System (in-card component)

- Detects status change (UP→DOWN or DOWN→UP)
- Shows in-card banner (red for DOWN, green for recovery)
- Fades after 5 seconds via `setTimeout`

### 5. Auto-Check Toggle UI (in-card component)

- Checkbox: enable/disable auto-check
- Range slider: 10s to 300s (step 10s)
- PATCH endpoint updates `checkInterval` in DB

---

## Data Model Changes

### Website.js — add field

```javascript
checkInterval: {
  type: Number,
  default: null,    // null = no auto-check
  min: 10000        // minimum 10 seconds
}
```

### Api.js — add field

```javascript
checkInterval: {
  type: Number,
  default: null,
  min: 10000
}
```

### New API Endpoints

```
PATCH /api/websites/:id/interval
Body: { "checkInterval": 30000 }

PATCH /api/apis/:id/interval
Body: { "checkInterval": 60000 }
```

---

## Data Flows

### Flow 1: Enable Auto-Check

```
User toggles "Auto-check" → sets interval to 30s
    │
    ▼
PATCH /api/websites/:id/interval  →  DB updated
    │
    ▼
Socket.IO: "startTimer"  →  Server creates setInterval(30s)
    │
    ▼
Every 30s: check website → save result → broadcast to room
```

### Flow 2: Check Result at Client

```
Server broadcasts check:result to room
    │
    ▼
Client receives { id, type, result }
    │
    ├──► updateCheckResults(id, result)  →  history prepended
    │
    ├──► detectStatusChange(id, result)  →  show alert if changed
    │
    └──► React re-renders only affected card
```

### Flow 3: Server Restart

```
Server starts → loadTimersFromDB()
    │
    ▼
For each website/api with checkInterval: startTimer()
    │
    ▼
Timers running, broadcasting to empty rooms
    │
    ▼
Client connects → subscribes → receives next check result
```

---

## Tradeoffs

| Decision | Chose | Gave Up |
|----------|-------|---------|
| Server-side timers | Checks survive client disconnect | Timer state lost on server restart |
| In-memory timer Map | Speed, simplicity | Persistence (reloaded from DB) |
| 10s minimum interval | Prevents abuse | Faster monitoring |
| In-card alerts | Non-intrusive | Browser notifications (hidden tab) |
| Shared updates | No duplicate checks | Per-user isolation |

---

## Learning Objectives

By end of Phase 3, you should understand:

1. **WebSockets vs HTTP** — Why polling is wasteful, how WebSockets solve it
2. **Socket.IO rooms** — How to target specific subscribers
3. **Server-side timers** — `setInterval` in production, pitfalls
4. **Surgical DOM updates** — Why full re-renders are expensive
5. **Event-driven architecture** — Push vs pull, publish/subscribe pattern
6. **State synchronization** — Keeping multiple clients in sync
