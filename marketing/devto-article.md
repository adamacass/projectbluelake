---
title: "I Built a Self-Destructing Secret Sharing Tool with Node.js and AES-256 Encryption"
published: true
tags: javascript, security, webdev, opensource
---

# I Built a Self-Destructing Secret Sharing Tool with Node.js and AES-256 Encryption

Every engineering team has this problem: someone pastes a database password into a Slack channel, and it sits there forever. Searchable, visible to anyone who joins later, a compliance nightmare.

I built **GhostDrop** to fix this: encrypted, self-destructing messages that vanish after being read.

## The Encryption Model

This is the part I'm most proud of. Here's how it works:

### 1. Slug Generation
When you create a drop, we generate a random 24-character slug using `crypto.randomBytes(18).toString('base64url')`. That's 144 bits of entropy.

### 2. Key Separation
The slug serves two purposes, but through different derivations:
- **Lookup**: `SHA-256(slug)` → stored in DB as the identifier
- **Encryption**: `PBKDF2(slug + server_secret, 100K iterations)` → 32-byte AES key

The raw slug is **never stored**. Only the hash for lookup.

### 3. Encryption
Content is encrypted with AES-256-GCM:

```javascript
function encrypt(text, slug) {
  const key = crypto.pbkdf2Sync(slug, serverSecret + salt, 100000, 32, 'sha512');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // ... encrypt and return ciphertext + iv + authTag
}
```

### 4. The Result
Even if an attacker dumps the entire database, they get:
- Hashed slugs (can't reverse to get decryption key)
- Encrypted content (can't decrypt without the slug)
- IVs and auth tags (useless without the key)

The only way to decrypt is to know the original URL.

## The Stack

I kept it deliberately simple:

- **Node.js + Express** - battle-tested, fast enough
- **PostgreSQL** - reliable, hosted free on Neon
- **EJS templates** - server-rendered, no build step, instant page loads
- **Tailwind CSS via CDN** - beautiful UI without webpack
- **Stripe** - subscription billing
- **node-cron** - cleanup expired drops every 5 minutes

Total dependencies: 11 packages. No React, no webpack, no TypeScript. Ship fast.

## Features

- **Burn after reading**: Drops self-destruct after 1 view (or 5, 10, 100)
- **Password protection**: Share link in one channel, password in another
- **Auto-expiry**: 1 hour, 24 hours, 7 days, or 30 days
- **REST API**: Create drops from CI/CD pipelines and scripts
- **Burn notifications**: Know when your secret was read
- **One-click deploy**: `render.yaml` blueprint creates web service + database

## Business Model

| Plan | Price | Drops/Day | Features |
|------|-------|-----------|----------|
| Free | $0 | 5 | Basic encryption, 24hr expiry |
| Pro | $8/mo | 100 | API, passwords, 30-day expiry |
| Business | $24/mo | 10,000 | Everything, team features |

Target: 125 Pro users = $1,000/month. Infrastructure cost: ~$7/month.

## Deploy Your Own

The `render.yaml` blueprint makes deployment trivial:

1. Push to GitHub
2. Connect to Render
3. Click "New Blueprint"
4. Set Stripe keys
5. Live in 3 minutes

## What I Learned

1. **Mount Stripe webhooks before body parsers.** Stripe needs the raw request body for signature verification. If `express.json()` runs first, the signature check fails. Cost me 2 hours.

2. **PBKDF2 at 100K iterations is slow on purpose.** It adds ~100ms to each encrypt/decrypt, which is fine for our use case but worth knowing.

3. **Server-rendered HTML is underrated.** No hydration, no loading spinners, no layout shift. Pages render instantly. EJS + Tailwind CDN is genuinely a great DX for this type of product.

4. **Cookie-session > express-session for simple apps.** No session store to manage, no memory leaks, no Redis needed. Just signed cookies.

## Try It

[YOUR_URL] - Free, no account needed.

Source code available for self-hosting.

---

*What do you think? I'd love feedback on the encryption model and any security improvements you'd suggest. And if your team shares passwords over Slack... maybe give it a try.*
