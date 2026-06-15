# Phase 4: DNS Observatory — Design Spec

## Goal

Build a DNS resolution tool that shows the full resolution chain, queries multiple record types, and compares results across 3 major public resolvers (Google, Cloudflare, Quad9). Includes a "Deep Dive" mode showing raw DNS packet structure.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React UI  │────▶│  Express API │────▶│  DoH APIs   │
│  (Vite)     │◀────│  /api/dns/*  │◀────│  Google     │
└─────────────┘     └──────────────┘     │  Cloudflare │
                                          │  Quad9      │
                                          └─────────────┘
```

- Client sends domain to server
- Server queries all 3 DoH resolvers in parallel (`Promise.allSettled`)
- Server merges results and returns to client
- Client renders visualization
- In-memory cache (30s TTL) prevents hammering resolvers

## API Design

### `GET /api/dns/resolve`

**Query params:**
- `domain` (string, required) — e.g., `"google.com"`
- `types` (string, optional) — comma-separated record types, default `"A,AAAA,MX,NS,CNAME,TXT,SOA"`

**Response:**

```json
{
  "domain": "google.com",
  "queries": {
    "google": {
      "records": {
        "A": [{ "data": "142.250.80.46", "TTL": 300 }],
        "MX": [{ "data": "smtp.google.com", "priority": 10, "TTL": 3600 }]
      },
      "responseTime": 45,
      "error": null
    },
    "cloudflare": { ... },
    "quad9": { ... }
  },
  "resolutionChain": [
    { "server": "root", "description": "Referral to .com TLD servers" },
    { "server": "TLD", "description": "Referral to google.com authoritative servers" },
    { "server": "authoritative", "description": "Final answer: IP addresses" }
  ],
  "timestamp": "2026-06-15T12:00:00Z"
}
```

**DoH endpoints:**
- Google: `https://dns.google/resolve?name={domain}&type={type}`
- Cloudflare: `https://dns.cloudflare-dns.com/dns-query?name={domain}&type={type}`
- Quad9: `https://dns.quad9.net:5053/dns-query?name={domain}&type={type}`

**Validation:**
- Domain must contain at least one dot
- Domain must not contain spaces or special characters
- Max 253 characters

**Error handling:**
- Use `Promise.allSettled` — one resolver failing doesn't block others
- 5s timeout per resolver
- 30s in-memory cache (key: `domain:types`)

## Frontend UI

### Layout (3 sections)

1. **DNS Resolver** — Domain input + record type checkboxes + Resolve button
2. **Resolution Chain** — Visual chain: Root → TLD → Authoritative → IP
3. **Records Comparison** — 3-column grid (Google | Cloudflare | Quad9) with timing
4. **Deep Dive** (toggle) — Raw DNS packet structure

### Components

| Component | Purpose |
|-----------|---------|
| `DnsResolver.jsx` | Main container: input, record selector, resolve button |
| `ResolutionChain.jsx` | Visual chain with arrows between stages |
| `RecordsComparison.jsx` | 3-column grid showing records per resolver + response time |
| `DeepDive.jsx` | Raw DNS packet header, questions, answers |

### Record Type Selector

Checkboxes: A, AAAA, MX, NS, CNAME, TXT, SOA — all checked by default.

### Deep Dive Mode

Toggled by button. Shows raw DNS packet structure parsed from DoH wire format response (`accept: application/dns-message`):
- Header: ID, flags (QR, Opcode, AA, TC, RD, RA, RCODE), counts
- Questions: name, type, class
- Answers: name, type, class, TTL, data

## File Structure

```
Internet-Observatory/
├── server/
│   ├── routes/
│   │   └── dns.js                    # NEW: /api/dns/resolve
│   ├── services/
│   │   └── dohClient.js              # NEW: DoH query logic + cache
│   └── index.js                      # MODIFY: Add dns routes
├── client/
│   └── src/
│       ├── components/
│       │   ├── DnsResolver.jsx        # NEW: Main DNS page
│       │   ├── ResolutionChain.jsx    # NEW: Chain visualization
│       │   ├── RecordsComparison.jsx  # NEW: 3-column comparison
│       │   └── DeepDive.jsx           # NEW: Raw packet display
│       └── App.jsx                    # MODIFY: Add DNS tab
```

**New files: 6. Modified files: 2.**

## Tradeoffs

| Decision | Chose | Gave Up |
|----------|-------|---------|
| DoH over raw UDP | Works everywhere, no root | Authentic packet-level learning |
| Server-side queries | No CORS, parallel execution | Simpler client-only architecture |
| 30s in-memory cache | Fast, prevents abuse | Persistent cache, cross-restart |
| Promise.allSettled | Partial results on failure | Simpler all-or-nothing behavior |
| No database | Simpler, DNS is ephemeral | Query history, trend analysis |

## Learning Goals

1. **DNS resolution chain** — How a domain becomes an IP address
2. **Record types** — What A, AAAA, MX, NS, CNAME, TXT, SOA mean
3. **Resolver diversity** — Different resolvers can return different answers
4. **DNS-over-HTTPS** — Modern DNS infrastructure
5. **Wire format** — Binary DNS packet structure
6. **Parallel queries** — `Promise.allSettled` for fault tolerance
