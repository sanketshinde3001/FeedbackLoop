# FeedbackLoop — User Manual

A plain-language guide to every feature. No jargon, no fluff.

---

## Tech stack

**Framework**
- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4

**Auth & Database**
- Supabase — Postgres DB, row-level security, auth

**AI & Transcription**
- Deepgram — video transcription (`nova-3` model, multi-language)
- Google Gemini (3.1 flash lite) — question generation, sentiment analysis, session summary

**Media**
- Cloudinary — video storage, edited video transformations, caption (VTT) uploads

**Key libraries**
- Lucide React — icons
- DM Serif Display — typography

---

## Who does what

| Role | What they do |
|------|--------------|
| **Host / Admin** | Creates sessions, manages attendees, reviews responses |
| **Attendee** | Records a video testimonial via their personal link |

---

## 1. Getting started

1. Go to `/admin` and sign in with your email.
2. You land on the **Dashboard** — it shows total sessions, attendees, video responses, and emoji reactions at a glance.
3. If you have existing sessions, recent ones appear as clickable cards. If not, hit **New Session**.

---

## 2. Creating a session

Go to **Sessions → New Session**.

Fill in:
- **Title** — name of the event or topic (e.g. "GenAI Workshop March 2026")
- **Date** — optional, just for your reference

**Questions** — these are the prompts your attendees will answer on camera.

Two ways to add them:
- Type them manually, one per box. Hit **+ Add question** for more.
- Or describe your session in the text box and click **Generate with AI** — it writes short, feedback-focused questions for you. You can edit them after.

Click **Create Session** when ready. The session starts in **Draft** status — no one can submit yet.

---

## 3. Session statuses

| Status | What it means |
|--------|--------------|
| **Draft** | Attendees who visit their link see "not open yet". Safe to set up. |
| **Active** | Attendees can record and submit. Open and collecting. |
| **Closed** | No more submissions. Good for archiving. |

Change status from the **Session Settings** panel on the session page.

---

## 4. Adding attendees

Open the session → **Attendees** section.

**One at a time:** Type a name + email, click **Add**. They get a unique personal link.

**Bulk import:** Click **Bulk import CSV**. Either upload a `.csv` file or paste rows directly:
```
Alice Smith, alice@example.com
Bob Jones, bob@example.com
```

Each attendee gets their own private recording link. No two people share a link.

---

## 5. Sharing the feedback link

You have two sharing options on the session page:

**Option A — General link (recommended for WhatsApp/email blasts)**
Copy the **General feedback link** from the **Share link** panel. Anyone who opens it types their name and email first, then gets redirected to their own personal session.

**Option B — Individual links**
In the attendee list, each row has a copy button next to a short token. Copy and send each person their own direct link.

---

## 6. How attendees record

When an attendee opens their link:
1. They see the session questions.
2. They pick the **language** they'll speak in (English, Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam).
3. They record a short video or let you use an existing one — browser-based, no app needed.
4. They pick an emoji reaction (Loved it / Helpful / Needs improvement / Confused).
5. They hit **Submit**. Done.

If the session is in Draft or Closed, they see a friendly message explaining why they can't submit yet.

---

## 7. Sending reminders

If some attendees haven't submitted yet, a **Send Reminders** button appears at the top of the attendee list. It emails all pending attendees in one click.

The attendee list also shows each person's status — **Done** (green) or **Pending** (grey) — so you can see at a glance who's missing.

---

## 8. Reviewing responses

Go to the session page and scroll to the **Responses** section.

Each response card shows:
- Attendee name, email, and submission date
- Their emoji reaction and sentiment badge (Positive / Neutral / Negative with a score)
- The AI conclusion — a one-sentence summary of what they said
- A **Show transcript** toggle if you want to read the full transcript

**Actions on each card:**

| Button | What it does |
|--------|-------------|
| **Watch video** | Plays the video inline |
| **Edit it** | Transcribes the video, generates captions + name overlay, creates an edited version |
| **Re-edit** | Run the edit pipeline again (e.g. after re-analyzing) |
| **Add to wall / On wall** | Approve or remove this response from the testimonial wall |
| **Wall source** dropdown | Choose whether the wall shows the raw video or the edited (captioned) version |
| **Analyze / Re-analyze** | Run AI analysis again to update sentiment and conclusion |
| **Raw file** | Open the original uploaded video in a new tab |
| **Edited file** | Open the edited (captioned) video in a new tab |

---

## 9. AI session summary

If at least one response has a transcript, the **AI Session Summary** panel appears in the right sidebar of the session page.

Click **Generate summary** — the AI reads all transcripts and writes a short executive-level summary of the whole session's feedback.

You can re-generate it any time.

---

## 10. The testimonial wall

The wall is a public-facing display of approved responses for a session.

To use it:
1. On the session settings panel, click **Enable Wall**.
2. Approve individual responses using the **Add to wall** button on each response card.
3. Click **View Wall** to see the public wall URL.

The wall shows videos with their sentiment badge and emoji. Visitors can watch directly in the browser.

If you want a specific video to show captions and a name overlay instead of the raw recording, set **Wall source → Edited video** on that response card before approving.

---

## 11. Embedded testimonials

If you want to put testimonial videos on your own website:

1. Go to **Embeds** in the sidebar.
2. Customize:
   - **Video count** — how many videos to show (max 24)
   - **Template** — Aurora cards / Magazine feature / Spotlight tiles
   - **Accent, Text, Card, Background** colors — pick anything
3. Copy the **Embed URL** or **Iframe code** using the copy buttons.
4. Paste the iframe into any website or CMS.

The embed automatically pulls from all your wall-enabled sessions and updates as you approve new testimonials — no code changes needed.

---

## 12. Analytics

Go to **Analytics** in the sidebar.

You get:
- Total sessions, attendees, responses, and overall response rate
- Sentiment breakdown across all sessions (positive / neutral / negative bars)
- Emoji reaction breakdown
- Per-session response rate chart (who's actually submitting)

---

## 13. Attendees overview

Go to **Attendees** in the sidebar.

Shows every attendee across all your sessions in one table — name, email, which session, submission status, and a remind button for anyone who hasn't submitted yet.

---

## 14. Closing and archiving

When a session is done, hit **Close Session** from the settings panel.

Closed sessions still show all their data. You can still view responses, approve things for the wall, and generate the AI summary — you just can't accept new submissions.

If you need to reopen it, hit **Reopen as Draft** and then **Activate Session**.

To permanently delete a session and all its data, hit **Delete Session** (a confirmation prompt appears first).

---

## Tips

- Use the **general link** for large groups — it's one URL you can send anywhere and it handles all the name/email collection for you.
- The **Edit it** button is worth using before approving to the wall — the edited version adds captions and a name overlay, which looks much more polished on an embed.
- The embed auto-updates — once you've pasted the iframe code into your website, you never need to touch it again. Just approve new testimonials and they appear.
- If an attendee says the session isn't open, check that the status is **Active** (not Draft).
