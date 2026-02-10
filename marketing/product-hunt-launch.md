# Product Hunt Launch - Ready to Post

## How to Post
1. Go to https://www.producthunt.com/posts/new
2. Fill in the details below
3. Best launch days: Tuesday, Wednesday, or Thursday
4. Best launch time: 12:01 AM PST (to get a full 24 hours)
5. Schedule the launch in advance if possible

---

## Product Name
GhostDrop

## Tagline (60 chars max)
Share secrets that self-destruct after being read

## Description (260 chars max)
GhostDrop lets you share passwords, API keys, and sensitive messages via encrypted, self-destructing links. AES-256-GCM encrypted. Burns after reading. No trace left behind. Free to use, Pro plans for teams.

## Longer Description / First Comment

Hey Product Hunt! 👋

I built GhostDrop because I was tired of seeing API keys and passwords pasted into Slack channels where they sit forever.

**The problem:** Every time you share a password over Slack, email, or text, it creates a permanent record. Anyone with channel access can search and find it. Compliance auditors hate it. Security teams cringe.

**The solution:** GhostDrop creates encrypted, self-destructing links. Paste your secret, get a link, share it. After the recipient reads it, it's permanently destroyed. Zero trace.

**What makes it different:**
- 🔐 AES-256-GCM encryption (the key never touches our database)
- 💥 Configurable burn: 1 view, 5 views, or 100 views before destruction
- 🔑 Optional password protection (share link in one channel, password in another)
- 🔔 Burn notifications - know exactly when your secret was read
- 🔌 REST API for developers to integrate into their workflows
- 🎯 Self-hostable - deploy to Render in 2 minutes with our blueprint

**Pricing:** Free forever (5 drops/day). Pro at $8/mo for teams. Business at $24/mo.

I'd love your feedback! What features would make this more useful for your team?

## Topics
- Developer Tools
- Cybersecurity
- Privacy
- SaaS
- Open Source

## Thumbnail/Logo
Use a dark purple/black theme with a ghost icon and the text "GhostDrop"

## Maker Comment (post this as your first comment)
Hey everyone! Maker here.

I built this after watching my team paste database credentials into a Slack channel for the 100th time. We tried PrivNote but it felt outdated and we needed API access for our deployment scripts.

GhostDrop is fully open source and self-hostable. The encryption model is designed so that even if the database is compromised, the encrypted content can't be decrypted (the key only exists in the URL, which we never store).

Happy to answer any questions about the security model, tech stack, or business model!
