import { useState } from 'react';
import { PageHeader, GovLinks } from '../components/common';
import { GOV_UK } from '../lib/gov-uk-links';

interface Article {
  id: string;
  title: string;
  emoji: string;
  body: React.ReactNode;
  refs?: keyof typeof GOV_UK | (keyof typeof GOV_UK)[];
}

const ARTICLES: Article[] = [
  {
    id: 'jargon', title: 'Jargon buster', emoji: '📖',
    refs: ['general', 'isa', 'pension'],
    body: (
      <div className="space-y-2">
        <Def t="PAYE" d="Pay As You Earn — your employer withholds tax and NI before paying you." />
        <Def t="Tax code" d="A code (e.g. 1257L) HMRC issues telling your employer how much tax-free pay you get and how to apply it." />
        <Def t="Personal Allowance" d="The amount of income you can earn each tax year before paying income tax. Standard 2025/26: £12,570." />
        <Def t="National Insurance (NI)" d="A separate tax that funds state benefits like the State Pension and NHS. Different 'classes' apply for employees vs self-employed." />
        <Def t="Self Assessment" d="The system HMRC uses for self-employed people (and some others) to declare and pay tax once a year." />
        <Def t="ISA" d="Individual Savings Account — a tax-free savings/investments wrapper. £20,000/yr allowance." />
        <Def t="SIPP" d="Self-Invested Personal Pension — a DIY pension with tax relief on contributions." />
        <Def t="AER" d="Annual Equivalent Rate — a standardised way to compare savings rates including compounding." />
        <Def t="APR" d="Annual Percentage Rate — the cost of borrowing including fees, expressed annually." />
        <Def t="Salary sacrifice" d="You agree to swap part of your salary for a benefit (commonly pension). Reduces income tax AND NI." />
        <Def t="Marginal rate" d="The rate of tax you pay on the next pound earned." />
        <Def t="P60 / P45 / P11D" d="Year-end summary, leaving certificate, benefits-in-kind statement respectively." />
      </div>
    )
  },
  {
    id: 'paye', title: 'How PAYE works', emoji: '💼',
    refs: ['paye', 'taxCodes', 'incomeTaxRates'],
    body: (
      <div className="space-y-3 text-sm">
        <p>If you're employed, your employer runs PAYE on your behalf. Each pay period they:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Calculate your gross pay for that period.</li>
          <li>Apply your tax code to work out how much of that pay is tax-free.</li>
          <li>Deduct income tax (20/40/45% bands in rUK) and Class 1 NI.</li>
          <li>Deduct any pension contributions according to the scheme type.</li>
          <li>Send the deductions to HMRC and pay you the net.</li>
        </ol>
        <p>Most codes are <em>cumulative</em>: each pay period considers your year-to-date earnings, smoothing things out over the year. <em>Non-cumulative</em> codes (W1, M1, X) treat each period in isolation — common when you start a job mid-year without a P45.</p>
      </div>
    )
  },
  {
    id: 'se', title: 'Self-employed basics', emoji: '🛠️',
    refs: ['selfEmployed', 'ni'],
    body: (
      <div className="space-y-3 text-sm">
        <p>If you're self-employed (sole trader) you pay tax through Self Assessment.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You owe income tax on profits above your Personal Allowance.</li>
          <li>You pay Class 4 NI on profits above the lower profits limit.</li>
          <li>Class 2 NI was historically a flat weekly amount; from April 2024 it's no longer compulsory if profits are above the small profits threshold, but you can pay it voluntarily to keep your NI record.</li>
          <li>Self Assessment is filed by 31 January for the previous tax year, with payments-on-account due 31 January and 31 July.</li>
          <li>Keep records of income and allowable expenses; consider the £1,000 trading allowance if income is small.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'ni', title: 'National Insurance classes', emoji: '🏥',
    refs: 'ni',
    body: (
      <div className="space-y-2 text-sm">
        <Def t="Class 1" d="Employees — paid on earnings above the Primary Threshold." />
        <Def t="Class 1A / 1B" d="Employer-only NI on benefits in kind." />
        <Def t="Class 2" d="Self-employed (now voluntary above small profits threshold)." />
        <Def t="Class 3" d="Voluntary contributions to fill gaps in your NI record." />
        <Def t="Class 4" d="Self-employed — paid on profits above the lower profits limit." />
        <p>Your NI record affects entitlement to the State Pension and some benefits. Check your record on gov.uk.</p>
      </div>
    )
  },
  {
    id: 'taxes', title: 'Types of UK tax', emoji: '🧾',
    refs: ['incomeTaxRates', 'ni', 'vat', 'cgt', 'iht', 'dividend', 'council', 'stampDuty'],
    body: (
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Income tax</strong> — earnings, savings interest above the personal savings allowance, dividends above the dividend allowance.</li>
        <li><strong>National Insurance</strong> — earnings/profits.</li>
        <li><strong>VAT</strong> — most goods and services, paid through purchase price; businesses register above the threshold.</li>
        <li><strong>Capital Gains Tax (CGT)</strong> — profit on selling assets above the annual exempt amount.</li>
        <li><strong>Council Tax</strong> — set by local authority, based on property band.</li>
        <li><strong>Stamp Duty Land Tax (SDLT)</strong> — on property purchases above thresholds.</li>
        <li><strong>Inheritance Tax (IHT)</strong> — on estates above the nil-rate band.</li>
        <li><strong>Dividend tax</strong> — on dividends above the dividend allowance, with three rate bands.</li>
      </ul>
    )
  },
  {
    id: 'sickpay', title: 'Sick pay & SSP', emoji: '🤒',
    refs: 'ssp',
    body: (
      <div className="space-y-2 text-sm">
        <p>Statutory Sick Pay (SSP) is paid by your employer if you're too ill to work, after a 'waiting period' of 3 days.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must earn at least the lower earnings limit on average.</li>
          <li>SSP is paid for up to 28 weeks per period of incapacity.</li>
          <li>Many employers pay <em>contractual sick pay</em> on top — check your contract.</li>
          <li>If you're self-employed, SSP doesn't apply — look at Employment and Support Allowance instead.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'leave', title: 'Annual leave & entitlements', emoji: '🏖️',
    refs: 'leave',
    body: (
      <div className="space-y-2 text-sm">
        <p>Almost all UK workers are entitled to a minimum of <strong>5.6 weeks paid holiday</strong> per year (28 days for a 5-day-week worker — bank holidays may or may not be included).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Part-time workers get a pro-rated entitlement.</li>
          <li>Holiday pay is calculated from average earnings over the previous 52 weeks.</li>
          <li>Maternity, paternity, shared parental, adoption, and parental bereavement leave each have their own rules and pay.</li>
          <li>Carers can take up to 1 week of unpaid Carer's Leave per year (Apr 2024 onwards).</li>
        </ul>
      </div>
    )
  },
  {
    id: 'support', title: 'Support: Child Benefit, Tax-Free Childcare, Universal Credit', emoji: '👶',
    refs: 'childcare',
    body: (
      <div className="space-y-2 text-sm">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Child Benefit</strong> — paid for each eligible child. The High Income Child Benefit Charge tapers it back if you or your partner earn over the threshold.</li>
          <li><strong>Tax-Free Childcare</strong> — Government adds 20% to money you put in a childcare account, up to a cap, for eligible childcare.</li>
          <li><strong>30 hours free childcare</strong> — being expanded to younger children in stages — check current eligibility.</li>
          <li><strong>Universal Credit</strong> — replaces several legacy benefits; calculated on a monthly assessment-period basis.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'disclaimer', title: 'Important disclaimer', emoji: '⚠️',
    refs: 'general',
    body: (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This app provides general information for the UK based on 2025/26 reference figures and is not personal financial, tax or legal advice. Tax law changes; rates and thresholds for Scotland, Wales and the rest of the UK can differ. Always verify against gov.uk and consider speaking to a qualified adviser for your situation.
      </p>
    )
  }
];

function refsFor(refs: Article['refs']): { label: string; url: string }[] {
  if (!refs) return [];
  const keys = Array.isArray(refs) ? refs : [refs];
  return keys.flatMap(k => GOV_UK[k]);
}

function Def({ t, d }: { t: string; d: string }) {
  return <div className="text-sm"><span className="font-semibold">{t}:</span> <span className="text-slate-600 dark:text-slate-300">{d}</span></div>;
}

export function Learn() {
  const [active, setActive] = useState(ARTICLES[0].id);
  const article = ARTICLES.find(a => a.id === active)!;

  return (
    <div>
      <PageHeader title="Learning centre" subtitle="Plain-English guides to UK money basics" />
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        <nav className="card overflow-hidden">
          {ARTICLES.map(a => (
            <button
              key={a.id}
              onClick={() => setActive(a.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${active === a.id ? 'bg-brand-500 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <span className="mr-2">{a.emoji}</span>{a.title}
            </button>
          ))}
        </nav>
        <article className="card card-pad">
          <h2 className="text-xl font-bold mb-3">{article.emoji} {article.title}</h2>
          {article.body}
          <GovLinks links={refsFor(article.refs)} />
        </article>
      </div>
    </div>
  );
}
