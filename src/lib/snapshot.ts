import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { AppState } from '../types';
import { computeTax } from './uk-tax';
import { effectiveSalary } from './salary';
import { housingMonthly, housingLabel } from './housing';
import { annualAmount, isActive, expandOccurrences } from './frequency';
import { combinedXlsx } from './import-export';
import { addMonths } from 'date-fns';

const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0);
const fmt2 = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n || 0);

export async function snapshotPdf(state: AppState, _hostEl?: HTMLElement): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();

  const eff = effectiveSalary(state.profile, state.employers);
  const tax = computeTax({ ...state.profile, salary: eff.value }, state.sideIncomes);
  const housingMo = housingMonthly(state.housing);
  const housingKindLabel = housingLabel(state.housing);

  // Cover page
  doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.text('Finance Snapshot', PAGE_W / 2, 80, { align: 'center' });
  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text(state.profile.firstName ? `${state.profile.firstName}'s finances` : 'UK Finance & Budget', PAGE_W / 2, 110, { align: 'center' });
  doc.setTextColor(100);
  doc.text(`Generated ${format(new Date(), 'EEEE d MMMM yyyy HH:mm')}`, PAGE_W / 2, 130, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 180,
    theme: 'plain',
    head: [['At a glance', '']],
    body: [
      ['Take-home (annual)', fmt(tax.takeHome)],
      ['Take-home (monthly)', fmt(tax.takeHome / 12)],
      ['Income tax (annual)', fmt(tax.incomeTax)],
      ['National Insurance (annual)', fmt(tax.nationalInsurance)],
      ['Pension contributions (annual)', fmt(tax.pension)],
      ['Employer pension (annual)', fmt(tax.employerPension)],
      ['Student loan (annual)', fmt(tax.studentLoan)],
      ['Bills + debts (monthly)', fmt(monthlyOut(state) + housingMo)],
      ['Savings contributions (monthly)', fmt(monthlySav(state))]
    ],
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
  });
  pageFooter(doc, 'Finance snapshot — 1');

  // Income & Tax
  doc.addPage();
  pageHeader(doc, 'Income, Tax & Employment');
  autoTable(doc, {
    startY: 70,
    head: [['Field', 'Value']],
    body: [
      ['Reference salary (annual)', fmt(state.profile.salary)],
      ['Effective salary used', `${fmt(eff.value)} (${eff.source}${eff.meta ? ` · ${eff.meta}` : ''})`],
      ['Region', state.profile.region],
      ['Tax code', state.profile.taxCode],
      ['Employment type', state.profile.employmentType],
      ['Pension scheme', state.profile.pensionScheme],
      ['Your contribution %', `${state.profile.pensionPct}%`],
      ['Employer contribution %', `${state.profile.employerPensionPct}%`],
      ['Student loan plans', (state.profile.studentLoanPlans ?? []).join(', ') || 'None'],
      ['Marriage allowance', state.profile.marriageAllowance]
    ],
    styles: { fontSize: 10 }
  });
  if (state.employers.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Employer', 'Kind', 'Start', 'End', 'Annual ref', 'Wage slips']],
      body: state.employers.map(e => [e.name, e.kind, e.startDate, e.endDate ?? 'current', fmt(e.annualRefSalary), String(e.wageSlips.length)]),
      styles: { fontSize: 10 }
    });
  }
  pageFooter(doc, 'Income, Tax & Employment — 2');

  // Bills & Housing
  doc.addPage();
  pageHeader(doc, 'Bills & Housing');
  if (housingKindLabel) {
    autoTable(doc, {
      startY: 70,
      head: [['Housing', '']],
      body: [
        ['Type', housingKindLabel],
        ['Monthly cost', fmt2(housingMo)],
        ['Provider', state.housing.type === 'mortgage' ? state.housing.mortgage?.provider ?? '' : state.housing.rent?.provider ?? ''],
        ['Account ref', state.housing.type === 'mortgage' ? state.housing.mortgage?.accountRef ?? '' : state.housing.rent?.accountRef ?? ''],
        ['Start', state.housing.type === 'mortgage' ? state.housing.mortgage?.startDate ?? '' : state.housing.rent?.startDate ?? ''],
        ['Term', state.housing.type === 'mortgage' ? `${state.housing.mortgage?.termYears ?? ''} years` : `${state.housing.rent?.termMonths ?? ''} months`]
      ],
      styles: { fontSize: 10 }
    });
  }
  const billRows = state.payments.filter(p => p.kind === 'bill').map(p => {
    const cat = state.categories.find(c => c.id === p.categoryId);
    const yr = annualAmount(p.amount, p.frequency);
    return [p.name, cat?.name ?? '—', p.provider, fmt2(p.amount), p.frequency, fmt2(yr / 12), fmt(yr)];
  });
  autoTable(doc, {
    startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 16 : 70,
    head: [['Name', 'Category', 'Provider', 'Amount', 'Frequency', 'Monthly', 'Annual']],
    body: billRows.length ? billRows : [['(no bills)', '', '', '', '', '', '']],
    styles: { fontSize: 9 }
  });
  pageFooter(doc, 'Bills & Housing — 3');

  // Debts
  doc.addPage();
  pageHeader(doc, 'Debts');
  const debtRows = state.payments.filter(p => p.kind === 'debt').map(p => {
    const yr = annualAmount(p.amount, p.frequency);
    return [p.name, p.provider, p.accountRef, fmt2(p.amount), p.frequency, p.endDate ?? '', fmt(yr), p.notes ?? ''];
  });
  autoTable(doc, {
    startY: 70,
    head: [['Name', 'Provider', 'Ref', 'Amount', 'Frequency', 'End', 'Annual', 'Notes']],
    body: debtRows.length ? debtRows : [['(no debts)', '', '', '', '', '', '', '']],
    styles: { fontSize: 9 }
  });
  pageFooter(doc, 'Debts — 4');

  // Savings
  doc.addPage();
  pageHeader(doc, 'Savings');
  const savingRows = state.payments.filter(p => p.kind === 'saving').map(p => {
    const yr = annualAmount(p.amount, p.frequency);
    return [p.name, p.provider, fmt2(p.amount), p.frequency, fmt(yr / 12), fmt(yr)];
  });
  autoTable(doc, {
    startY: 70,
    head: [['Name', 'Provider', 'Amount', 'Frequency', 'Monthly', 'Annual']],
    body: savingRows.length ? savingRows : [['(no savings)', '', '', '', '', '']],
    styles: { fontSize: 9 }
  });
  pageFooter(doc, 'Savings — 5');

  // Net worth + home
  doc.addPage();
  pageHeader(doc, 'Net worth');
  const totalAssets = (state.assets ?? []).reduce((s, a) => s + a.value, 0) + (state.home?.valuations.at(-1)?.value ?? state.home?.purchasePrice ?? 0);
  autoTable(doc, {
    startY: 70,
    head: [['Total assets', fmt(totalAssets)]],
    body: (state.assets ?? []).map(a => [a.name, a.type, fmt(a.value)]),
    styles: { fontSize: 10 }
  });
  if (state.home) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Home', '']],
      body: [
        ['Address', state.home.address ?? '—'],
        ['Purchase price', fmt(state.home.purchasePrice)],
        ['Purchase month', state.home.purchaseYearMonth],
        ['Latest valuation', state.home.valuations.at(-1)?.value ? fmt(state.home.valuations.at(-1)!.value) : '—']
      ],
      styles: { fontSize: 10 }
    });
    if (state.home.valuations.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Month', 'Value', 'Source', 'Notes']],
        body: state.home.valuations.map(v => [v.yearMonth, fmt(v.value), v.source, v.notes ?? '']),
        styles: { fontSize: 9 }
      });
    }
  }
  pageFooter(doc, 'Net worth — 6');

  // Calendar — next 30 days
  doc.addPage();
  pageHeader(doc, 'Next 30 days');
  const from = new Date();
  const to = addMonths(from, 1);
  const events: { date: string; label: string; meta: string }[] = [];
  for (const p of state.payments) {
    if (!isActive(p, from)) continue;
    for (const d of expandOccurrences(p, from, to)) {
      const cat = state.categories.find(c => c.id === p.categoryId);
      events.push({ date: format(d, 'EEE d MMM'), label: p.name, meta: `${fmt2(p.amount)} · ${cat?.name ?? p.kind}` });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Event', 'Detail']],
    body: events.length ? events.map(e => [e.date, e.label, e.meta]) : [['(none)', '', '']],
    styles: { fontSize: 10 }
  });
  pageFooter(doc, 'Calendar — 7');

  // Footer / disclaimer
  doc.addPage();
  pageHeader(doc, 'Notes');
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  const disclaimer = [
    'This snapshot is generated locally on your device by the UK Finance & Budget app.',
    '',
    'All figures are estimates based on UK 2025/26 reference values, the data you have',
    'entered, and your tax code. They are guidance only and not personal financial,',
    'tax or legal advice.',
    '',
    'Verify against gov.uk and consider speaking to a qualified adviser for your',
    'situation. Tax law and thresholds change between tax years; rates differ for',
    'Scotland, Wales and the rest of the UK.',
    '',
    'Useful links:',
    '  • https://www.gov.uk/income-tax-rates',
    '  • https://www.gov.uk/national-insurance',
    '  • https://www.gov.uk/tax-codes',
    '  • https://www.gov.uk/personal-tax-account'
  ];
  let y = 80;
  for (const line of disclaimer) { doc.text(line, 60, y); y += 16; }
  pageFooter(doc, 'Notes & disclaimer — 8');

  return doc.output('blob');
}

function pageHeader(doc: jsPDF, title: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 40);
  doc.setDrawColor(220); doc.setLineWidth(0.5); doc.line(40, 50, W - 40, 50);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(140);
  doc.text(`UK Finance & Budget · ${format(new Date(), 'd MMM yyyy')}`, W - 40, 40, { align: 'right' });
  doc.setTextColor(0);
}

function pageFooter(doc: jsPDF, label: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(9); doc.setTextColor(160);
  doc.text(label, 40, H - 20);
  doc.text('Generated locally — no data leaves your device.', W - 40, H - 20, { align: 'right' });
  doc.setTextColor(0);
}

function monthlyOut(state: AppState): number {
  const now = new Date();
  return state.payments.filter(p => isActive(p, now) && p.kind !== 'saving')
    .reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
}
function monthlySav(state: AppState): number {
  const now = new Date();
  return state.payments.filter(p => isActive(p, now) && p.kind === 'saving')
    .reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
}

/**
 * XLSX snapshot is the combined backup, packaged the same way (one sheet per section).
 */
export function snapshotXlsx(state: AppState): Blob {
  return combinedXlsx(state);
}
