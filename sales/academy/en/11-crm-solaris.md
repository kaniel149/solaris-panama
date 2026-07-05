# Module 11: The Solaris CRM (Step by Step)

> **Solaris Panama Sales Academy** | Level: New Salesperson
> Estimated time: 1.5 hours of study + guided practice in the system

---

## 🎯 Module Objectives

By the end of this module, you will be able to:

1. Access the Solaris CRM and identify each section on the screen.
2. Find a lead, read their contact information, and know where they came from.
3. Update a lead's status correctly with each advance in the process.
4. Log a useful note after every contact (call, WhatsApp, visit).
5. Mark a deal as won with the sale value in dollars.
6. Use filters and search to find any lead in seconds.
7. Read attribution badges without touching or modifying them.

---

## Accessing the CRM

**CRM URL:** [VERIFICAR CON GERENTE — confirm the production URL]
**Credentials:** [VERIFICAR CON GERENTE — new user creation process for new salespeople]

Once inside, you will see a left sidebar with two groups of options. The first is called **CRM** and contains the sections you'll use every day.

---

## Screen Tour

### 1. Sidebar (main navigation)

The sidebar has two groups:

**CRM Group:** Dashboard · **Leads** (your main screen) · Clients · Proposals · Projects · Calendar · Monitoring · Lead Pipeline (roof kanban from the scanner — the manager will tell you when to use it).

**Maps & Tools Group:** Scanner · Calculator · Proposal Generator.

For daily sales work, your main screen is **Leads**.

---

### 2. Leads Screen — Overview

When you open **Leads**, the first thing you see are two rows of cards with numbers.

**Row 1 — Pipeline status:**

| Card | What it measures |
|------|-----------------|
| Total | All leads in the system |
| New | Leads that came in but you haven't contacted yet |
| Contacted | Leads that have already received at least one message from you |
| Qualified | Leads you've spoken with and confirmed they qualify |
| Won | Signed contracts |
| Overdue | Leads that have gone too long without contact — require action today |

**Row 2 — Lead origin:** Google Ads LP (page with gclid) · Google Lead Form (Google form) · Meta Lead Ads (Facebook/Instagram form) · WhatsApp (bridge or manual import). These numbers are read-only — do not modify them.

---

### 3. Toolbar

Below the statistics cards you will find four controls:

1. **Search field** — Type the name or phone number of a prospect to find them instantly.
2. **Status filter** — Dropdown menu with all possible statuses. Use "All statuses" to see the full pipeline, or select one to focus.
3. **Source filter** — Filters by lead origin (Google, Meta, WhatsApp, etc.).
4. **"Hide vendors" button** — By default, the CRM hides contacts marked as vendors, partners, or "not a lead." If you need to see them, activate this button.

---

### 4. The Leads Table

The table shows your leads ordered from newest to oldest. Each row has five columns:

- **Name** — The prospect's name. If the lead has gone several days without contact, you will see a red "Follow-up required" label beneath the name.
- **Phone** — The contact number. Next to it is a green WhatsApp icon; clicking it opens WhatsApp with a pre-written message in Spanish, ready to send.
- **Source** — Where the lead came from (Google, Meta, WhatsApp, manual, etc.). It may show additional labels such as `gclid` or `platform id` — those are attribution badges (explained below).
- **Status** — A color-coded menu showing the current status. You can change it directly from here by clicking.
- **Date** — The date the lead entered the system.

To see a lead's full detail, click on their row.

---

### 5. Lead Detail Panel

When you click on a lead, a side panel opens on the right with all the information:

**Contact:**
- Name and phone with WhatsApp and call buttons.
- Email (if the form captured it).
- Monthly bill in dollars (if the prospect indicated it in the form — `$XX/month`).

**Source and status:**
- Badge with lead origin.
- Campaign name (if the lead came from a configured ads campaign).
- "Follow-up overdue" label in red if the lead has been inactive too long.

**Automation** (read-only): WA auto (WhatsApp automatically sent on arrival), Meta CAPI sent, Google offline sent. Do not touch these fields.

**Attribution** (read-only — explained in the next section).

**Sale value** (only if status = "Won"): numeric field in dollars. If the lead has a `gclid`, saving this value automatically reports it to Google Ads as an offline conversion.

**Status:** color buttons to change with a click.

**Message:** text the prospect left in the form (if they completed it).

