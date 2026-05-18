const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { getDbSync } = require("../db/init");
const {
  validateRecord,
  checkDuplicateWorkOrder,
} = require("../middleware/validation");

// Get all records
router.get("/", (req, res) => {
  const { search, status, shift, machine, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT r.*, u.original_name as filename, u.upload_date
    FROM records r
    LEFT JOIN uploads u ON r.upload_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    query += `
      AND (
        r.work_order_number LIKE ?
        OR r.machine_number LIKE ?
        OR r.employee_number LIKE ?
        OR r.operator_name LIKE ?
        OR r.product_code LIKE ?
      )
    `;

    const s = `%${search}%`;

    params.push(s, s, s, s, s);
  }

  if (status) {
    query += ` AND r.status = ?`;
    params.push(status);
  }

  if (shift) {
    query += ` AND r.shift = ?`;
    params.push(shift);
  }

  if (machine) {
    query += ` AND r.machine_number LIKE ?`;
    params.push(`%${machine}%`);
  }

  const countQuery = query.replace(
    "r.*, u.original_name as filename, u.upload_date",
    "COUNT(*) as c",
  );

  const total = getDbSync()
    .prepare(countQuery)
    .get(...params).c;

  query += `
    ORDER BY r.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const rows = getDbSync()
    .prepare(query)
    .all(...params);

  rows.forEach((row) => {
    row.confidence_scores = tryParse(row.confidence_scores, {});

    row.validation_errors = tryParse(row.validation_errors, []);
  });

  res.json({
    records: rows,
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

// Get single record
router.get("/:id", (req, res) => {
  try {
    const record = getDbSync()
      .prepare(
        `
        SELECT r.*, u.original_name as filename,
               u.upload_date, u.file_type
        FROM records r
        LEFT JOIN uploads u ON r.upload_id = u.id
        WHERE r.id = ?
      `,
      )
      .get(req.params.id);

    if (!record) {
      return res.status(404).json({
        error: "Record not found",
      });
    }

    record.confidence_scores = tryParse(record.confidence_scores, {});

    record.validation_errors = tryParse(record.validation_errors, []);

    res.json(record);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch record",
    });
  }
});

// Update record
router.put("/:id", (req, res) => {
  try {
    const existing = getDbSync()
      .prepare(
        `
        SELECT * FROM records
        WHERE id = ?
      `,
      )
      .get(req.params.id);

    if (!existing) {
      return res.status(404).json({
        error: "Record not found",
      });
    }

    const updates = req.body;

    const allowedFields = [
      "date",
      "shift",
      "employee_number",
      "operator_name",
      "operation_code",
      "machine_number",
      "work_order_number",
      "product_code",
      "quantity_produced",
      "time_taken",
      "notes",
    ];

    const recordData = {};

    allowedFields.forEach((field) => {
      recordData[field] =
        updates[field] !== undefined ? updates[field] : existing[field];
    });

    // Validate
    const { errors, warnings } = validateRecord(recordData);

    // Duplicate check
    if (recordData.work_order_number) {
      const isDup = checkDuplicateWorkOrder(
        getDbSync(),
        recordData.work_order_number,
        req.params.id,
      );

      if (isDup) {
        errors.push({
          field: "work_order_number",
          rule: "duplicate",
          message: `Work order ${recordData.work_order_number} already exists`,
          severity: "error",
        });
      }
    }

    const allIssues = [...errors, ...warnings];

    const newStatus =
      updates.status ||
      (errors.length === 0 ? "pending_review" : "needs_review");

    getDbSync()
      .prepare(
        `
        UPDATE records SET
          date=?,
          shift=?,
          employee_number=?,
          operator_name=?,
          operation_code=?,
          machine_number=?,
          work_order_number=?,
          product_code=?,
          quantity_produced=?,
          time_taken=?,
          notes=?,
          validation_errors=?,
          status=?,
          updated_at=datetime('now')
        WHERE id=?
      `,
      )
      .run(
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
        recordData.notes,
        JSON.stringify(allIssues),
        newStatus,
        req.params.id,
      );

    const updated = getDbSync()
      .prepare(
        `
        SELECT * FROM records
        WHERE id = ?
      `,
      )
      .get(req.params.id);

    updated.confidence_scores = tryParse(updated.confidence_scores, {});

    updated.validation_errors = tryParse(updated.validation_errors, []);

    res.json({
      record: updated,
      validation: {
        errors,
        warnings,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to update record",
    });
  }
});

// Approve/reject record
router.patch("/:id/status", (req, res) => {
  try {
    const { status, reviewed_by } = req.body;

    const allowed = ["approved", "rejected", "pending_review", "needs_review"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
      });
    }

    getDbSync()
      .prepare(
        `
        UPDATE records
        SET
          status=?,
          reviewed_by=?,
          reviewed_at=datetime('now'),
          updated_at=datetime('now')
        WHERE id=?
      `,
      )
      .run(status, reviewed_by || "reviewer", req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to update status",
    });
  }
});

// Delete record
router.delete("/:id", (req, res) => {
  try {
    getDbSync()
      .prepare(
        `
        DELETE FROM records
        WHERE id = ?
      `,
      )
      .run(req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to delete record",
    });
  }
});

// Safe JSON parser
function tryParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

module.exports = router;
