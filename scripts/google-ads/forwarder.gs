/**
 * Google Ads Lead Forwarder — Apps Script
 *
 * Watches Gmail for new "New lead" emails from Google Ads,
 * parses lead fields, and POSTs to Solaris Panama CRM webhook.
 *
 * Setup:
 *   1. Open https://script.google.com → New project
 *   2. Paste this whole file
 *   3. Run setupTrigger() once (gives Gmail permission)
 *   4. Done — runs every 5 min automatically
 *
 * Test manually: Run pollInbox()
 */

const WEBHOOK_URL = 'https://solaris-panama.com/api/webhooks/google-leads';
const WEBHOOK_KEY = 'bd71257cea0eaf682a5ddcb980197715a6c3a84e0111b22d';

// Google Ads sends from this address
const SEARCH_QUERY =
  'from:(google-ads-noreply@google.com OR ads-noreply@google.com) ' +
  'subject:("New lead" OR "ליד חדש" OR "Nuevo lead") ' +
  'newer_than:1d -label:processed-lead';

const PROCESSED_LABEL = 'processed-lead';

function setupTrigger() {
  // Remove any existing triggers for pollInbox
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === 'pollInbox') ScriptApp.deleteTrigger(t);
  });
  // Create a new trigger every 5 min
  ScriptApp.newTrigger('pollInbox').timeBased().everyMinutes(5).create();

  // Ensure the label exists
  if (!GmailApp.getUserLabelByName(PROCESSED_LABEL)) {
    GmailApp.createLabel(PROCESSED_LABEL);
  }
  Logger.log('Trigger installed. Will run pollInbox every 5 minutes.');
}

function pollInbox() {
  const label = GmailApp.getUserLabelByName(PROCESSED_LABEL) ||
    GmailApp.createLabel(PROCESSED_LABEL);

  const threads = GmailApp.search(SEARCH_QUERY, 0, 20);
  let processed = 0;
  let errors = 0;

  threads.forEach((thread) => {
    thread.getMessages().forEach((msg) => {
      try {
        const lead = parseLead(msg);
        if (!lead) return;

        const payload = {
          google_key: WEBHOOK_KEY,
          lead_id: lead.lead_id || `email_${msg.getId()}`,
          api_version: '1.0',
          form_id: lead.form_id || null,
          campaign_id: lead.campaign_id || null,
          gcl_id: lead.gclid || null,
          source: 'google_ads_email',
          user_column_data: [
            { column_id: 'FULL_NAME', column_name: 'Full Name', string_value: lead.full_name || '' },
            { column_id: 'PHONE_NUMBER', column_name: 'Phone', string_value: lead.phone || '' },
            { column_id: 'EMAIL', column_name: 'Email', string_value: lead.email || '' },
          ].filter((c) => c.string_value),
        };

        const res = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        });

        const code = res.getResponseCode();
        if (code >= 200 && code < 300) {
          processed++;
          Logger.log(`✅ Forwarded lead ${lead.lead_id || lead.full_name}`);
        } else {
          errors++;
          Logger.log(
            `❌ Webhook ${code}: ${res.getContentText().substring(0, 200)}`
          );
        }
      } catch (e) {
        errors++;
        Logger.log(`❌ Parse error: ${e}`);
      }
    });

    // Mark whole thread as processed regardless
    thread.addLabel(label);
  });

  Logger.log(
    `Done. Threads checked: ${threads.length} | Forwarded: ${processed} | Errors: ${errors}`
  );
}

/**
 * Extract lead fields from a Google Ads notification email.
 * Google Ads emails contain field labels followed by values.
 * Format varies by language (he/es/en) — we handle all 3.
 */
function parseLead(msg) {
  const body = msg.getPlainBody() || htmlToText(msg.getBody());
  const subject = msg.getSubject();

  // Field name → array of label aliases
  const fieldMap = {
    full_name: ['Full name', 'Name', 'שם מלא', 'שם', 'Nombre completo', 'Nombre'],
    phone: ['Phone number', 'Phone', 'מספר טלפון', 'טלפון', 'Teléfono', 'Telefono'],
    email: ['Email', 'אימייל', 'דוא״ל', 'Correo electrónico', 'Correo'],
    campaign_id: ['Campaign ID', 'מזהה קמפיין', 'ID de campaña'],
    campaign_name: ['Campaign', 'Campaign name', 'קמפיין', 'Campaña'],
    form_id: ['Lead form ID', 'Form ID', 'מזהה טופס', 'ID del formulario'],
    gclid: ['GCLID', 'Click ID', 'מזהה קליק'],
    lead_id: ['Lead ID', 'מזהה ליד', 'ID del lead'],
  };

  const result = {};
  for (const key of Object.keys(fieldMap)) {
    for (const label of fieldMap[key]) {
      const re = new RegExp(
        `${escapeRegex(label)}\\s*[:：]\\s*([^\\n\\r]+)`,
        'i'
      );
      const m = body.match(re);
      if (m && m[1]) {
        result[key] = m[1].trim();
        break;
      }
    }
  }

  // If no full_name parsed but subject has it, try subject
  if (!result.full_name) {
    const subjMatch = subject.match(/([A-Za-zא-ת\u00C0-\u017F\s]{3,})$/);
    if (subjMatch) result.full_name = subjMatch[1].trim();
  }

  // Anything found?
  if (!result.full_name && !result.phone && !result.email) return null;

  return result;
}

function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** TEST: paste a sample lead body and run testParse() to verify */
function testParse() {
  const sample = `
You have a new lead from your campaign.

Full name: María González
Phone number: +50760001234
Email: maria@test.pa
Campaign: Solaris Panama - Search
Lead form ID: 12345
`;
  const fakeMsg = {
    getPlainBody: () => sample,
    getBody: () => sample,
    getSubject: () => 'New lead from María González',
  };
  Logger.log(JSON.stringify(parseLead(fakeMsg), null, 2));
}
