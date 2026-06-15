# Quiz: Phase 4 — DNS Observatory

> This quiz is rebuilt after each phase. It tests the real concepts.
> Answer each question. Write your answer under `**Your Answer:**`.
> I'll add feedback under `**Feedback:**`.

---

## Q1. Resolution Chain

Your DNS Observatory resolves `github.com`. Walk through the full resolution chain. What happens at each step?

**Your Answer:**
welp, query-> root servers -> '.com' tld server -> authoritative server -> response

**Feedback:** ✅ Correct. The chain is right.

One refinement: you said "root servers" but the first step is actually your computer asking a **recursive resolver** (your ISP's DNS) which then does the iterative queries. So the full chain is:

```
Your computer → Recursive Resolver (ISP) → Root → TLD (.com) → Authoritative → IP
```

Your recursive resolver does the heavy lifting. It asks root, gets referred to TLD, gets referred to authoritative, gets the answer, and returns it to you. The "query" at the start is your computer asking the recursive resolver — that's the only recursive step. Everything after that is iterative.

---

## Q2. Record Types

You need to set up email for `example.com`. Which DNS record type do you create? What does the "10" mean in `10 mail.example.com`?

**Your Answer:**
we'd create an MX record. this record is the email address of the domain. the 10 in the MX is a number which tells us the priority of the emails. lower the number - higher the priority

**Feedback:** ✅ Correct on both parts.

Minor refinement: MX record isn't the "email address of the domain" — it's the **mail server** that handles email for the domain. The MX record points to a hostname (e.g., `mail.example.com`), and that server has its own A record with the IP.

Also: "lower the number - higher the priority" is exactly right. Think of it like a numbered to-do list: #10 gets done before #20.

---

## Q3. Promise.allSettled vs Promise.all

You're querying 3 DNS resolvers. Google responds in 50ms. Cloudflare times out after 5s. Quad9 responds in 30ms.

What happens with `Promise.all`? What happens with `Promise.allSettled`? Which one does the DoH client use and why?

**Your Answer:**
with promise.all, even if one of the 3 dns resolvers fail, all three would be considered as failed.
but with promise.allsettled, even if one of the 3 dns resolvers fail, we can show them as partial lookup success.

**Feedback:** ✅ Correct. You nailed the core difference.

To be precise about the scenario:

- **Promise.all:** Google (50ms) and Quad9 (30ms) respond successfully. Cloudflare times out after 5s. `Promise.all` waits for all 3. When Cloudflare rejects at 5s, the entire thing throws. The results from Google and Quad9 are **lost** — even though they succeeded.

- **Promise.allSettled:** Same scenario. All 3 complete. Google: `{status: 'fulfilled'}`, Cloudflare: `{status: 'rejected', reason: Timeout}`, Quad9: `{status: 'fulfilled'}`. You get partial results.

The DoH client uses `Promise.allSettled` because showing partial results (2 out of 3 resolvers working) is better than showing nothing.

You didn't mention "which one does the DoH client use" explicitly, but your answer implies it. The key insight is correct: fault tolerance over all-or-nothing.

---

## Q4. Cache Key Mutation

The caching code has:

```javascript
const getCacheKey = (domain, types) => `${domain}:${types.sort().join(',')}`;
```

Someone calls `resolveDomain('google.com', ['MX', 'A', 'NS'])`. What problem occurs? How do you fix it?

**Your Answer:**
well, when we use types.sort() here, it mutates the array rather than just sorting it, so now the request and the caller arrays become the same and the order where the caller must be used is different. this causes errors.
so to fix it, we create a copy of the array first and then we change it.
the best way to do it is to use a spread operator, for example: [...types].sort(), this creates a copy of the array first and then changes it.

**Feedback:** ✅ Correct. Excellent explanation.

You identified all three parts:
1. ✅ `.sort()` mutates the original array
2. ✅ This causes side effects for the caller
3. ✅ The fix is `[...types].sort()` — spread creates a copy

The deeper lesson: **never call `.sort()`, `.reverse()`, or `.splice()` on data you don't own.** These are all mutating methods. Always copy first.

This is a common source of bugs in JavaScript because the mutation is silent — no error, no warning. The array just silently changes under you.

---

## Q5. DoH vs Raw UDP

What's the difference between DNS-over-HTTPS (DoH) and traditional UDP DNS? Why did we choose DoH for this project?

**Your Answer:**
DoH is a very efficient way of handling dns lookup, the request is in the form of web-friendly dns, and the response is in the form of json-friendly http.
however, a traditional udp dns is unencrpted and can be attacked easily.
we chose DoH for this project cos, it works everywhere, easy json format.

**Feedback:** ⚠️ Partially correct — you got the right idea but missed the key details.

What you got right:
- ✅ DoH uses JSON format (easy to parse)
- ✅ UDP DNS is unencrypted
- ✅ We chose DoH for portability

What you missed:
- **Encrypted** — DoH uses HTTPS, so queries are encrypted. UDP DNS is plaintext.
- **Firewall-friendly** — Many networks block UDP port 53 but allow HTTPS (port 443). DoH works through firewalls.
- **Authenticated** — TLS verifies the server's identity. UDP DNS can be spoofed (attacker can forge responses).
- **"Web-friendly"** — DoH isn't really "web-friendly DNS" — it's DNS tunneled through HTTPS. The key insight is that it leverages existing HTTPS infrastructure.

Also: DoH isn't necessarily faster than UDP. It has more overhead (TLS handshake + HTTP headers). We chose it for **security and compatibility**, not speed.

---

## Q6. Error Handling — Promise.allSettled

A subagent wrote this code:

```javascript
const results = await Promise.allSettled(resolverPromises);
results.forEach((result) => {
  if (result.status === 'fulfilled') {
    queries[result.value.key] = result.value;
  } else {
    queries[result.reason.key] = { error: 'failed' };
  }
});
```

There's a critical bug. What is it and how do you fix it?

**Your Answer:**
[no answer provided]

**Feedback:** ❌ Incorrect — you skipped this one. Let me explain.

The critical bug is on this line:

```javascript
queries[result.reason.key] = { error: 'failed' };
```

**The problem:** `result.reason` is the error object thrown by the rejected promise. It doesn't have a `.key` property. So `result.reason.key` is `undefined`. The error gets stored under `undefined` as the key — not under the resolver name (e.g., "google", "cloudflare").

**The fix:** Capture the key in a `.catch()` handler before the promise rejects:

```javascript
const resolverPromises = resolverKeys.map((key) =>
  querySingleResolver(key, domain, types)
    .then((result) => ({ key, ...result, responseTime: Date.now() - startTime }))
    .catch((error) => ({ key, records: {}, responseTime: Date.now() - startTime, error: 'Resolver failed' }))
);
```

Now `.catch()` converts the rejection into a fulfilled value with the key captured. You can use `Promise.all` instead of `Promise.allSettled` because `.catch()` prevents any rejections.

This is the exact bug we found during code review in Task 1.

## Q7. NXDOMAIN

User types `thisdoesnotexist12345.invalid` into the DNS Observatory. The DoH API returns `Status: 3`. What does this mean? How should the UI display it?

**Your Answer:**
status 3 means the dns record is an NX type record. NX type record means that the domain doesn't exist.

**Feedback:** ⚠️ Partially correct — the meaning is right, but the terminology is off.

You got right:
- ✅ Status 3 means the domain doesn't exist
- ✅ It's called NXDOMAIN

What's imprecise:
- It's not an "NX type record" — it's an **NXDOMAIN response** (Non-Existent Domain). There's no such thing as an "NX type record." NXDOMAIN is a **response code**, not a record type.

The DNS response codes (RCODEs) are:
| Code | Meaning |
|------|---------|
| 0 | No error (SUCCESS) |
| 1 | Format error |
| 2 | Server failure |
| 3 | **NXDOMAIN** — domain doesn't exist |
| 4 | Not implemented |
| 5 | Query refused |

**How the UI should display it:** Show a clear error like "Domain not found" or "This domain does not exist." Don't show empty records — the user needs to know the domain is invalid, not that there are no records.

---

## Q8. TTL (Time To Live)

A DNS record for `google.com` has `TTL: 300`. What does this number mean? Why do DNS records have TTLs?

**Your Answer:**
[no answer provided]

**Feedback:** ❌ Incorrect — you skipped this one. Let me explain.

**TTL = Time To Live**, measured in seconds.

`TTL: 300` means "this record is valid for 300 seconds (5 minutes)." After 5 minutes, the cached copy is stale and must be re-fetched from the authoritative server.

**Why TTLs exist:**

1. **Reduce load on authoritative servers** — Without TTL, every DNS query would hit the authoritative server. With TTL:300, recursive resolvers cache the answer for 5 minutes and serve it from cache.

2. **Balance freshness vs performance** — Short TTL (60s) = more frequent updates, more load. Long TTL (86400s = 24h) = less load, but stale if record changes.

3. **Propagation control** — When you change a DNS record, the old value stays cached until TTL expires. Low TTL = faster propagation of changes.

**Example:** If Google changes their IP and TTL is 300s, it takes up to 5 minutes for the change to propagate worldwide. If TTL were 86400s (24 hours), it would take up to 24 hours.

**What our caching code does:** We cache DoH results for 30 seconds. This is separate from DNS TTL — our cache is an application-level optimization, not a DNS cache. The DoH resolver already caches based on DNS TTL.

---

## Q9. Caching Strategy

The DoH client caches results for 30 seconds. What problem does this solve? What's the tradeoff?

**Your Answer:**
it solves the problem of continous lookup, but the tradeoff is that it takes up memory and the cache implementation is a bit complex.

**Feedback:** ⚠️ Partially correct — you identified the benefit but missed the most important tradeoff.

What you got right:
- ✅ Prevents continuous/redundant lookups
- ✅ Takes up memory

What you missed:
- **Stale data** — The biggest tradeoff. If you resolve `google.com`, cache it for 30s, and Google changes their IP during that window, you serve the old IP for up to 30 seconds. In practice this is fine (DNS TTL is usually longer than 30s), but it's the fundamental tradeoff of any cache.

- **Why 30 seconds?** — It's arbitrary but reasonable. Too short (1s) = cache is useless. Too long (300s) = stale data. 30s balances "avoid hammering resolvers" with "fresh enough results."

- **The implementation isn't actually complex** — It's a Map with TTL check. The real complexity is cache invalidation (which we don't do — we just wait for TTL expiry). In production, you'd want cache eviction policies (LRU, max size).

**Better answer:** "It prevents redundant network calls to 3 resolvers. The tradeoff is stale data for up to 30 seconds and memory usage."

---

## Q10. MX Record Priority

Two MX records exist for `example.com`:

```
10 mail1.example.com
20 mail2.example.com
```

Which server receives email first? What happens if mail1.example.com is down?

**Your Answer:**
mail1.example recieves email first, because for an mx record, lower the number, higher the priority.
now, if mail1.example is down, we simply can mail to the next priority email which is mail2.example

**Feedback:** ✅ Correct. Both parts right.

You nailed:
- ✅ mail1 receives first (lower number = higher priority)
- ✅ Failover to mail2 if mail1 is down

Minor terminology: "mail to the next priority email" → should be "send to the next priority **mail server**." MX records point to servers, not email addresses.

Also worth knowing: The sending server retries the lower-priority server multiple times before giving up. It doesn't just try once and fail. There's a retry mechanism built into SMTP.

**The broader pattern:** MX priority is a simple form of **load balancing with failover**. It's not round-robin (alternating between servers) — it's primary/backup. This is the same pattern as circuit breakers: if the primary fails, fall back to the secondary.

---

## Score Summary

| Q | Topic | Result |
|---|-------|--------|
| Q1 | Resolution Chain | ✅ Correct |
| Q2 | Record Types | ✅ Correct |
| Q3 | Promise.allSettled | ✅ Correct |
| Q4 | Cache Mutation | ✅ Excellent |
| Q5 | DoH vs UDP | ⚠️ Partial — missed encryption/firewall/auth |
| Q6 | Critical Bug | ❌ Skipped |
| Q7 | NXDOMAIN | ⚠️ Partial — wrong terminology |
| Q8 | TTL | ❌ Skipped |
| Q9 | Caching Tradeoff | ⚠️ Partial — missed stale data |
| Q10 | MX Priority | ✅ Correct |

**Overall: 5/10 correct, 3/10 partial, 2/10 skipped**

**Strengths:** DNS chain, MX priority, Promise.allSettled, cache mutation, record types

**Weaknesses:** DoH security benefits, TTL concept, critical bug identification, caching tradeoffs

**Next steps:** Re-read explain.md sections 5 (DoH vs UDP), 8 (TTL), and 6 (Cache). The skipped questions (Q6, Q8) are the ones you need most — they test fundamental concepts.