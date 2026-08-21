# 12 — UI Design System

Vertofi must feel like **Stripe / Linear / Mercury / Vercel / Ramp / Brex / Notion** — premium, calm, expensive. **Never** like Tally / Zoho Books / traditional CA software / a government portal. More whitespace = more expensive.

## Color distribution (strict)
| Share | Color | Use |
|------|-------|-----|
| 80% | White `#FFFFFF` | Everything / canvas |
| 15% | Blue `#1378F8` | Primary actions, accents, the only glow |
| 4% | Gold `#D59A07` | Premium / success / elite / protection |
| 1% | Red `#EB1E1E` | Risk / compliance issue / penalty / critical alert only |

- Backgrounds: main `#FFFFFF`, secondary `#F8FAFC`, borders `#E5E7EB`.
- **Red is never branding** — only danger. **Gold means** Pro plan, Business Lifeguard, Warranty, Trust Vault, "Certified Financially Fit."

## Buttons
- **Primary:** bg `#1378F8`, white text — only Create / Save / Continue / Connect.
- **Secondary:** white, border `#DDE5F0`, text `#111827` — most buttons.
- **Premium:** white, gold border + gold text `#D59A07` — Upgrade / Pro features / Lifeguard. Subtle.

## Typography
**Inter** or **Geist**. Weights: 700 headings · 600 card titles · 500 navigation · 400 content. No bold everywhere.

## Cards (the platform is card-based)
- Background white · border `1px solid #F1F5F9` · radius **24px** · shadow `0 4px 24px rgba(0,0,0,.04)`.
- **Glass hover:** `transform: translateY(-2px)`. **Glow:** blue only `0 0 40px rgba(19,120,248,.15)` — no red/gold glow.

```
┌─────────────────────┐
│ Business Health     │
│                     │
│ 92/100              │
│ Excellent           │  ← gold badge
└─────────────────────┘
```

## Dashboard = "Mission Control" (not a generic sidebar+charts+tables)
- **Top:** three large cards — Business Health Score · Cash Position · Compliance Status.
- **Middle:** **MoneyMap** as a huge animated flow network — money entering / leaving, profit zones, leak zones; smooth, Apple-like. The wow factor.
- **Bottom:** Actions Needed · Predictions · Alerts.

## Navigation (minimal — no 25 menu items)
`Logo · Dashboard · Finances · Compliance · Intelligence · Reports` — separated — `Settings · Billing`.

## Health Score (can be iconic)
Huge `92`, small "Business Health Score" beneath, gold "Excellent" badge.

## Predictive warnings (premium cards, not ugly alerts)
> ⚠ GST Liability May Increase — Projected increase ₹18,240 — Recommended: delay invoice by 4 days.

## Data display
Avoid traditional tables → **modern data grids** (Linear / Stripe / Notion style).

## Animations (critical)
**Framer Motion**, 200–300ms, ease-out, no bouncing → feels professional.

## Landing page (Stripe + Ramp + Linear)
Sections: Hero ("Trusted Financial Intelligence") · MoneyMap demo · Business Health Score · Predictive Alerts · Protection Layer · Pricing · FAQ · CTA. Large whitespace, massive typography, minimal text, beautiful product screenshots. **Services dropdown** links to the 7 panels ([03](./03-panels-and-hierarchy.md)).

## Tokens (to implement in Tailwind config)
```
colors: { brand:#1378F8, gold:#D59A07, danger:#EB1E1E,
          bg:#FFFFFF, bg2:#F8FAFC, border:#E5E7EB, borderCard:#F1F5F9, ink:#111827 }
radius: { card: 24px }
shadow: { card: 0 4px 24px rgba(0,0,0,.04), glow: 0 0 40px rgba(19,120,248,.15) }
font:   { sans: Inter / Geist }
motion: { dur: 200–300ms, ease: ease-out }
```
