# Reddit Launch Posts - Ready to Post

Post these on different days, not all at once. Space them 3-5 days apart.

---

## Post 1: r/SideProject

**Title:** I built a self-destructing message app for sharing passwords securely - GhostDrop

**Body:**
I got tired of seeing API keys and passwords pasted in Slack channels, so I built GhostDrop - a tool that lets you share secrets via encrypted, self-destructing links.

**How it works:**
1. Paste your secret (password, API key, whatever)
2. Get an encrypted, one-time link
3. Share the link
4. After it's read, it's permanently destroyed

**Tech stack:** Node.js, Express, PostgreSQL, AES-256-GCM encryption, Tailwind CSS

**What's different from PrivNote:**
- Encryption key is derived from the URL and never stored in the DB
- Password protection on drops
- Configurable view limits (1-10,000 views)
- Full REST API for automation
- Burn notifications
- Open source and self-hostable (one-click Render deploy)

**Business model:** Freemium. Free tier (5 drops/day), Pro ($8/mo), Business ($24/mo)

Would love feedback on the product and pricing!

---

## Post 2: r/webdev

**Title:** Built a full-stack SaaS in Node.js: self-destructing encrypted messages with AES-256-GCM

**Body:**
Sharing the architecture of a SaaS I just shipped. It's a self-destructing message platform (think PrivNote but modern) called GhostDrop.

**Interesting technical decisions:**

1. **Encryption model**: Each drop gets a random 24-char slug. The slug is hashed (SHA-256) for DB lookup, but a separate key is derived via PBKDF2 for AES-256-GCM encryption. Even a full DB dump can't decrypt the content.

2. **No build step**: Server-rendered EJS templates + Tailwind via CDN. No webpack, no React, no bundle. Page loads are instant.

3. **Render blueprint**: The render.yaml defines both the web service and PostgreSQL database. One-click deploy creates everything.

4. **Stripe integration**: Webhook-based subscription management. The raw body parser for webhook verification has to be mounted before the JSON body parser - a gotcha that wastes hours if you don't know about it.

Tech: Node.js 18+, Express, PostgreSQL, bcrypt, EJS, Tailwind CSS, Stripe

Happy to answer questions about the implementation!

---

## Post 3: r/selfhosted

**Title:** GhostDrop - self-hostable encrypted message sharing (self-destructing secrets)

**Body:**
Just open-sourced GhostDrop, a self-destructing encrypted message sharing platform. Think PrivNote but you own your data.

**Features:**
- AES-256-GCM encryption (key never stored in DB)
- Burn after reading (configurable 1-10,000 views)
- Password protection
- Auto-expiry (1 hour to 90 days)
- Dashboard to manage your drops
- REST API
- Burn notifications

**Self-hosting:**
- Node.js + PostgreSQL
- One-click deploy to Render via blueprint
- Or docker (coming soon) / any VPS

**Stack:** Node.js, Express, PostgreSQL, EJS, Tailwind

The encryption model is the key differentiator: the decryption key exists only in the URL. We store a hash of the URL for lookup, and derive the encryption key from it. Even full database access doesn't compromise the encrypted content.

Repo is open source. Feedback welcome!

---

## Post 4: r/Entrepreneur

**Title:** Launched a micro-SaaS for secure password sharing - targeting $1K MRR

**Body:**
Just launched GhostDrop - a platform for sharing passwords and sensitive info via self-destructing encrypted links.

**The problem I'm solving:**
Every company shares passwords, API keys, and credentials over Slack, email, and text. This creates permanent, searchable records of sensitive information. It's a security nightmare and a compliance violation.

**The solution:**
Encrypted, self-destructing links. Share the link instead of the password. Once it's read, it's gone forever.

**Business model:**
- Free: 5 drops/day (acquisition funnel)
- Pro: $8/mo (password protection, API, 100 drops/day)
- Business: $24/mo (10K drops/day, team features)

**Target customers:**
- DevOps/engineering teams (API key sharing)
- IT departments (employee onboarding credentials)
- HR teams (sending initial passwords)
- Healthcare (HIPAA-friendly messaging)

**Go-to-market:**
- Product Hunt launch
- SEO landing pages for "share passwords securely," "privnote alternative"
- API docs targeting developer community
- Content marketing

**Revenue target:** 125 Pro subscribers = $1,000/mo

Infrastructure cost: ~$7/month on Render. Basically pure margin at scale.

Would love feedback on the pricing and positioning!

---

## Post 5: r/netsec or r/cybersecurity

**Title:** Open source tool for sharing secrets securely - AES-256-GCM with key-separated encryption

**Body:**
Built an open source tool for sharing passwords and credentials via self-destructing encrypted links. Sharing because I'd love a security review of the crypto model.

**Encryption model:**
1. Random 24-char slug generated (crypto.randomBytes, 144 bits entropy)
2. Slug is hashed with SHA-256 for database lookup (raw slug never stored)
3. Encryption key derived via PBKDF2(slug + server_secret, 100K iterations, SHA-512) → 32-byte key
4. Content encrypted with AES-256-GCM
5. IV, ciphertext, and auth tag stored in DB
6. On retrieval: slug from URL → derive key → decrypt → destroy record

**Result:** Even full database compromise doesn't reveal content, since the decryption key can only be derived from the original URL slug.

**Additional security:**
- Passwords hashed with bcrypt (cost 10-12)
- Helmet.js security headers
- Rate limiting on creation and auth endpoints
- Cookie-session with httpOnly, SameSite, Secure flags
- Content Security Policy headers

Known limitations:
- Server-side decryption (not E2E - the server sees plaintext briefly during decrypt)
- No client-side encryption yet (planned for v2)

Feedback on the crypto model is very welcome. Is there anything I'm missing?