**Notes:** team history with author and date. Field to add a new note (Enter or send button).

---

## Lead Statuses — What They Are and When to Use Them

The CRM has the following statuses. Use the correct one at all times — incorrect statuses damage reports and confuse the team.

| Status | Code | When to use it |
|--------|------|----------------|
| **New** | `new` | The lead just came in. You haven't contacted them yet. |
| **Contacted** | `contacted` | You sent the first message or called. Waiting for a response. |
| **Qualified** | `qualified` | You had a real conversation, confirmed they own the roof, have a relevant bill, and genuine interest. |
| **Proposal** | `proposal_sent` | You sent or presented the formal proposal. |
| **Cold** | `cold` | Responded but showed little interest. Monthly follow-up. |
| **Warm** | `warm` | Shows moderate interest. Responds occasionally. |
| **Hot** | `hot` | Ready to close. High probability within the next few days. |
| **Won** | `won` | Contract signed. Enter the sale value in dollars. |
| **Lost** | `lost` | Decided not to move forward. Close gracefully (see Module 09). |

The **Vendor**, **Partner**, and **Not a Lead** statuses are used only by the manager for contacts that are not sales prospects.

> **Important:** Earlier modules in the Academy mention statuses like "In discovery," "Visit scheduled," "Negotiation," and "Nurture." Those are sales process concepts — the actual CRM does not have those exact names. Use **Qualified** during discovery, **Proposal** once the proposal is sent, and **Warm** or **Cold** for nurture. [VERIFICAR CON GERENTE if custom statuses have been added since the last update].

---

## Daily Flow: How to Use the CRM Step by Step

### Step 1 — When you arrive in the morning: review new and overdue leads

1. Open **Leads**.
2. Look at the **New** card — are there leads that came in overnight?
3. Look at the **Overdue** card — are there leads showing "Follow-up required"?
4. Plan your day starting with the overdue ones, then the new ones.

### Step 2 — When a new lead arrives

1. Click on the lead to open the detail panel.
2. Read their name, phone, source, and any message they left (if any).
3. Click the WhatsApp icon to open the chat with the pre-written message.
4. Personalize the message before sending (add the name, mention their property or area if you know it).
5. **Return to the CRM** and change the status from **New** to **Contacted**.
6. Add a short note: "WhatsApp sent [date]. Awaiting response."

### Step 3 — When the prospect responds and there is a real conversation

1. Click on the lead.
2. Listen to or read what they say. Assess whether they qualify (do they own the roof? high bill? genuine interest?).
3. If they qualify: change the status to **Qualified**.
4. Add a descriptive note: "10-min call. Own house, zinc ~60m². Bill $180/month. Wants a visit. Proposes Tuesday 7/15 at 10am."
5. If they don't qualify yet: leave them as **Contacted** and schedule the next touch.

### Step 4 — When you send the proposal

1. Change the status to **Proposal**.
2. Add a note: "Proposal sent via WhatsApp on [date]. 5 kWp system, investment $7,200, payback 5.2 years."

### Step 5 — After each contact with no response

If the lead doesn't respond, don't change the status yet. Add a note with the date and the attempt: "T+48h WhatsApp sent. No response." Follow the sequence from Module 09 (T+0, T+48h, T+5d, T+10d).

### Step 6 — When you close a deal as won

1. Change the status to **Won**.
2. In the "Sale value" field, enter the contract amount in dollars (numbers only, no dollar sign).
3. Click outside the field to save.
4. Add a note: "Contract signed on [date]. X kWp system. Estimated installation [month]."

### Step 7 — When the deal is lost

1. Change the status to **Lost**.
2. Add a note with the reason (brief): "Decided not to move forward. Husband disagreed. Door open."
3. Close with the script from Module 09. Do not delete the lead — it may be reactivated in the future.

### Step 8 — At the end of the day

Review that all your contacted leads have a new note · no lead in "New" status for more than 24 hours · no "Contacted" lead with more than 10 days without a note.

---

## Filters and Search: Finding Any Lead

**Search:** type the name or phone number — the system filters in real time.
**Status filter:** "All statuses" menu — select one to focus on a pipeline stage.
**Source filter:** "All sources" menu — useful after a Meta or Google campaign to see only those leads.
**Refresh list:** refresh icon next to the "Add" button — use it if you suspect new leads came in while the CRM was open.

