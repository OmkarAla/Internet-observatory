# Quiz: Phase 1 & 2 Concepts

> Instructions: Answer each question below. Write your answer under the `**Your Answer:**` line. I'll add my feedback under `**Feedback:**` after you submit.

---

## Q1. Retry Logic

You have an API with `retries: 3` and `baseDelay: 1000`. The API fails every time. What is the **total time spent waiting** (not counting request time)?

*Hint: Think about the formula `delay = baseDelay * 2^attempt` for attempt 0, 1, 2.*

**Your Answer:**
hmm, that would be a total of 7000ms.

**Feedback:** ✅ Correct. The math:
- Attempt 0: 1000 × 2⁰ = 1000ms
- Attempt 1: 1000 × 2¹ = 2000ms
- Attempt 2: 1000 × 2² = 4000ms
- Total: 7000ms

One nuance you didn't mention: with jitter, the actual wait would be 7000ms + random 0-50% per attempt. So realistically 7000-10500ms. Jitter makes the exact time unpredictable — and that's the point.

---

## Q2. Circuit Breaker States

Your circuit breaker has `failureThreshold: 5` and `timeout: 60000`. Walk me through exactly what happens in this sequence:

1. API fails 4 times
2. 5 minutes pass
3. API fails 1 more time
4. What is the circuit state? Why?

**Your Answer:**
circuit open -> test the api health -> fail -> retry
             -> fail -> retry
             -> fail -> retry
             -> fail -> retry
             -> failure threshold reached
             -> half_open
             -> timeout for certain time
             -> test again 
             -> fail -> retry after backoff time
             -> pass -> open

so, if the api fails again, the circuit will be half_open

**Feedback:** ❌ Incorrect — you described a different flow than what the question asked.

The question was specific: 4 failures → 5 minutes pass → 1 more failure. Let me trace it:

