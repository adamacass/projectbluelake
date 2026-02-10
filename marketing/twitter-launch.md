# Twitter/X Launch Thread - Ready to Post

## How to Post
1. Post as a thread (each section = one tweet)
2. Best time: 9-11 AM EST on Tuesday-Thursday
3. Pin the thread to your profile

---

## Tweet 1 (Hook)
I built a tool that solves a problem every dev team has:

Passwords pasted in Slack that sit there forever.

Introducing NoteFlame - self-destructing encrypted messages.

Here's how it works (thread) ↓

## Tweet 2
The problem:

Every time you share a password over Slack, email, or text → it creates a permanent, searchable record.

- Anyone in the channel can find it
- Compliance auditors will flag it
- It's a breach waiting to happen

## Tweet 3
The solution:

1. Paste your secret into NoteFlame
2. Get an encrypted one-time link
3. Share the link (not the secret)
4. Recipient reads it → it's permanently destroyed

AES-256-GCM encrypted. The key only exists in the URL.

## Tweet 4
What makes it different from PrivNote:

- Encryption key never stored in DB
- Password protection on drops
- Multi-view burns (1, 5, 10, or 100 views)
- REST API for automation
- Burn notifications
- Self-hostable (one-click Render deploy)

## Tweet 5
The business model:

Free: 5 drops/day (forever free)
Pro: $8/mo (API, passwords, 100 drops/day)
Business: $24/mo (teams, 10K drops/day)

Infrastructure: ~$7/month
Target: $1K MRR with ~125 subscribers

## Tweet 6
Tech stack for the nerds:

- Node.js + Express
- PostgreSQL
- AES-256-GCM (PBKDF2 key derivation)
- Server-rendered EJS (no React, no build step)
- Tailwind CSS via CDN
- Stripe subscriptions
- One-click Render deploy

## Tweet 7 (CTA)
Try it free: [YOUR_URL]

No account needed. Create a drop in 10 seconds.

If you share passwords or API keys with your team, you need this.

---

## Standalone Tweets (Post These Over the Following Weeks)

### Tweet A
Stop pasting passwords in Slack.

Use NoteFlame instead → encrypted self-destructing links.

One view, then it's gone forever.

Free at [YOUR_URL]

### Tweet B
Every time you share an API key over email, it lives in:
- Your sent folder
- Their inbox
- Email server backups
- Compliance archives

Or... share it via a self-destructing link that vanishes after reading.

[YOUR_URL]

### Tweet C
If your team shares credentials over Slack, you have a security problem.

NoteFlame: paste the secret, get an encrypted link, share the link. After they read it, it's permanently destroyed.

AES-256-GCM. Open source. Free.

### Tweet D
New employees need 10+ passwords on day 1.

Most companies put them in a "Welcome!" email that lives forever.

Better: send a self-destructing NoteFlame link. They read it, save to their password manager, link self-destructs.

[YOUR_URL]
