# Condition reference sources

`ui/models/condition-reference.json` holds the condition summaries used by the condition panel, the Anatomy lab and the online assistant's `get_condition_reference` tool. It is read by [`ui/condition-reference.js`](../ui/condition-reference.js) and works offline.

| | |
|---|---|
| Source | MedlinePlus, National Library of Medicine |
| Dataset | MedlinePlus health topics XML, https://medlineplus.gov/xml.html |
| Snapshot | Generated 10/31/2026 02:30:35 (the `generated` field) |
| Integrity | SHA-256 of the source XML in the `xml_sha256` field |
| Contents | 1,017 English health topics: `id`, `title`, `url`, `aliases`, `groups`, `summary` |
| Scope | Health topic summaries, aliases and topic groups only. Not every possible condition, and not a clinical protocol |

## Reuse terms

MedlinePlus health topic summaries are public domain and are reused with the attribution "Source: MedlinePlus, National Library of Medicine." The site shows that attribution, the snapshot date and the topic's MedlinePlus link with every summary. Licensed encyclopedia articles, linked external content, drug monographs, images and logos are not included. No endorsement by the National Library of Medicine is claimed. See https://medlineplus.gov/about/using/usingcontent/.

## Updating

Replace `ui/models/condition-reference.json` with a new export in the same shape, keeping the `source`, `attribution`, `source_url`, `generated`, `xml_sha256` and `scope` fields up to date. Then bump `CACHE` in `ui/sw.js`.
