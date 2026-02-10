# Hacker News Launch - Ready to Post

## How to Post
1. Go to https://news.ycombinator.com/submit
2. Best time: 8-9 AM EST weekdays
3. Post as "Show HN" (this is a project you built)

---

## Title (80 chars max)
Show HN: NoteFlame - Self-destructing encrypted messages (open source)

## URL
[Your deployed URL]

## Text (only if no URL, but you should use URL)
Leave blank if you submit a URL. The HN community will click through and form their own opinion.

## First Comment (post immediately after submitting)

Hi HN, maker here.

I built NoteFlame because my team kept pasting database credentials into Slack. We needed something that:

1. Encrypts secrets at rest (AES-256-GCM)
2. Destroys them after being read
3. Has an API for automation (CI/CD pipelines)
4. Doesn't store the decryption key

The crypto model: each drop gets a random slug. We hash it (SHA-256) for lookup and derive the encryption key via PBKDF2. The raw slug exists only in the URL. A full DB dump reveals nothing.

Stack: Node.js, Express, PostgreSQL, EJS (no React/build step), Tailwind via CDN.

Deploys to Render in one click. Source is available.

Known limitation: decryption happens server-side, so it's not true E2E encryption. Planning client-side crypto with Web Crypto API for v2. Happy to discuss the tradeoffs.

Would love feedback on the security model and product.
