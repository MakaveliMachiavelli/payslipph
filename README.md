# PayslipPH — Free 13th Month Pay & Payslip Generator (PH Small Business)

**Live:** https://makavelimachiavelli.github.io/payslipph/

## What it is
One screen computes a PH employee's whole payslip: SSS/PhilHealth/Pag-IBIG employee shares (rates editable with sensible defaults), TRAIN monthly withholding tax, 13th month (basic ÷ 12, months-worked aware), net pay — then prints a clean payslip. No signup, all client-side.

**Free:** single-employee computation + printable payslip + editable statutory rates.
**PRO (₱149 one-time, GCash):** saved staff list, batch payslips (one per page), payroll CSV export.

## Buyer persona
- **Who:** small PH employers (sari-sari/carinderia with 1-3 staff, online shops with helpers, small agencies) + first-time HR; also employees verifying their own payslip/13th month.
- **Pain:** computing 13th month + statutory deductions correctly; payroll SaaS (Sprout, etc.) is enterprise-priced; free calculators cover 13th month only.
- **Why pay ₱149:** one batch print run of everyone's payslips beats ₱-per-employee SaaS; CSV feeds bookkeeping.
- **Where they hang out:** FB small-business/employer groups, "how to compute 13th month pay" Google searches (huge every Nov-Dec), r/phinvest.

## Demand evidence (per REVENUE GATES)
- Paid: Etsy PH payroll Excel templates (~$6.68, sale from $10.28), Sprout Solutions (paid SaaS), NextPay (paid payroll service) = 3+ paid competitors.
- Free-but-fragmented: FilipiKnow Excel template (13th month only), NextPay/Sprout calculators (lead magnets) — none give a full printable payslip without signup.

## Monetization
GCash QR + unlock code (see `PAYMENTS.md`), same proven mechanics.

## Tech
Static HTML/CSS/vanilla JS; TRAIN monthly withholding table encoded; batch print via cloned docs + page-break CSS. Tested: 22/22 jsdom assertions (statutory math incl. MSC caps/brackets, 13th-month proration, PRO batch flow).

## Deploy
```bash
git init && git add -A && git commit -m "PayslipPH v1"
gh repo create payslipph --public --source=. --push
gh api -X POST repos/MakaveliMachiavelli/payslipph/pages -f "source[branch]=main" -f "source[path]=/"
```
