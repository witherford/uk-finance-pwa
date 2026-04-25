// Curated official gov.uk references. Used across the Learning Centre, tax engine
// surfaces, and tool calculators so users can verify figures or read more.
export interface GovLink { label: string; url: string; }

export const GOV_UK: Record<string, GovLink[]> = {
  taxCodes: [
    { label: 'Tax codes (overview)', url: 'https://www.gov.uk/tax-codes' },
    { label: 'What your tax code means', url: 'https://www.gov.uk/tax-codes/letters-in-your-tax-code-what-they-mean' },
    { label: 'Emergency tax codes (W1/M1/X)', url: 'https://www.gov.uk/tax-codes/emergency-tax-codes' }
  ],
  incomeTaxRates: [
    { label: 'Income Tax rates and Personal Allowances', url: 'https://www.gov.uk/income-tax-rates' },
    { label: 'Income Tax rates – Scotland', url: 'https://www.gov.uk/scottish-income-tax' },
    { label: 'Reduced Personal Allowance over £100,000', url: 'https://www.gov.uk/income-tax-rates/income-over-100000' }
  ],
  paye: [
    { label: 'PAYE for employees – understand your payslip', url: 'https://www.gov.uk/check-income-tax-current-year' },
    { label: 'Check your Income Tax for the current year', url: 'https://www.gov.uk/check-income-tax-current-year' }
  ],
  selfEmployed: [
    { label: 'Self-employed: tax & National Insurance', url: 'https://www.gov.uk/self-employed-national-insurance-rates' },
    { label: 'Self Assessment tax returns', url: 'https://www.gov.uk/self-assessment-tax-returns' },
    { label: 'Class 2 NI changes', url: 'https://www.gov.uk/self-employed-national-insurance-rates' }
  ],
  ni: [
    { label: 'National Insurance – overview', url: 'https://www.gov.uk/national-insurance' },
    { label: 'National Insurance rates and categories', url: 'https://www.gov.uk/national-insurance-rates-letters' },
    { label: 'Voluntary contributions (Class 3)', url: 'https://www.gov.uk/voluntary-national-insurance-contributions' },
    { label: 'Check your NI record', url: 'https://www.gov.uk/check-national-insurance-record' }
  ],
  pension: [
    { label: 'Workplace pensions overview', url: 'https://www.gov.uk/workplace-pensions' },
    { label: 'Tax on private pensions', url: 'https://www.gov.uk/tax-on-pension' },
    { label: 'State Pension', url: 'https://www.gov.uk/state-pension' },
    { label: 'Pension Annual Allowance', url: 'https://www.gov.uk/tax-on-your-private-pension/annual-allowance' }
  ],
  studentLoans: [
    { label: 'Student loan repayment plans', url: 'https://www.gov.uk/repaying-your-student-loan/which-repayment-plan-you-are-on' },
    { label: 'Student loan repayment thresholds & rates', url: 'https://www.gov.uk/repaying-your-student-loan/what-you-pay' }
  ],
  marriageAllowance: [
    { label: 'Marriage Allowance', url: 'https://www.gov.uk/marriage-allowance' },
    { label: 'Apply for Marriage Allowance', url: 'https://www.gov.uk/apply-marriage-allowance' }
  ],
  stampDuty: [
    { label: 'Stamp Duty Land Tax (England & NI)', url: 'https://www.gov.uk/stamp-duty-land-tax' },
    { label: 'SDLT residential rates', url: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates' },
    { label: 'SDLT for first-time buyers', url: 'https://www.gov.uk/guidance/stamp-duty-land-tax-relief-for-land-or-property-transactions' },
    { label: 'Land Transaction Tax (Wales)', url: 'https://www.gov.wales/land-transaction-tax-guide' },
    { label: 'Land and Buildings Transaction Tax (Scotland)', url: 'https://revenue.scot/taxes/land-buildings-transaction-tax' }
  ],
  isa: [
    { label: 'ISAs – overview', url: 'https://www.gov.uk/individual-savings-accounts' },
    { label: 'ISA limits & types', url: 'https://www.gov.uk/individual-savings-accounts/how-isas-work' }
  ],
  cgt: [
    { label: 'Capital Gains Tax', url: 'https://www.gov.uk/capital-gains-tax' },
    { label: 'CGT rates and allowances', url: 'https://www.gov.uk/capital-gains-tax/rates' }
  ],
  iht: [
    { label: 'Inheritance Tax', url: 'https://www.gov.uk/inheritance-tax' }
  ],
  vat: [
    { label: 'VAT', url: 'https://www.gov.uk/vat-rates' }
  ],
  dividend: [
    { label: 'Tax on dividends', url: 'https://www.gov.uk/tax-on-dividends' }
  ],
  council: [
    { label: 'Council Tax', url: 'https://www.gov.uk/council-tax' },
    { label: 'Find your council', url: 'https://www.gov.uk/find-local-council' }
  ],
  ssp: [
    { label: 'Statutory Sick Pay (employees)', url: 'https://www.gov.uk/statutory-sick-pay' },
    { label: 'SSP – employers', url: 'https://www.gov.uk/employers-sick-pay' },
    { label: 'Employment and Support Allowance (ESA)', url: 'https://www.gov.uk/employment-support-allowance' }
  ],
  leave: [
    { label: 'Holiday entitlement', url: 'https://www.gov.uk/holiday-entitlement-rights' },
    { label: 'Maternity / paternity / shared parental leave', url: 'https://www.gov.uk/browse/working/time-off' },
    { label: 'Carer’s Leave', url: 'https://www.gov.uk/carers-leave' }
  ],
  childcare: [
    { label: 'Child Benefit', url: 'https://www.gov.uk/child-benefit' },
    { label: 'High Income Child Benefit Charge', url: 'https://www.gov.uk/child-benefit-tax-charge' },
    { label: 'Tax-Free Childcare', url: 'https://www.gov.uk/tax-free-childcare' },
    { label: '30 hours free childcare', url: 'https://www.gov.uk/30-hours-free-childcare' },
    { label: 'Universal Credit', url: 'https://www.gov.uk/universal-credit' }
  ],
  mortgage: [
    { label: 'Help to Buy & first home schemes', url: 'https://www.gov.uk/affordable-home-ownership-schemes' },
    { label: 'Stamp Duty Land Tax', url: 'https://www.gov.uk/stamp-duty-land-tax' }
  ],
  general: [
    { label: 'Personal tax account', url: 'https://www.gov.uk/personal-tax-account' },
    { label: 'HMRC contacts', url: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact' },
    { label: 'MoneyHelper (impartial guidance)', url: 'https://www.moneyhelper.org.uk/' }
  ]
};