1. **4 failures:** `failureCount = 4`, state = `CLOSED` (4 < 5 threshold, circuit doesn't trip)
2. **5 minutes pass:** `monitoringWindow = 300000ms`. The check is `(now - lastFailureTime) > monitoringWindow`. Since it's exactly 5 minutes, and the condition uses `>` (not `>=`), the count does NOT reset.
3. **5th failure:** `failureCount = 5`, which equals `failureThreshold` → state changes to `OPEN`

**Final answer: OPEN.**

The key insight you missed: the monitoring window resets failures ONLY if more than 5 minutes have passed since the last failure. Exactly 5 minutes doesn't trigger the reset (because `>` not `>=`).

Also: when the circuit is OPEN and the timeout (60s) expires, it goes to HALF_OPEN, not back to CLOSED. HALF_OPEN allows ONE request through. If it fails, back to OPEN. If it succeeds 3 times, then CLOSED.

---

## Q3. Jitter

Two servers are monitoring the same API. Both fail at exactly the same time. **Without jitter**, what happens? **With jitter**, what changes?

**Your Answer:**
so, here's the thing without jitter:
server A -> retry at 1s, 2s, 4s, ... 
server B -> retry at 1s, 2s, 4s, ...
this blocks the requests and adds unnecessary load

if there's jitter:
server A -> retry at 1.2s, 2.6s, 4.1s, ...
server B -> retry at 0.9s, 1.7s, 3.8s, ....
this allows the api's to breathe for a bit

**Feedback:** ✅ Correct. You nailed the core concept.

Minor refinement: "blocks the requests" isn't quite right. The requests aren't blocked — they're synchronized. Both servers hit the API at the exact same moments, creating instantaneous load spikes. With jitter, the load is distributed over time.

Think of it like two people knocking on a door at the same time vs. taking turns. Neither is "blocked" — but synchronized knocking is louder.

---

## Q4. Thundering Herd

1000 users are all monitoring the same API. The API goes down for 30 seconds, then recovers. Describe the difference in behavior **with and without jitter**.

**Your Answer:**
with jitter: the api's would be allowed to have a bit of breathing room, before catching up with the huge number of requests
without jitter: the api's would just be deadlocked with the number of retries.

**Feedback:** ⚠️ Partially correct, but missing the key detail.

You're right about the outcome, but you didn't describe WHAT HAPPENS. Let me paint the picture:

**Without jitter (1000 users):**
- API goes down at t=0
- All 1000 users fail at t=0
- All 1000 retry at exactly t=1s → 1000 simultaneous requests → spike
- All 1000 fail again
- All 1000 retry at exactly t=2s → another spike
- Pattern continues: t=4s, t=8s, t=16s...
- API recovers at t=30s
- All 1000 retry at t=32s → **massive spike** that may crash the just-recovered API

**With jitter (1000 users):**
- API goes down at t=0
- All 1000 fail at t=0
- Retries spread: User 1 at t=0.8s, User 2 at t=1.2s, User 3 at t=0.5s...
- Load is distributed: maybe 100 requests per second instead of 1000 at once
- API recovers at t=30s
- Recovering requests are already spread out → gentle ramp-up

The word you used — "deadlocked" — is wrong. Deadlock means nothing can proceed. Here, everything proceeds but at the wrong time. The correct term is **thundering herd** or **synchronized retry storm**.

---

## Q5. Response Validation

Your monitor checks `https://api.example.com/users` and gets:

```
HTTP/1.1 200 OK
Content-Type: application/json

[{"name": "Alice"}, {"name": Bob}]
```

*(Note: missing closing bracket and quote on "Bob")*

What does your validation logic report? Is this the correct behavior?

**Your Answer:**
no, this is a invalid json, so it would be reported as an error

**Feedback:** ✅ Correct.

But let's be precise about WHY. Your validation logic does:

1. Check `response.status === 200` → ✅ True
2. Check `response.headers['content-type'].includes('application/json')` → ✅ True
3. Try `JSON.parse(response.data)` → ❌ Throws SyntaxError
4. `jsonValid = false`
5. `success = statusMatch && jsonValid` → `true && false` = **false**

So the check is marked as DOWN (or ERROR), even though the server returned 200 OK.

**The principle:** HTTP status codes describe the transport layer. They don't validate the payload. A 200 with broken JSON is not success — your application can't use that data.

This is why we validate what we consume, not just what the server declares.

---

## Q6. State Management

You have `fetchWebsites` and `fetchApis` both running on mount. `fetchWebsites` succeeds, `fetchApis` fails. With your current code (split error states), what does the UI show?

**Your Answer:**
the ui would show both the websites and the apis, with the error message for the apis, and the success message for the websites

**Feedback:** ⚠️ Partially correct.

What you got right:
- ✅ Websites would display (fetch succeeded)
- ✅ Error message for APIs would show

What you got wrong:
- ❌ "success message for the websites" — there's no success message. The websites just display. Success is silent.
- ❌ You didn't mention loading state. Both `fetchWebsites` and `fetchApis` have `finally { setLoading(false) }`. So loading finishes for both.

The actual UI state:
```
┌─────────────────────────────────────┐
│ Internet Observatory                │
├─────────────────────────────────────┤
│ [Add Website form]                  │
│ [Add API form]                      │
├─────────────────────────────────────┤
│ Monitored Websites                  │
│ - Google (https://google.com)       │  ← displays normally
├─────────────────────────────────────┤
│ Monitored APIs                      │
│ ⚠️ Failed to fetch APIs             │  ← error banner
│ No APIs monitored yet.              │  ← empty state (apis array is empty)
└─────────────────────────────────────┘
```

Key insight: `apis` array is empty because the fetch failed, so `ApiList` shows "No APIs monitored yet." The error banner tells you WHY.

---

## Q7. Scale

If you had 10,000 monitored APIs, each checked every 5 minutes, how many check results would be written to MongoDB **per day**? What problem does this create?

**Your Answer:**
well, the main problem this would create is the data scarcity, so as to avoid, we should keep an array or a dictionary of each api.
so that it just updates the array or dict instead of writing each update as a text result.

**Feedback:** ❌ Incorrect — you identified the wrong problem and proposed a solution to a different issue.

**The math you missed:**
- 10,000 APIs × (24 hours × 60 minutes / 5 minutes per check)
- = 10,000 × 288 checks per day
- = **2,880,000 check results per day**

**The actual problem:** Data **flooding**, not data scarcity. MongoDB would accumulate ~3 million documents per day. After 30 days: ~86 million documents. Queries slow down. Storage grows. Backups become huge.

**The solution you proposed** (keeping an array/dict and updating) is actually called **aggregation** or **rollup** — and it's the RIGHT solution to the WRONG problem. You'd want to:
- Keep last 100 checks per API (rolling window)
- Aggregate hourly/daily summaries
- Delete old raw data

But the problem isn't scarcity — it's abundance. You were close, but flipped the problem.

**What you should have said:** "2.88 million documents per day. MongoDB would slow down. We need to aggregate or prune old data."

---

## Q8. Assumption Breaking

Your circuit breaker uses an in-memory `Map`. The server crashes and restarts. A user clicks "Check Now" on an API that was **OPEN** before the crash. What happens? Why is this a problem?

**Your Answer:**
now, this is where it gets interesting. the server crashes and restarts, so the circuit breaker's in-memory map is lost.
so, when a user clicks "Check Now" on an API that was **OPEN** before the crash, the circuit breaker would treat it as a new API and check it.
as a result, the circuit breaker would allow the request, even though the API was **OPEN** before the crash.
this is a problem because it violates the purpose of the circuit breaker, which is to prevent the API from being overwhelmed with requests.

**Feedback:** ✅ Correct. Excellent reasoning.

You nailed all three parts:
1. ✅ In-memory Map is lost on restart
2. ✅ Circuit breaker treats it as a new API (failureCount = 0, state = CLOSED)
3. ✅ Request goes through, violating the circuit breaker's purpose

**The deeper lesson:** This is a **broken assumption** — we assumed the server would never crash. In production, servers crash all the time (deployments, OOM kills, hardware failures). 

**The fix:** Persist circuit breaker state to Redis. On restart, load from Redis instead of starting fresh. Cost: network latency (~0.5ms) + Redis dependency. Benefit: state survives restarts.

You've demonstrated good debugging intuition — you traced the failure from symptom (request goes through) to root cause (in-memory state lost) to broken assumption (server won't crash).

---

## Score Summary

| Question | Topic | Score |
|----------|-------|-------|
| Q1 | Retry Logic | ✅ Correct |
| Q2 | Circuit Breaker States | ❌ Incorrect — didn't trace the specific sequence |
| Q3 | Jitter | ✅ Correct |
| Q4 | Thundering Herd | ⚠️ Partial — right outcome, missing details |
| Q5 | Response Validation | ✅ Correct |
| Q6 | State Management | ⚠️ Partial — missed empty state + loading |
| Q7 | Scale | ❌ Incorrect — wrong problem (scarcity vs flooding) |
| Q8 | Assumption Breaking | ✅ Correct — excellent reasoning |

**Overall: 4/8 correct, 2/8 partial, 2/8 incorrect**

**Strengths:** Jitter, response validation, assumption breaking, debugging intuition

**Weaknesses:** Circuit breaker state tracing, scale math, precise terminology

**Next steps:** Re-read the circuit breaker code in `server/services/circuitBreaker.js` and trace the exact flow for Q2. For Q7, practice doing mental math on system scale (requests × time = volume).

---
