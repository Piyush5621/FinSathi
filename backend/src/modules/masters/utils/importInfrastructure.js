export class ValidationFramework {
  /**
   * Validates a batch of rows against a Zod schema
   * @param {Array} rows 
   * @param {object} schema - Zod schema
   * @returns {object} { validRows, invalidRows }
   */
  static validate(rows, schema) {
    const validRows = [];
    const invalidRows = [];

    rows.forEach((row, index) => {
      const result = schema.safeParse(row);
      if (result.success) {
        validRows.push({ rowIndex: index, data: result.data });
      } else {
        invalidRows.push({
          rowIndex: index,
          rowData: row,
          errors: result.error.format()
        });
      }
    });

    return { validRows, invalidRows };
  }
}

export class ImportJob {
  /**
   * Runs an import job
   * @param {object} params 
   * @param {Array} params.data - Raw rows to import
   * @param {object} params.schema - Zod schema for rows
   * @param {boolean} params.previewMode - If true, do not write to DB
   * @param {function} params.saveCallback - Callback to write a valid row to DB: (row) => Promise<any>
   */
  static async run({ data, schema, previewMode = true, saveCallback }) {
    const { validRows, invalidRows } = ValidationFramework.validate(data, schema);

    const summary = {
      totalRows: data.length,
      successCount: 0,
      failedCount: invalidRows.length,
      previewMode,
      errors: invalidRows.map(f => ({
        row: f.rowIndex + 1,
        errors: f.errors
      }))
    };

    if (previewMode) {
      summary.successCount = validRows.length;
      summary.previewData = validRows.slice(0, 10).map(r => r.data); // Return first 10 for preview
      return summary;
    }

    // Execution Mode
    const savedRecords = [];
    for (const valid of validRows) {
      try {
        const saved = await saveCallback(valid.data);
        savedRecords.push(saved);
        summary.successCount++;
      } catch (err) {
        summary.failedCount++;
        summary.errors.push({
          row: valid.rowIndex + 1,
          errors: { _errors: [err.message] }
        });
      }
    }

    return {
      ...summary,
      importedRecords: savedRecords
    };
  }
}
