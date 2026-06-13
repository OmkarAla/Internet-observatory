# Internet Observatory — Project Brief

## What This Project Is

A hands-on learning laboratory for developing systems engineering intuition.

Not a production SaaS. Not a portfolio piece. A place to struggle with real engineering problems and discover fundamental principles through building, breaking, and debugging.

## The Real Goal

Build the ability to answer:

- Why does this system work?
- Why did it fail?
- What assumption just broke?
- What does this tradeoff cost?
- What happens at 10x scale? 100x?

Feature count doesn't matter. Understanding does.

## What We'll Learn

| Domain | Core Ideas |
|--------|-----------|
| **Networking** | DNS, TCP/UDP, HTTP, TLS, Routing, Packets |
| **Databases** | Indexes, Query Plans, Aggregation, Consistency |
| **Distributed Systems** | Queues, Workers, Event Processing, Scalability |
| **Observability** | Logging, Metrics, Tracing, Alerting |
| **System Design** | Reliability, Performance, Security, Tradeoffs |

## The Ten Phases

1. **Website Monitor** — HTTP, REST APIs, CRUD, Error Handling
2. **API Observatory** — Contracts, Validation, Retries, Circuit Breakers
3. **Real-Time Dashboard** — Polling, WebSockets, Event-Driven Systems
4. **DNS Observatory** — DNS Resolution, Recursive Queries, Caching
5. **Web Crawler** — Graph Traversal, BFS/DFS, Queues, Deduplication
6. **Background Processing** — Queues, Workers, Producer-Consumer
7. **Network Diagnostics** — TCP, UDP, ICMP, Routing, Latency
8. **Traffic Analytics** — Aggregation, Metrics, Indexes
9. **Caching** — TTL, Cache Invalidation, Stale Data Risks
10. **Scaling** — Horizontal/Vertical Scaling, Load Balancing, Bottlenecks

## Technical Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Realtime**: Socket.IO
- **Networking**: Native Node APIs
- **Deployment**: Docker, Linux (later)

## How We'll Work

Following the Systems Engineering Mentor approach:

1. **Predict** — What do you think will happen?
2. **Build simplest** — Expose the mechanics
3. **Introduce failures** — Timeouts, packet loss, high load
4. **Observe** — Gather evidence before fixing
5. **Find root cause** — Separate symptom from cause
6. **Identify broken assumption** — What did we get wrong?
7. **Generalize** — Extract the principle
8. **Discuss tradeoffs** — What does the improved design cost?

## Success Criteria

Can you explain:

- How HTTP actually works
- How DNS resolves requests
- Why TCP and UDP exist and when to use each
- Why databases need indexes
- Why queues solve certain problems
- Why caching is hard
- How distributed systems fail
- How to debug production issues

## Starting Point

Begin with Phase 1: Website Monitor.

Simple HTTP checks. Store results. Display uptime.

Let the questions emerge naturally. Let the failures teach.