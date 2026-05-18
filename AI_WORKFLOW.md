# AI_WORKFLOW.md — AI-Assisted Engineering Log

## Project: BiztelAI Workflow Automation System

---

## AI Tools Used

| Tool | Role |
|---|---|
| **Claude (Anthropic)** | Primary coding assistant — architecture, all code generation |
| **Claude claude-opus-4-5 (API)** | Runtime OCR/extraction engine inside the app |

---

## How AI Was Used During Development

### 1. Architecture Design
Claude was used to design the full system architecture from scratch — deciding on Express + SQLite + React + Vite as the tech stack for zero-config simplicity and fast setup. The data flow (upload → extract → validate → review → approve) was designed conversationally.

### 2. Code Generation
- **100% of boilerplate** (package.json, vite config, folder structure) was AI-generated
- **Backend routes** (uploads, records, analytics) were written with Claude, then reviewed for correctness
- **Validation rules** were specified as plain English requirements and translated to code by Claude
- **Frontend components** (all 5 pages + CSS design system) were generated with explicit design direction

### 3. Prompt Engineering (Extraction)
The extraction prompt in `backend/middleware/extraction.js` was iterated:
- v1: Basic "extract fields" prompt — returned inconsistent JSON
- v2: Added explicit JSON schema with field types — much more consistent
- v3: Added confidence scoring instructions with guidelines (0.9 = clear, 0.5 = guessed) — best results
- Final: Added date normalization, time conversion (hrs), and null vs empty string distinction

### 4. Debugging Workflow
When issues arose (e.g., CORS, multer file filtering, SQLite JSON parsing), Claude was used to diagnose and fix by providing error messages and asking for targeted fixes. This was faster than Stack Overflow for most issues.

---

## Areas Where AI Helped Most

1. **Extraction prompt engineering** — Getting Claude to return clean JSON reliably from messy handwritten docs required precise prompting. AI helped iterate fast.
2. **SQL queries for analytics** — Complex aggregation queries (shift summaries, machine totals, trend data) were generated correctly on the first try.
3. **CSS design system** — The full dark-theme design system with CSS variables was generated in one pass with a clear aesthetic direction.
4. **Validation logic** — Converting "business rules" (from the assignment spec) into actual validation code was straightforward with AI assistance.

---

## Areas Requiring Manual Intervention

1. **API key setup and .env configuration** — Manual step, cannot be automated
2. **Testing with real handwritten docs** — Requires actual document samples to verify extraction quality
3. **Edge cases in confidence scoring** — Threshold values (0.5, 0.75) were manually tuned based on what felt right
4. **File path handling on Windows vs Linux** — Required manual review of `path.join()` usage
5. **Deployment configuration** — Production CORS settings needed manual adjustment

---

## Prompting Strategy

### For code generation:
```
"Build a [specific component] that [specific behavior]. 
Use [technology]. 
It should handle [edge cases].
Return [format]."
```

### For the extraction prompt inside the app:
```
"You are an OCR specialist for manufacturing documents.
Extract [fields] and return ONLY valid JSON with [schema].
Confidence: [scoring guidelines].
Handle: [edge cases like date formats, null vs empty]."
```

### For debugging:
```
"Here is my [file]. It's throwing [error].
The relevant code is [snippet].
What is the issue and how do I fix it?"
```

---

## Key Technical Decisions (AI-Informed)

1. **SQLite over PostgreSQL** — AI suggested SQLite for zero-config local dev; agreed for prototype speed
2. **better-sqlite3 over sqlite3** — Synchronous API simplifies route handlers; AI recommendation
3. **Vite over CRA** — Faster build times; AI recommendation
4. **CSS variables for theming** — AI suggested this for the dark-mode design system; clean approach
5. **Storing files on disk + serving via Express** — Simple, avoids cloud dependency for prototype

---

## Time Breakdown

| Phase | Time |
|---|---|
| Architecture + setup | ~1 hour |
| Backend (routes, validation, extraction) | ~3 hours |
| Frontend (all pages + design) | ~4 hours |
| Testing + debugging | ~1 hour |
| Documentation | ~1 hour |
| **Total** | **~10 hours** |
