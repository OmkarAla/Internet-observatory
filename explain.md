# Phase 4: DNS Observatory — Concepts Explained

> Before taking the quiz, read through these explanations. Each one covers the "why" behind the code, not just the "what."

---

## 1. DNS Resolution Chain

When you type `google.com` into your browser, your computer doesn't know the IP address. It has to ask DNS servers — but not just one. It asks a chain of servers, each one passing it closer to the answer.

```
Your computer ──▶ Root Server ──▶ TLD Server ──▶ Authoritative Server ──▶ IP Address
```

### Root Servers (13 clusters worldwide)

The root servers don't know `google.com`. But they know who manages `.com` domains. They say: "I don't know `google.com`, but ask the `.com` TLD server at this address."

### TLD Server (.com, .org, .net, etc.)

The TLD server doesn't know `google.com` either. But it knows who manages `google.com` — the authoritative nameservers. It says: "Ask `ns1.google.com`."

### Authoritative Server

The authoritative server knows the answer. It responds: "`google.com` is `142.250.80.46`."

### Iterative vs Recursive

- **Iterative** (what our tool does): Each server referrals to the next. The client does the work of following the chain.
- **Recursive** (what your ISP's resolver does): You ask one server to do all the work. It goes root → TLD → authoritative → returns the answer to you.

Our DNS Observatory uses DoH (DNS-over-HTTPS) to query public resolvers, which internally do recursive resolution. We see the results of the full chain.

---

## 2. DNS Record Types

Each record type answers a different question about a domain:

| Type | Question it answers | Example |
|------|-------------------|---------|
| **A** | "What's the IPv4 address?" | `google.com → 142.250.80.46` |
| **AAAA** | "What's the IPv6 address?" | `google.com → 2607:f8b0:4004:800::200e` |
| **MX** | "Where do I send email?" | `10 mail1.google.com` |
| **NS** | "Who's the authoritative nameserver?" | `ns1.google.com` |
| **CNAME** | "What's the alias?" | `www.google.com → google.com` |
| **TXT** | "Any text info?" | `"v=spf1 include:_spf.google.com..."` |
| **SOA** | "Zone metadata?" | Serial, refresh, retry, expire |

### MX Priority

The "10" in `10 mail1.example.com` is the **priority**. Lower number = higher priority.

```
10 mail1.example.com   ← tried first
20 mail2.example.com   ← tried if mail1 is down
```

This is a simple failover system. If the primary mail server (priority 10) is unreachable, the sending server tries the next one (priority 20).

---

## 3. Promise.allSettled vs Promise.all

This is one of the most important distinctions in async JavaScript.

### Promise.all — All or nothing

```javascript
const results = await Promise.all([googleQuery, cloudflareQuery, quad9Query]);
```

If ANY promise rejects, the entire thing throws. The results from the other promises are lost.

**Analogy:** You order from 3 restaurants. If one cancels, you get nothing from any of them.

### Promise.allSettled — Everyone completes

```javascript
const results = await Promise.allSettled([googleQuery, cloudflareQuery, quad9Query]);
```

Every promise completes regardless of success or failure. Each result has a `status`:

```javascript
[
  { status: 'fulfilled', value: { key: 'google', records: {...} } },
  { status: 'rejected', reason: Error('Timeout') },
  { status: 'fulfilled', value: { key: 'quad9', records: {...} } }
]
```

**Analogy:** You order from 3 restaurants. Even if one cancels, you still get food from the other two.

### Why we chose Promise.allSettled

If Google's DNS is down but Cloudflare and Quad9 work, we still want to show partial results. The user sees: "Google: timeout" alongside working results from the other two. `Promise.all` would throw everything away.

---

## 4. Cache Key Mutation Bug

This is a subtle JavaScript gotcha that bit us during code review.

### The Problem

```javascript
const getCacheKey = (domain, types) => `${domain}:${types.sort().join(',')}`;
```

`Array.sort()` **mutates the original array**. It doesn't create a new array — it sorts in place.

### What happens

```javascript
resolveDomain('google.com', ['MX', 'A', 'NS']);
// Inside getCacheKey: types.sort() mutates the input array
// The original array is now ['A', 'MX', 'NS']
// The caller's array is also now ['A', 'MX', 'NS']
```

This is a side effect. The function modifies data it doesn't own. If the caller reuses that array, they get unexpected sorted order.

### The Fix

```javascript
const getCacheKey = (domain, types) => `${domain}:${[...types].sort().join(',')}`;
```

`[...types]` creates a copy of the array before sorting. The original stays untouched.

**General rule:** Never call `.sort()`, `.reverse()`, or `.splice()` on an array you don't own. Always copy first.

---

## 5. DNS-over-HTTPS (DoH) vs Raw UDP

### Traditional DNS (UDP port 53)

Your computer sends a small UDP packet to port 53 with the domain name. The DNS server responds with a UDP packet containing the IP.

- **Fast** — minimal overhead
- **Unencrypted** — anyone on the network can see what domains you query
- **Easily spoofed** — attacker can forge responses
- **Blocked by firewalls** — many corporate networks block port 53

### DNS-over-HTTPS (DoH)

Your computer sends an HTTPS request to a DoH server (e.g., `https://dns.google/resolve?name=google.com`). The response comes back as JSON or binary over HTTPS.

- **Encrypted** — network observers can't see your queries
- **Authenticated** — TLS verifies the server's identity
- **Works through firewalls** — HTTPS is rarely blocked
- **Easier to implement** — JSON response format, standard HTTP

### Why we chose DoH

1. **Works everywhere** — no root privileges, no firewall issues, works on Windows/Mac/Linux
2. **No CORS issues** — server-side queries bypass browser restrictions
3. **JSON format** — easy to parse, no binary protocol handling
4. **Modern infrastructure** — Google, Cloudflare, Quad9 all support it

Raw UDP is more authentic for learning the wire protocol, but we deferred that to Phase 7 (Network Diagnostics).

---

## 6. In-Memory Caching

### Why cache?

DNS records don't change every second. `google.com`'s IP is the same for at least 30 seconds (the TTL). If the user clicks "Resolve" twice, we don't need to query all 3 resolvers again.

### How it works

```javascript
const cache = new Map();  // key: "google.com:A,MX,NS", value: {data, timestamp}

// On query:
const cached = cache.get(key);
if (cached && Date.now() - cached.timestamp < 30000) {
  return cached.data;  // Cache hit — no network call
}

// On miss:
const result = await queryResolvers(...);
cache.set(key, { data: result, timestamp: Date.now() });
```

### Tradeoff

| Benefit | Cost |
|---------|------|
| Faster response (0ms vs 100ms+) | Stale data for up to 30s |
| Less load on public resolvers | Memory usage |
| Better UX (instant second click) | Cache invalidation complexity |

---

## 7. Resolver Fault Tolerance

### The Problem

We query 3 DNS resolvers. Any of them can:
- Timeout (5s)
- Return an error
- Be completely unreachable

### The Solution

```javascript
const resolverPromises = resolverKeys.map((key) =>
  querySingleResolver(key, domain, types)
    .then((result) => ({ key, ...result, responseTime: Date.now() - startTime }))
    .catch((error) => ({ key, records: {}, responseTime: Date.now() - startTime, error: 'Resolver failed' }))
);

const results = await Promise.all(resolverPromises);
```

Key details:
1. `.catch()` on each promise captures failures **with the resolver key**
2. The key is captured in the `.then()` closure — it's available in `.catch()` too
3. `Promise.all` works here because `.catch()` converts rejections to fulfilled values

### The bug we fixed

The original code used `Promise.allSettled` and tried to access `result.reason.key` on rejection. But `result.reason` doesn't carry the key — it's just the error. The fix: use `.catch()` to capture the key before the promise rejects.

---

## 8. Domain Validation

Before querying DNS, we validate the domain:

```javascript
const isValidDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length > 253) return false;        // DNS spec limit
  if (domain.includes(' ') || domain.includes('..')) return false;
  if (!domain.includes('.')) return false;       // Must have at least one dot
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return false;  // Only valid chars
  return true;
};
```

Why each check:
- **Length > 253:** DNS names can't exceed 253 characters (RFC 1035)
- **Spaces:** Invalid in DNS names
- **Double dots:** Invalid syntax (`google..com`)
- **No dot:** `localhost` has no dot — not a valid FQDN for DNS lookup
- **Special characters:** Only alphanumeric, hyphens, and dots allowed

---

## 9. MX Record Priority and Failover

### How email routing works

When someone sends email to `user@example.com`, the sending server queries MX records:

```
10 mail1.example.com
20 mail2.example.com
```

The sending server:
1. Tries mail1.example.com (priority 10 — highest priority)
2. If mail1 is unreachable, tries mail2.example.com (priority 20)
3. If both fail, the email bounces

### Priority meaning

Lower number = higher priority. It's like a numbered list of preferences:
- "Try #10 first"
- "If #10 fails, try #20"
- "If #20 fails, try #30"

### What we extract

In the DoH response, MX records look like `"10 mail1.example.com"`. Our code extracts the priority:

```javascript
const extractMxPriority = (data) => {
  const match = data.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : 0;
};
```

---

## 10. NXDOMAIN — Domain Not Found

When you query a domain that doesn't exist (e.g., `thisdoesnotexist12345.invalid`), the DNS server responds with **NXDOMAIN** (Non-Existent Domain).

In the DoH JSON API, this is `Status: 3`:

```json
{
  "Status": 3,  // NXDOMAIN
  "TC": false,
  "RD": true,
  "RA": true,
  "AD": false,
  "CD": false
}
```

Our code handles this:

```javascript
if (data.Status === 3) {
  return { type, records: [], error: 'NXDOMAIN' };
}
```

The UI shows "Domain not found" instead of crashing or showing empty results.

---

## Summary: What You Should Be Able to Explain

After Phase 4, you should be able to answer:

1. **Why does DNS have a chain?** — Because no single server knows all domains. Distributed by design.
2. **What does MX priority mean?** — Lower number = try first. Failover mechanism.
3. **When to use Promise.allSettled vs Promise.all?** — allSettled for fault tolerance, all for all-or-nothing.
4. **Why copy arrays before sorting?** — `.sort()` mutates. Never modify data you don't own.
5. **Why DoH over raw UDP?** — Encrypted, works through firewalls, JSON format.
6. **What does TTL mean?** — Time To Live. How long a record is valid before re-querying.
7. **Why cache DNS results?** — Same result for ~30s. Avoid redundant network calls.
8. **What is NXDOMAIN?** — Domain doesn't exist. Status code 3.
