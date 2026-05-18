const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { getDbSync } = require("../db/init");
const { extractDataFromDocument } = require("../middleware/extraction");
const {
  validateRecord,
  checkDuplicateWorkOrder,
} = require("../middleware/validation");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    cb(null, `${uuidv4()}${ext}`);
  },
});

// Multer upload
const upload = multer({
  storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDFs are allowed"));
    }
  },
});

// Upload + process document
router.post(
  "/",
  upload.single("file"),

  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const db = getDbSync();

    const uploadId = uuidv4();
    const recordId = uuidv4();

    try {
      // Save upload entry
      db.prepare(
        `
        INSERT INTO uploads (
          id,
          filename,
          original_name,
          file_type,
          file_size,
          upload_date,
          status
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'), 'processing')
      `,
      ).run(
        uploadId,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
      );

      // AI extraction
      let extracted = {};
      let extractionError = null;

      try {
        extracted = await extractDataFromDocument(
          req.file.path,
          req.file.mimetype,
        );
      } catch (err) {
        extractionError = err.message;

        console.error("Extraction error:", err.message);
      }

      // Confidence
      const confidence = extracted.confidence_scores || {};

      // Record data
      const recordData = {
        date: extracted.date || null,

        shift: extracted.shift || null,

        employee_number: extracted.employee_number || null,

        operator_name: extracted.operator_name || null,

        operation_code: extracted.operation_code || null,

        machine_number: extracted.machine_number || null,

        work_order_number: extracted.work_order_number || null,

        product_code: extracted.product_code || null,

        quantity_produced:
          extracted.quantity_produced !== undefined
            ? extracted.quantity_produced
            : null,

        time_taken:
          extracted.time_taken !== undefined ? extracted.time_taken : null,

        notes: extracted.notes || null,
      };

      // Validation
      const { errors, warnings } = validateRecord(recordData);

      // Duplicate check
      if (recordData.work_order_number) {
        const isDup = checkDuplicateWorkOrder(db, recordData.work_order_number);

        // WARNING only, not error
        if (isDup) {
          warnings.push({
            field: "work_order_number",
            rule: "duplicate",
            message: `Work order ${recordData.work_order_number} already exists`,
            severity: "warning",
          });
        }
      }

      const allIssues = [...errors, ...warnings];

      const hasErrors = errors.length > 0;

      // Save record
      db.prepare(
        `
        INSERT INTO records (
          id,
          upload_id,
          date,
          shift,
          employee_number,
          operator_name,
          operation_code,
          machine_number,
          work_order_number,
          product_code,
          quantity_produced,
          time_taken,
          raw_extracted,
          confidence_scores,
          validation_errors,
          status,
          notes
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      ).run(
        recordId,
        uploadId,

        recordData.date,
        recordData.shift,
        recordData.employee_number,
        recordData.operator_name,
        recordData.operation_code,
        recordData.machine_number,
        recordData.work_order_number,
        recordData.product_code,
        recordData.quantity_produced,
        recordData.time_taken,

        JSON.stringify(extracted),

        JSON.stringify(confidence),

        JSON.stringify(allIssues),

        hasErrors ? "needs_review" : "pending_review",

        recordData.notes,
      );

      // Update upload status
      db.prepare(
        `
        UPDATE uploads
        SET status = ?
        WHERE id = ?
      `,
      ).run(
        extractionError ? "failed" : "processed",

        uploadId,
      );

      // Response
      res.json({
        success: true,

        uploadId,

        recordId,

        record: {
          id: recordId,
          upload_id: uploadId,
          ...recordData,
        },

        confidence_scores: confidence,

        validation: {
          errors,
          warnings,
        },

        extraction_error: extractionError,
      });
    } catch (err) {
      console.error("Upload processing error:", err);

      db.prepare(
        `
        UPDATE uploads
        SET status = 'failed'
        WHERE id = ?
      `,
      ).run(uploadId);

      res.status(500).json({
        error: "Processing failed: " + err.message,
      });
    }
  },
);

// Get all uploads
router.get("/", (req, res) => {
  const db = getDbSync();

  const { search, status, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT
      u.*,
      r.id as record_id,
      r.status as record_status,
      r.work_order_number,
      r.machine_number,
      r.shift,
      r.date as record_date

    FROM uploads u

    LEFT JOIN records r
    ON u.id = r.upload_id

    WHERE 1=1
  `;

  const params = [];

  if (search) {
    query += `
      AND (
        u.original_name LIKE ?
        OR r.work_order_number LIKE ?
        OR r.machine_number LIKE ?
        OR r.employee_number LIKE ?
      )
    `;

    const s = `%${search}%`;

    params.push(s, s, s, s);
  }

  if (status) {
    query += ` AND r.status = ?`;

    params.push(status);
  }

  query += `
    ORDER BY u.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const rows = db.prepare(query).all(...params);

  const total = db
    .prepare(
      `
      SELECT COUNT(*) as c
      FROM uploads
    `,
    )
    .get().c;

  res.json({
    uploads: rows,
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

// Get single upload
router.get("/:id", (req, res) => {
  const db = getDbSync();

  const upload = db
    .prepare(
      `
      SELECT *
      FROM uploads
      WHERE id = ?
    `,
    )
    .get(req.params.id);

  if (!upload) {
    return res.status(404).json({
      error: "Upload not found",
    });
  }

  const record = db
    .prepare(
      `
      SELECT *
      FROM records
      WHERE upload_id = ?
    `,
    )
    .get(req.params.id);

  res.json({
    upload,
    record,
  });
});

// Serve uploaded file
router.get("/:id/file", (req, res) => {
  const db = getDbSync();

  const upload = db
    .prepare(
      `
      SELECT *
      FROM uploads
      WHERE id = ?
    `,
    )
    .get(req.params.id);

  if (!upload) {
    return res.status(404).json({
      error: "Upload not found",
    });
  }

  const filePath = path.join(UPLOADS_DIR, upload.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "File not found on disk",
    });
  }

  res.setHeader("Content-Type", upload.file_type);

  res.setHeader(
    "Content-Disposition",
    `inline; filename="${upload.original_name}"`,
  );

  res.sendFile(filePath);
});

module.exports = router;

// Self-check
const {
  extractDataFromDocument: _testExport,
} = require("../middleware/extraction");

if (typeof _testExport !== "function") {
  console.error(
    "[FATAL] extractDataFromDocument failed to export from extraction.js!",
  );

  process.exit(1);
}