---

## Attribution Badges — What They Are and Why You Don't Touch Them

When a prospect arrives from a Google or Meta ad, the CRM automatically saves the exact origin. That information appears as labels in the "Source" column and in the "Attribution" section of the detail panel:

| Badge | What it indicates |
|-------|------------------|
| `gclid` | The lead clicked on a Google ad. The gclid is the identifier for that click. |
| `fbclid` | The lead clicked on a Facebook or Instagram ad. |
| `platform id` | The internal ID that Meta assigned to this lead in their Lead Ads system. |
| `utm_source / utm_medium` | Campaign parameters that identify the channel and traffic type. |
| `utm_campaign` | The name of the ad campaign that generated this lead. |

**Absolute rule:** You never modify these fields. They are technical data the system uses to report conversions to Google and Meta and automatically optimize the ads. Changing or deleting them breaks the advertising reports.

If you see a lead with no attribution badges, that is normal — it means they came via direct WhatsApp, referral, or were added manually.

---

## Adding a Lead Manually

If a prospect contacts you directly and isn't in the CRM: click **Add** (gold button, top right) → fill in name, phone (format `50765831822`), and source (`Referral` for referrals, `Cold call` for cold outreach, `Manual` if none fit) → **Save** → add an initial note with the context of the first contact.

---

## ⚠️ Common Mistakes

| Mistake | Why it's a problem | What to do instead |
|---------|-------------------|-------------------|
| Leaving a lead in "New" for more than 24 hours | That prospect has already contacted the competition or lost interest | Contact them within the first 2 hours of arriving in the CRM |
| Changing status without adding a note | The manager or a teammate can't know what happened | Always add a note + status at the same time |
| Writing generic notes: "Called" | Useless for follow-up or lead transfer | Write: channel, duration, what the prospect said, next step |
| Marking "Won" without entering the dollar value | The system can't report the conversion to Google Ads; profitability data is lost | Always complete the value field when marking won |
| Modifying attribution badges | Breaks the automatic advertising reports | Never touch those fields — they are read-only |
| Selecting the wrong source when adding a lead manually | Contaminates the lead origin reports | Select "Manual" if unsure — the manager can correct it |
| Filtering by a status and forgetting to clear the filter | You think you saw all your leads when you only saw a subset | Verify the filter says "All statuses" at the start of each day |
| Sending the automatic WhatsApp without personalizing the name | The message arrives with "friend" instead of the real name | Always review the message before sending |

---

## 🎭 Practical Exercise: Three Leads in the CRM

This exercise simulates a real shift. Work with the manager or a teammate as observer.

**Context:** It is Tuesday at 8:30 AM. You open the CRM and find these three leads:

---

**Lead A — Jorge Ríos**
Came in this morning. Source: Meta Lead Ads. Phone: 6XXX-XXXX. Message: "I want information about panels for my house in Chitré."

Tasks:
1. Open the detail panel. Read the source and attribution badges.
2. Click WhatsApp, personalize the message with his name and area, and simulate sending.
3. Change the status to **Contacted**.
4. Add a note: "WhatsApp sent 08:35. Prospect in Chitré, residential. Awaiting response."

---

**Lead B — Hotel Playa Verde**
Came in 6 days ago. Status: Qualified. Last note from 5 days ago: "20-min call. Manager confirmed flat roof 400m², bill $1,800/month. Proposal pending."

Tasks:
1. Confirm that the lead shows "Follow-up required" (has gone more than X days without a note).
2. Simulate sending the T+5d message from Module 09 via WhatsApp.
3. Update the note: "T+5d WhatsApp sent. No response yet. Follow-up scheduled for Thursday."
4. Evaluate whether to change it to **Cold** or keep it at **Qualified** — discuss with the observer.

---

**Lead C — María Antonia Castillo**
Came in 3 weeks ago. Status: Proposal. Prior notes show: T+0, T+48h, T+5d, T+10d sent. No response.

Tasks:
1. Change the status to **Lost**.
2. Add a note: "No response after 4 contacts over 3 weeks. Marked as lost on [date]. Door open."
3. Discuss with the observer: if this person writes back in 30 days, what is the first thing you do before responding?

---

**Evaluation criteria:**
- Status was changed correctly in each case.
- Notes are descriptive (not generic).
- The student did not modify the attribution badges.
- The WhatsApp was personalized before the simulated send.

