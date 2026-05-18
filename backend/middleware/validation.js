// Business validation rules for manufacturing records

const VALID_SHIFTS = [
  "A",
  "B",
  "C",
  "D",
  "I",
  "II",
  "III",
  "Day",
  "Night",
  "Morning",
  "Evening",
  "1",
  "2",
  "3",
];

const MACHINE_CODE_REGEX = /^[A-Z]{1,3}-?\d{2,6}$/i;

// Accepts:
// WO-12345
// wo12345
// 165460
// W0-12345
const WORK_ORDER_REGEX = /^(WO|W0)?[-]?\d{4,10}$/i;

const EMPLOYEE_NO_REGEX = /^[A-Z0-9]{3,10}$/i;

function validateRecord(record) {
  const errors = [];
  const warnings = [];

  // Mandatory fields
  const mandatoryFields = [
    "date",
    "shift",
    "employee_number",
    "machine_number",
    "work_order_number",
    "quantity_produced",
  ];

  mandatoryFields.forEach((field) => {
    if (
      !record[field] ||
      String(record[field]).trim() === "" ||
      record[field] === null
    ) {
      errors.push({
        field,
        rule: "required",
        message: `${formatFieldName(field)} is mandatory`,
        severity: "error",
      });
    }
  });

  // Date validation
  if (record.date) {
    const date = new Date(record.date);

    if (isNaN(date.getTime())) {
      errors.push({
        field: "date",
        rule: "format",
        message: "Invalid date format",
        severity: "error",
      });
    } else if (date > new Date()) {
      warnings.push({
        field: "date",
        rule: "future_date",
        message: "Date is in the future",
        severity: "warning",
      });
    } else if (date < new Date("2000-01-01")) {
      errors.push({
        field: "date",
        rule: "range",
        message: "Date is too far in the past",
        severity: "error",
      });
    }
  }

  // Shift validation
  if (record.shift) {
    const shiftUpper = String(record.shift).trim().toUpperCase();

    const normalizedShifts = VALID_SHIFTS.map((s) => s.toUpperCase());

    if (!normalizedShifts.includes(shiftUpper)) {
      errors.push({
        field: "shift",
        rule: "invalid_value",
        message: `Invalid shift value: "${record.shift}"`,
        severity: "error",
      });
    }
  }

  // Machine number validation
  if (record.machine_number) {
    if (!MACHINE_CODE_REGEX.test(record.machine_number)) {
      warnings.push({
        field: "machine_number",
        rule: "format",
        message: `Machine code "${record.machine_number}" doesn't match expected format`,
        severity: "warning",
      });
    }
  }

  // Work order validation
  if (record.work_order_number) {
    if (!WORK_ORDER_REGEX.test(record.work_order_number)) {
      warnings.push({
        field: "work_order_number",
        rule: "format",
        message: `Work order "${record.work_order_number}" doesn't match expected format`,
        severity: "warning",
      });
    }
  }

  // Employee validation
  if (record.employee_number) {
    if (!EMPLOYEE_NO_REGEX.test(record.employee_number)) {
      warnings.push({
        field: "employee_number",
        rule: "format",
        message: `Employee number "${record.employee_number}" has unexpected format`,
        severity: "warning",
      });
    }
  }

  // Quantity validation
  if (
    record.quantity_produced !== undefined &&
    record.quantity_produced !== null
  ) {
    const qty = Number(record.quantity_produced);

    if (isNaN(qty)) {
      errors.push({
        field: "quantity_produced",
        rule: "type",
        message: "Quantity must be a number",
        severity: "error",
      });
    } else if (qty < 0) {
      errors.push({
        field: "quantity_produced",
        rule: "range",
        message: "Quantity cannot be negative",
        severity: "error",
      });
    } else if (qty === 0) {
      warnings.push({
        field: "quantity_produced",
        rule: "zero_value",
        message: "Quantity produced is zero — verify this is correct",
        severity: "warning",
      });
    } else if (qty > 100000) {
      warnings.push({
        field: "quantity_produced",
        rule: "suspicious_value",
        message: `Quantity ${qty} is unusually high — please verify`,
        severity: "warning",
      });
    }
  }

  // Time validation
  if (record.time_taken !== undefined && record.time_taken !== null) {
    const time = Number(record.time_taken);

    if (isNaN(time)) {
      errors.push({
        field: "time_taken",
        rule: "type",
        message: "Time taken must be a number",
        severity: "error",
      });
    } else if (time < 0) {
      errors.push({
        field: "time_taken",
        rule: "range",
        message: "Time taken cannot be negative",
        severity: "error",
      });
    } else if (time > 24) {
      warnings.push({
        field: "time_taken",
        rule: "suspicious_value",
        message: `Time taken ${time}h exceeds 24 hours — verify this is correct`,
        severity: "warning",
      });
    }
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

// Duplicate work order checker
function checkDuplicateWorkOrder(db, workOrderNumber, excludeRecordId = null) {
  if (!workOrderNumber) {
    return false;
  }

  let query = "SELECT id FROM records WHERE work_order_number = ?";

  const params = [workOrderNumber];

  if (excludeRecordId) {
    query += " AND id != ?";

    params.push(excludeRecordId);
  }

  const existing = db.prepare(query).get(...params);

  return !!existing;
}

// Format field names
function formatFieldName(field) {
  return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

module.exports = {
  validateRecord,
  checkDuplicateWorkOrder,
};
