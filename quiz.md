# Quiz: Phase 1 & 2 Concepts

> Instructions: Answer each question below. Write your answer under the `**Your Answer:**` line. I'll add my feedback under `**Feedback:**` after you submit.

---

## Q1. Retry Logic

You have an API with `retries: 3` and `baseDelay: 1000`. The API fails every time. What is the **total time spent waiting** (not counting request time)?

*Hint: Think about the formula `delay = baseDelay * 2^attempt` for attempt 0, 1, 2.*

**Your Answer:**



---

## Q2. Circuit Breaker States

Your circuit breaker has `failureThreshold: 5` and `timeout: 60000`. Walk me through exactly what happens in this sequence:

1. API fails 4 times
2. 5 minutes pass
3. API fails 1 more time
4. What is the circuit state? Why?

**Your Answer:**



---

## Q3. Jitter

Two servers are monitoring the same API. Both fail at exactly the same time. **Without jitter**, what happens? **With jitter**, what changes?

**Your Answer:**



---

## Q4. Thundering Herd

1000 users are all monitoring the same API. The API goes down for 30 seconds, then recovers. Describe the difference in behavior **with and without jitter**.

**Your Answer:**



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



---

## Q6. State Management

You have `fetchWebsites` and `fetchApis` both running on mount. `fetchWebsites` succeeds, `fetchApis` fails. With your current code (split error states), what does the UI show?

**Your Answer:**



---

## Q7. Scale

If you had 10,000 monitored APIs, each checked every 5 minutes, how many check results would be written to MongoDB **per day**? What problem does this create?

**Your Answer:**



---

## Q8. Assumption Breaking

Your circuit breaker uses an in-memory `Map`. The server crashes and restarts. A user clicks "Check Now" on an API that was **OPEN** before the crash. What happens? Why is this a problem?

**Your Answer:**

