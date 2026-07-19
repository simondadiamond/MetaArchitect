# Variant overlay — Retail / Product

For shops, e-commerce, makers, food producers: anyone selling things. Paste this section
into the master CLAUDE.md at `{{VARIANT_SECTION}}` and fill the tokens.

---

## Product business specifics

- **Catalog:** `operations/products.md` is the source of truth: item, price, cost if
  known, supplier, stock notes. Every product mention in a draft checks this file first.
- **Where we sell:** {{SALES_CHANNELS}} (store / market / online platform). Platform
  fees and rules live in `operations/policies.md`; respect them in any promo draft.
- **Restock signals:** when a customer note or sales mention implies low stock, add a
  line to `operations/restock-watch.md`. The weekly review reads it aloud.
- **Promos and posts:** drafted into `content/`, never published by you. Every price in
  a promo is read from the catalog the same day, not remembered.
- **Custom orders:** treat like a service job: requirements in the customer's folder,
  quote via quote-builder, deposit rule from `operations/policies.md`.
- **Seasonality:** {{SEASONAL_NOTES}} — the weekly review flags upcoming peaks 4 weeks out.
