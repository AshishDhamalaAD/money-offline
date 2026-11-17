// CSV helpers for spreadsheet exports.
//
// Excel needs a UTF-8 byte-order mark to detect the encoding, and any field
// containing a comma, a quote or a line break has to be quoted with embedded
// quotes doubled.

export function escapeCsvValue(value) {
  const text = value == null ? "" : String(value)

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsvValue).join(",")]

  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(","))
  }

  // CRLF is what Excel expects between records.
  return lines.join("\r\n") + "\r\n"
}