---

## ✅ Daily CRM Checklist

At the start of the day:
- [ ] Reviewed "New" leads — none have gone more than 24 hours without contact.
- [ ] Reviewed "Overdue" leads — all have an action scheduled for today.
- [ ] Filter says "All statuses" (not left on a filter from the previous day).

During the day:
- [ ] Every time I contact a prospect, I add a note to the CRM before moving on to the next.
- [ ] Every status change has a note explaining it.

At the end of the day:
- [ ] No lead in "New" status for more than 24 hours.
- [ ] All leads I contacted today have a new note.
- [ ] Won deals have the sale value entered.
- [ ] Lost deals have a note with the reason.

---

## 📝 Quiz — Module 11

Answer without consulting the material.

**1.** Which CRM section should a salesperson have open throughout the entire workday?
   - a) Dashboard
   - b) Leads
   - c) Calendar
   - d) Monitoring

**2.** A lead just came in at 9:00 AM. What is the maximum time that can pass before you contact them?
   - a) 24 hours
   - b) 48 hours
   - c) As soon as possible — ideally within the first 2 hours
   - d) The next morning

**3.** You just had a 15-minute call with a prospect. They confirmed they own the house, have a zinc roof of 80 m², and a $160/month bill. What status do you change the lead to?
   - a) Contacted
   - b) Qualified
   - c) Proposal
   - d) Warm

**4.** What must you ALWAYS do at the same time as changing a lead's status?
   - a) Send an email to the manager
   - b) Add a descriptive note
   - c) Call the prospect
   - d) Update the source filter

**5.** A prospect signed a contract for $8,500. What is the correct step in the CRM?
   - a) Change status to Won and leave the value field empty
   - b) Change status to Won and enter 8500 in the "Sale value" field
   - c) Change status to Hot
   - d) Notify the manager and wait for them to log it

**6.** What does the `gclid` badge in the "Source" column of a lead mean?
   - a) The lead came via WhatsApp
   - b) The lead clicked on a Google ad
   - c) The lead was added manually
   - d) The lead was referred by a client

**7.** Can you modify the attribution fields (`gclid`, `fbclid`, `utm_campaign`)?
   - a) Yes, if the data is incorrect
   - b) Yes, but only with the manager's permission
   - c) No — they are read-only and must never be touched
   - d) Yes, when closing the deal as won

**8.** A lead has been in "Contacted" status for 7 days with no recent notes. What does the red label on their name indicate?
   - a) That the lead was deleted
   - b) That the lead came from Meta Ads
   - c) That follow-up is required — it has been inactive too long
   - d) That the manager is reviewing it

**9.** What source do you select when manually adding a lead that came to you through a client referral?
   - a) Manual
   - b) WhatsApp
   - c) Referral
   - d) Cold call

**10.** At the end of the day, which of these situations is unacceptable?
   - a) There are 2 leads in "Proposal" status from 3 days ago
   - b) There is a won lead from today with the value entered
   - c) There is a lead in "New" status that came in yesterday at 8:00 AM and no one has contacted them
   - d) There are 5 leads in "Lost" status with closing notes

---

### Quiz Answers

| # | Answer | Brief explanation |
|---|--------|------------------|
| 1 | **b** | Leads is the central screen for daily sales work |
| 2 | **c** | First 2 hours — while the prospect still has active interest (see Module 09, T+0) |
| 3 | **b** | Qualified — confirmed roof, bill, and genuine interest |
| 4 | **b** | Without a note, the status change tells you and the team nothing in the future |
| 5 | **b** | The dollar value is required — it triggers the conversion report to Google Ads |
| 6 | **b** | gclid = Google Click Identifier — identifies the click on a Google ad |
| 7 | **c** | Never — modifying them breaks the automatic advertising reports |
| 8 | **c** | The red "Follow-up required" label indicates excessive inactivity |
| 9 | **c** | Referral — for leads that come from existing client references |
| 10 | **c** | A new lead more than 24 hours old without contact is a missed opportunity |

---

> Previous module: **10 — Simulations and Certification**
> This is the final module of Academy v1.0.
>
> [VERIFICAR CON GERENTE]: CRM access URL · new user creation process for new salespeople · whether custom statuses have been added after January 2026 · exact credit amount per referral mentioned in Module 09
