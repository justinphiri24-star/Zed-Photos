# Zed Photos

**A marketplace for authentic Zambian photography.** Photographers pay a monthly subscription to sell their work and keep 70% of every sale. Customers search for images, preview them with a watermark, choose a licence and pay with mobile money to download the high resolution original.

![Zed Photos logo](assets/img/logo.svg)

## Run it

It's a static site with no build step or dependencies:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

You can also open `index.html` directly, or deploy the folder to any static host such as GitHub Pages, Netlify or Cloudflare Pages.

## What's in the prototype

| Area | Route | What it does |
|---|---|---|
| Home | `#/` | Search, categories, featured images, how it works, business pitch |
| Browse | `#/browse` | Keyword search across title, tags, town, province, category and photographer. Filters for category, province, price and premium clearance. Sorting. |
| Photo | `#/photo/:id` | Watermarked preview, three licences priced by use, model-release status, report link |
| Cart and checkout | `#/cart`, `#/checkout` | MTN MoMo, Airtel Money, Zamtel Kwacha or card. Each number is checked against its network's prefixes (096/076, 097/077, 095/075). |
| Downloads | `#/order/:id`, `#/orders` | Clean high resolution download and a licence certificate for each item |
| Sell | `#/sell` | Starter K50, Professional K150, Studio K350 plans. 70/30 split worked example and earnings calculator |
| Dashboard | `#/dashboard` | Sign up, or open the demo account (Mutale Chanda). KPIs, monthly earnings chart, best sellers, per-photo views and conversion, sales, payouts to mobile money, plan switching |
| Upload | `#/upload` | Drag-and-drop upload with category, location and keywords. Platform or custom pricing within licence ranges, people and model-release flags, a copyright declaration and plan limits |
| Business | `#/business` | Bulk licence packs and account request form |
| Licensing | `#/licensing` | Licence terms, photographer protections, refunds and an image report form |

## Business rules (in `assets/js/data.js`)

- **Commission:** photographers get 70% and the platform keeps 30%. A K50 sale pays the photographer K35 and the platform K15.
- **Licences:**
  - Personal: K10 to K25, platform price K20.
  - Business: K30 to K75, platform price K50.
  - Premium commercial: from K100, platform price K200.
  - Premium is blocked for photos of identifiable people unless a model release is held.
- **Plans:**
  - Starter: K50 a month, up to 100 photos.
  - Professional: K150 a month, up to 1,000 photos.
  - Studio: K350 a month, up to 5,000 photos.
- **Proposed policies:** confirm these with legal and tax advisers before launch.
  - Earnings are held for 7 days to cover the refund window.
  - The minimum payout is K50.
  - Payment fees come out of the platform's 30%.
  - Customer prices include applicable taxes, and photographers declare their own income to ZRA.

All the numbers are suggested launch prices for testing demand. Change them in one place, in `data.js`.

## Demo limitations

- Catalogue images are **generated illustrations** (SVG) standing in for real photographs, so the site runs with no image hosting. Photos uploaded through the dashboard are shown as-is.
- Payments, payouts, subscriptions and forms are **simulated**. No money moves.
- State such as the cart, orders, uploads and payouts is saved only in the visitor's browser (`localStorage`).

## Path to production

1. Backend and database for users, photos, orders, sales and payouts. Use object storage for originals and generate watermarked previews on the server.
2. Mobile money collections and disbursements, such as the MTN MoMo API, Airtel Money API, or an aggregator covering all three networks plus cards.
3. Signed, expiring download URLs so originals are never public.
4. Photographer KYC (NRC or PACRA), model-release document upload, and a moderation queue for reports.
5. Recurring subscription billing, invoicing for business accounts, and earnings statements.
