# Phase 1: Website Monitor — Design Spec

## Overview

A simple website monitoring system that checks if URLs respond with success (2xx), stores results, and displays uptime history.

## Purpose

Learn HTTP requests, REST APIs, CRUD operations, MongoDB basics, validation, and error handling.

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│  Express    │────▶│  MongoDB    │
│   Frontend  │◀────│   Backend   │◀────│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Data Model

### Website Collection

```javascript
{
  _id: ObjectId,
  url: String,           // e.g., "https://example.com"
  name: String,          // e.g., "Example Site"
  createdAt: Date,
  updatedAt: Date
}
```

### CheckResult Collection

```javascript
{
  _id: ObjectId,
  websiteId: ObjectId,  // Reference to Website
  status: Number,        // HTTP status code (e.g., 200, 404, 500)
  success: Boolean,     // true if 2xx, false otherwise
  responseTime: Number, // milliseconds
  error: String | null, // Error message if failed
  checkedAt: Date
}
```

---

## API Endpoints

### Websites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/websites` | List all websites |
| POST | `/api/websites` | Add new website |
| DELETE | `/api/websites/:id` | Remove website |

### Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/websites/:id/checks` | Get check history for a website |
| POST | `/api/websites/:id/check` | Trigger manual check |

---

## Features

1. **Add Website** — Input URL and name, validate URL format
2. **List Websites** — Display all monitored sites with latest status
3. **Manual Check** — Button to trigger a check on demand
4. **View History** — See past check results with timestamps
5. **Basic Validation** — Reject invalid URLs before storing

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid URL | Reject with 400 error |
| Network timeout | Store as failed check, capture error message |
| DNS failure | Store as failed check, capture error message |
| Non-2xx response | Store as failed check (not "up") |
| 2xx response | Store as successful check |

**Timeout**: 10 seconds default

---

## What We'll Learn

- Making HTTP requests from Node.js
- Storing and retrieving data from MongoDB
- Building REST APIs with Express
- React component structure for listing data
- Handling different failure modes
- Basic input validation

---

## Questions for Later Phases

- What happens when checks never return? (→ timeouts)
- How should failures be handled? (→ retry logic, circuit breakers)
- How do we check multiple sites automatically? (→ scheduled jobs)

These questions emerge naturally and will be addressed in later phases.