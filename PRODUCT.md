# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the hackathon jury for the Alliance of Innovation and Industrial Development (AIID) case, watching a live demo on a laptop or projector in a hall and then typing their own queries. Secondary: AIID programme staff who later use the tool on a work laptop to find experts for projects.

The job: describe a need in plain words ("GMP and clinical trials specialist from Almaty") in Russian, Kazakh or English and get the top 3+ experts from a CSV catalogue, each with a reason that can be checked.

## Product Purpose

Sarap replaces dropdown filtering with a written request and returns ranked experts with explanations built only from real profile fields. Success at the defence: a relevant expert in the top 3 on the jury's own queries, a visible justification per expert, availability taken into account, answers well under a second.

## Positioning

Fully offline hybrid search (BM25 + multilingual embeddings, no LLM in the chain): nothing is generated, every reason on a card comes from the expert's own fields. It understands Russian, Kazakh and English queries, typos, wrong keyboard layout and transliteration, and shows how it read the query.

## Operating Context

Demo from a team laptop through Docker (`start.sh` / `start.ps1`), possibly on a projector; jury may also open it from phones on the local network. Screens: Search (main), Data (CSV upload and catalogue), Analytics (top competencies, unmet demand, accuracy on benchmark sets). Interface languages: EN, RU, KK.

## Capabilities and Constraints

- Search with readback of the parsed query (skill, city and industry, conditions, excluded terms), best candidate, two more fits, other candidates, weak-match and filter-only states, expert dialog with "Why not them?" and similar experts, team assembly, feedback (fit / not fit) that reorders similar searches.
- CSV upload up to 10 MB with report; paginated catalogue.
- Offline: no external CDNs at runtime, fonts self-hosted.
- The notice "Data is synthetic and contains no real personal data" must always be visible.
- Match percent formula shown on screen: 60% meaning + 40% coverage, multipliers for same city and busy status.

## Brand Commitments

- Name: Sarap (from "сарапшы", expert).
- Own mark only (viewfinder corners around a dot); the AIID logo is no longer shown in the interface (user decision, 2026-11-21).
- Everything else in the visual identity (palette, type, mark, forms) is open for replacement (user decision, 2026-11-21).

## Evidence on Hand

Synthetic catalogue of 150 experts (`backend/data/experts.csv`), benchmark results (hit@3: 7/7, 10/10, 14/15, 12/12), blind stress set ~96%. No real customers, testimonials or usage numbers exist; none may be invented.

## Product Principles

- Show the reading, not just the answer: the parsed query is part of the result.
- Every claim on a card is traceable to a profile field.
- A weak result must look weak; a score must not look like success when it is not.
- Works with no network, in three languages, on any CSV.
