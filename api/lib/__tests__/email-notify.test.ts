import { describe, it, expect } from 'vitest';
import { formatLoginAlert, formatSummary, type ActivityReport } from '../email-notify';

const emptyReport: ActivityReport = { leadsUpdated: [], statusChanges: [], events: [], tasks: [] };

describe('formatLoginAlert', () => {
  it('has Hebrew subject with name', () => {
    const { subject, text } = formatLoginAlert('רואי', '2026-07-10T08:00:00.000Z');
    expect(subject).toContain('רואי');
    expect(subject).toContain('נכנס');
    expect(text).toContain('נכנס למערכת');
  });
});

describe('formatSummary', () => {
  it('empty session → explicit "no updates" line', () => {
    const { text } = formatSummary('רואי', emptyReport, { interim: false, sessionStart: '2026-07-10T08:00:00.000Z' });
    expect(text).toContain('לא בוצעו עדכונים');
  });

  it('lists activity counts and items', () => {
    const report: ActivityReport = {
      leadsUpdated: [{ id: '1', name: 'Juan Perez', status: 'warm', at: '2026-07-10T08:05:00.000Z' }],
      statusChanges: [{ leadName: 'Juan Perez', from: 'cold', to: 'warm', at: '2026-07-10T08:06:00.000Z' }],
      events: [{ title: 'Visita técnica', type: 'meeting', startsAt: '2026-07-11T14:00:00.000Z' }],
      tasks: [{ title: 'Enviar propuesta', status: 'todo' }],
    };
    const { subject, text } = formatSummary('רואי', report, { interim: true, sessionStart: '2026-07-10T08:00:00.000Z' });
    expect(subject).toContain('ביניים');
    expect(text).toContain('Juan Perez');
    expect(text).toContain('cold → warm');
    expect(text).toContain('Visita técnica');
    expect(text).toContain('Enviar propuesta');
  });
});
