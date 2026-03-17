# Airtable Schema Update — Multi-Angle Reuse + Editorial Learning

Use this prompt with Airtable AI (or paste into the Airtable interface) to make the required schema changes to the **ideas** table in base `appgvQDqiFZ3ESigA`.

---

## Prompt

I need to update the schema of an Airtable table called **ideas** (table ID: `tblVKVojZscMG6gDk`) in my base. Please make the following changes:

---

### 1. Add four new fields

**Field 1**
- Name: `used_angle_indexes`
- Type: Long text
- Description: Stores a JSON array of angle indexes that have been published from this idea. Example value: `[0, 2]`. Null means no angles have been published yet.

**Field 2**
- Name: `angles_total`
- Type: Number
- Number format: Integer (no decimals)
- Description: Total number of angles in this idea's UIF. Set at capture time. Null on ideas captured before this field was added — treat null as unknown total.

**Field 3**
- Name: `best_angle_index`
- Type: Number
- Number format: Integer (no decimals)
- Description: The angle_index (0-based) of the highest-performing published post from this idea. Null until the first post from this idea is scored.

**Field 4**
- Name: `best_angle_score`
- Type: Number
- Number format: Decimal (1 decimal place)
- Description: The performance_score (0–10) of the best-performing published post from this idea. Null until the first post from this idea is scored.

---

### 2. Add two new options to the Status field

The **Status** field is a single select field. Add these two new options:

- `In Use` — idea has at least one active post stub in the pipeline (researching, drafted, or awaiting publish)
- `Exhausted` — all angles from this idea have been published; idea is permanently out of the candidate pool

Do not remove or rename any existing options.

---

### Summary of changes

| Change | Field | Type | Action |
|--------|-------|------|--------|
| New field | `used_angle_indexes` | Long text | Add |
| New field | `angles_total` | Number (integer) | Add |
| New field | `best_angle_index` | Number (integer) | Add |
| New field | `best_angle_score` | Number (decimal) | Add |
| Status option | `In Use` | Single select option | Add |
| Status option | `Exhausted` | Single select option | Add |

No existing fields, views, or automations need to be modified. These are purely additive changes.
