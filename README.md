# BiztelAI — AI-Powered Workflow Automation System

A full-stack web application that digitizes handwritten/semi-structured operational documents and converts them into structured, reviewable operational records with analytics and validation workflows.

---

## Features

- **Document Upload** — Drag-and-drop upload for images (JPG, PNG, WEBP) and PDFs
- **AI-Based Data Extraction** — Uses Claude (Anthropic) to OCR and extract structured fields from handwritten/printed documents
- **Confidence Scoring** — Per-field confidence indicators (0–100%) with color coding
- **Validation Engine** — 10+ business rules (mandatory fields, shift formats, machine codes, duplicate work orders, suspicious values, etc.)
- **Review Workflow** — Editable records with approve/reject/pending status lifecycle
- **Dashboard & Analytics** — Charts for daily production trends, shift summaries, machine summaries, status distribution
- **Search & History** — Searchable records with filtering by status, shift, machine

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts, React-Dropzone |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| AI/OCR | Anthropic Claude claude-opus-4-5 |
| Styling | Custom CSS with CSS variables |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd biztel-workflow-app

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and set your API key:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=5000
NODE_ENV=development
```

### 3. Run the application

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:3000
```

### 4. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

---

## Architecture Overview

```
biztel-workflow-app/
├── backend/
│   ├── server.js           # Express app entry point
│   ├── db/
│   │   └── init.js         # SQLite schema & connection
│   ├── routes/
│   │   ├── uploads.js      # File upload + AI extraction
│   │   ├── records.js      # CRUD + status management
│   │   └── analytics.js    # Dashboard queries
│   ├── middleware/
│   │   ├── extraction.js   # Claude API OCR integration
│   │   └── validation.js   # Business rule validation
│   └── uploads/            # Stored files (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Router + sidebar layout
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Analytics + charts
│   │   │   ├── UploadPage.jsx     # Upload + extraction result
│   │   │   ├── RecordsPage.jsx    # Records list + search
│   │   │   ├── RecordDetail.jsx   # Edit + review workflow
│   │   │   └── UploadsHistory.jsx # Upload history
│   │   ├── utils/
│   │   │   └── api.js      # Axios API client
│   │   └── index.css       # Design system + styles
│   └── index.html
│
└── README.md
```

### Data Flow

```
User uploads file
    ↓
Multer saves file to disk
    ↓
Claude OCR extracts structured fields (with confidence scores)
    ↓
Validation engine runs business rules
    ↓
Record saved to SQLite (status: needs_review / pending_review)
    ↓
User reviews + edits in UI
    ↓
User approves / rejects record
    ↓
Analytics dashboard updates
```

---

## Validation Rules

| Rule | Field | Type |
|---|---|---|
| Required field check | date, shift, employee_no, machine_no, work_order_no, quantity | Error |
| Invalid date format | date | Error |
| Future date | date | Warning |
| Invalid shift value | shift | Error |
| Machine code format | machine_number | Warning |
| Work order format | work_order_number | Warning |
| Negative quantity | quantity_produced | Error |
| Zero quantity | quantity_produced | Warning |
| Suspicious high quantity (>100k) | quantity_produced | Warning |
| Negative/excessive time | time_taken | Error/Warning |
| Duplicate work order | work_order_number | Error |

---

## Extraction Schema

```json
{
  "date": "YYYY-MM-DD",
  "shift": "A/B/C/Day/Night/Morning/Evening",
  "employee_number": "string",
  "operator_name": "string",
  "operation_code": "string",
  "machine_number": "string",
  "work_order_number": "string",
  "product_code": "string",
  "quantity_produced": "number",
  "time_taken": "number (decimal hours)",
  "confidence_scores": { "field": 0.0-1.0 }
}
```

---

## Assumptions & Tradeoffs

1. **Single record per document** — Each uploaded document yields one operational record. Multi-record documents would need additional parsing logic.
2. **SQLite for simplicity** — SQLite is used instead of PostgreSQL for zero-config setup. Can be swapped for production.
3. **File storage on disk** — Uploaded files stored locally. For production, use S3/GCS.
4. **No auth** — No authentication implemented; all records are shared. Production would need user/role management.
5. **Claude claude-opus-4-5** — Used for best handwriting recognition. Can be downgraded to claude-haiku-4-5-20251001 for cost savings.
6. **Confidence threshold** — Fields with <50% confidence are highlighted red, 50-75% amber, >75% green.

---

## Deployment (Production)

```bash
# Build frontend
cd frontend && npm run build

# Set production env
echo "NODE_ENV=production" >> backend/.env

# Start server (serves frontend + API)
cd backend && npm start
```

The backend serves the built frontend in production mode.

---

## License

Built for BiztelAI Full Stack Engineering Internship Assignment.
