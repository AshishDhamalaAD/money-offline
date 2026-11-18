// A small, dependency-free PDF statement builder.
//
// The app ships no PDF library: this renders each page on a canvas with the
// system font (so names in any script the phone can display come out correctly)
// and embeds the page as a JPEG in a hand-written PDF. That keeps the bundle
// small and works offline. The trade-off is that the text is an image, not
// selectable.

import { formatDate } from "./dateUtils"
import { appLocale } from "./locale"

const PAGE_WIDTH = 595.28 // A4 at 72 dpi
const PAGE_HEIGHT = 841.89
const SCALE = 2 // render at 144 dpi so text stays sharp when printed
const MARGIN = 40
const ROW_HEIGHT = 18
const HEADER_HEIGHT = 22
const TABLE_BOTTOM = PAGE_HEIGHT - 52
const FIRST_TABLE_TOP = 162
const NEXT_TABLE_TOP = 100

let amountFormatter = null
let amountLocale = ""

// A statement looks wrong with a ragged number of decimals, so force two. The
// formatter follows the language setting, like the rest of the app.
function formatAmount(value) {
  if (!amountFormatter || amountLocale !== appLocale.value) {
    amountLocale = appLocale.value
    amountFormatter = new Intl.NumberFormat(amountLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return amountFormatter.format(Number(value) || 0)
}

const COLORS = {
  text: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  line: "#e5e7eb",
  headerBg: "#f3f4f6",
  boxBg: "#f9fafb",
  income: "#047857",
  expense: "#b91c1c",
  accent: "#4338ca",
}

const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function setFont(context, size, weight = "normal", color = COLORS.text) {
  context.font = `${weight} ${size}px ${FONT_STACK}`
  context.fillStyle = color
}

function truncate(context, value, maxWidth) {
  const text = String(value ?? "")

  if (context.measureText(text).width <= maxWidth) return text

  let end = text.length
  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end -= 1
  }

  return `${text.slice(0, end)}…`
}

export function formatStatementDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!match) return String(value || "")

  return formatDate(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), {
    weekday: undefined,
  })
}

function roundRect(context, x, y, width, height, radius) {
  if (typeof context.roundRect === "function") {
    context.beginPath()
    context.roundRect(x, y, width, height, radius)
    return
  }

  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function columnsFor(includeBook) {
  if (includeBook) {
    return [
      { key: "dateLabel", label: "Date", width: 74 },      { key: "typeShort", label: "Type", width: 34 },
      { key: "book", label: "Book", width: 86 },
      { key: "category", label: "Category", width: 92 },
      { key: "description", label: "Description", width: 129 },
      { key: "amount", label: "Amount", width: 100, align: "right" },
    ]
  }

  return [
    { key: "dateLabel", label: "Date", width: 78 },
    { key: "typeShort", label: "Type", width: 36 },
    { key: "category", label: "Category", width: 104 },
    { key: "description", label: "Description", width: 197 },
    { key: "amount", label: "Amount", width: 100, align: "right" },
  ]
}

function contentWidth(columns) {
  return columns.reduce((total, column) => total + column.width, 0)
}

function createPage() {
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(PAGE_WIDTH * SCALE)
  canvas.height = Math.round(PAGE_HEIGHT * SCALE)

  const context = canvas.getContext("2d")
  context.scale(SCALE, SCALE)
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  return { canvas, context }
}

function drawPageHeader(context, { bookName, rangeLabel, generatedLabel, continued }) {
  setFont(context, 17, "bold")
  context.textAlign = "left"
  context.textBaseline = "alphabetic"
  context.fillText(truncate(context, bookName, PAGE_WIDTH - MARGIN * 2 - 150), MARGIN, 58)

  setFont(context, 8.5, "normal", COLORS.faint)
  context.textAlign = "right"
  context.fillText(`Generated ${generatedLabel}`, PAGE_WIDTH - MARGIN, 46)
  context.textAlign = "left"

  setFont(context, 9.5, "normal", COLORS.muted)
  context.fillText(continued ? "Statement (continued)" : rangeLabel, MARGIN, 78)
}

function drawSummary(context, summary, top) {
  const gap = 12
  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - gap * 2) / 3
  const boxHeight = 48

  const items = [
    { label: "Income", value: summary.income, color: COLORS.income },
    { label: "Expense", value: summary.expense, color: COLORS.expense },
    { label: "Net", value: summary.net, color: summary.net >= 0 ? COLORS.accent : COLORS.expense },
  ]

  items.forEach((item, index) => {
    const x = MARGIN + index * (boxWidth + gap)

    roundRect(context, x, top, boxWidth, boxHeight, 6)
    context.fillStyle = COLORS.boxBg
    context.fill()
    context.strokeStyle = COLORS.line
    context.lineWidth = 0.75
    context.stroke()

    setFont(context, 7.5, "bold", COLORS.muted)
    context.textBaseline = "alphabetic"
    context.fillText(item.label.toUpperCase(), x + 10, top + 17)

    setFont(context, 12.5, "bold", item.color)
    context.fillText(truncate(context, formatAmount(item.value), boxWidth - 20), x + 10, top + 36)
  })
}

function drawTableHeader(context, columns, top) {
  const width = contentWidth(columns)

  context.fillStyle = COLORS.headerBg
  context.fillRect(MARGIN, top, width, HEADER_HEIGHT)

  setFont(context, 8, "bold", COLORS.muted)
  context.textBaseline = "middle"

  let x = MARGIN
  for (const column of columns) {
    if (column.align === "right") {
      context.textAlign = "right"
      context.fillText(column.label.toUpperCase(), x + column.width - 8, top + HEADER_HEIGHT / 2)
    } else {
      context.textAlign = "left"
      context.fillText(column.label.toUpperCase(), x + 8, top + HEADER_HEIGHT / 2)
    }
    x += column.width
  }

  context.textAlign = "left"
  context.textBaseline = "alphabetic"
}

function drawRow(context, row, columns, top) {
  context.textBaseline = "middle"

  let x = MARGIN
  for (const column of columns) {
    if (column.key === "amount") {
      setFont(context, 9, "bold", row.isIncome ? COLORS.income : COLORS.expense)
      context.textAlign = "right"
      context.fillText(
        `${row.isIncome ? "+" : "-"}${formatAmount(row.amount)}`,
        x + column.width - 8,
        top + ROW_HEIGHT / 2,
      )
      context.textAlign = "left"
      setFont(context, 9, "normal", COLORS.text)
    } else {
      setFont(context, 8.5, "normal", COLORS.text)
      context.fillText(truncate(context, row[column.key], column.width - 12), x + 8, top + ROW_HEIGHT / 2)
    }
    x += column.width
  }

  context.strokeStyle = COLORS.line
  context.lineWidth = 0.5
  context.beginPath()
  context.moveTo(MARGIN, top + ROW_HEIGHT)
  context.lineTo(MARGIN + contentWidth(columns), top + ROW_HEIGHT)
  context.stroke()

  context.textBaseline = "alphabetic"
}

function drawFooter(context, pageNumber, pageCount) {
  setFont(context, 8, "normal", COLORS.faint)
  context.textAlign = "left"
  context.fillText("Money Manager", MARGIN, PAGE_HEIGHT - 24)
  context.textAlign = "right"
  context.fillText(`Page ${pageNumber} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24)
  context.textAlign = "left"
}

function drawEmptyState(context, top) {
  setFont(context, 10, "normal", COLORS.muted)
  context.textAlign = "center"
  context.fillText("No transactions in this export.", PAGE_WIDTH / 2, top + 40)
  context.textAlign = "left"
}

function splitPages(rows, firstPageRows, nextPageRows) {
  if (rows.length === 0) return [[]]

  const pages = [rows.slice(0, firstPageRows)]

  for (let index = firstPageRows; index < rows.length; index += nextPageRows) {
    pages.push(rows.slice(index, index + nextPageRows))
  }

  return pages
}

async function pageToJpeg(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Could not render the PDF page"))),
      "image/jpeg",
      0.92,
    )
  })

  return new Uint8Array(await blob.arrayBuffer())
}

function assemblePdf(images) {
  const encoder = new TextEncoder()
  const chunks = []
  let offset = 0

  const push = (data) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data
    chunks.push(bytes)
    offset += bytes.length
  }

  push("%PDF-1.4\n")

  const objects = new Map()
  const pageIds = images.map((_, index) => 3 + index * 3)

  objects.set(1, { text: "<< /Type /Catalog /Pages 2 0 R >>" })
  objects.set(2, {
    text: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`,
  })

  images.forEach((image, index) => {
    const pageId = pageIds[index]
    const contentId = pageId + 1
    const imageId = pageId + 2

    const content = encoder.encode(
      `q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`,
    )

    objects.set(pageId, {
      text: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    })
    objects.set(contentId, { text: `<< /Length ${content.length} >>`, stream: content })
    objects.set(imageId, {
      text: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>`,
      stream: image.bytes,
    })
  })

  const offsets = []
  const total = objects.size

  for (let id = 1; id <= total; id += 1) {
    const object = objects.get(id)
    offsets[id] = offset

    push(`${id} 0 obj\n${object.text}\n`)
    if (object.stream) {
      push("stream\n")
      push(object.stream)
      push("\nendstream\n")
    }
    push("endobj\n")
  }

  const xrefOffset = offset
  push(`xref\n0 ${total + 1}\n`)
  push("0000000000 65535 f\r\n")

  for (let id = 1; id <= total; id += 1) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n\r\n`)
  }

  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  return new Blob(chunks, { type: "application/pdf" })
}

/**
 * Build a PDF statement for the given rows.
 *
 * @param {object} options
 * @param {string} options.bookName      Title shown at the top of every page.
 * @param {Array}  options.rows          Enriched transaction rows.
 * @param {object} options.summary       { income, expense, net }
 * @param {boolean} options.includeBook  Add a Book column (all-books exports).
 * @param {string} options.rangeLabel    Human-readable period, e.g. "1 Jan – 17 Nov 2026".
 * @param {string} options.generatedLabel
 * @returns {Promise<Blob>}
 */
export async function buildStatementPdf({ bookName, rows, summary, includeBook, rangeLabel, generatedLabel }) {
  const columns = columnsFor(includeBook)

  const firstPageRows = Math.max(
    1,
    Math.floor((TABLE_BOTTOM - FIRST_TABLE_TOP - HEADER_HEIGHT) / ROW_HEIGHT),
  )
  const nextPageRows = Math.max(
    1,
    Math.floor((TABLE_BOTTOM - NEXT_TABLE_TOP - HEADER_HEIGHT) / ROW_HEIGHT),
  )

  const pages = splitPages(rows, firstPageRows, nextPageRows)
  const images = []

  for (let index = 0; index < pages.length; index += 1) {
    const { canvas, context } = createPage()
    const isFirst = index === 0
    const tableTop = isFirst ? FIRST_TABLE_TOP : NEXT_TABLE_TOP

    drawPageHeader(context, {
      bookName,
      rangeLabel,
      generatedLabel,
      continued: !isFirst,
    })

    if (isFirst) {
      drawSummary(context, summary, 94)
    }

    if (rows.length === 0) {
      drawEmptyState(context, tableTop)
    } else {
      drawTableHeader(context, columns, tableTop)

      let y = tableTop + HEADER_HEIGHT
      for (const row of pages[index]) {
        drawRow(context, row, columns, y)
        y += ROW_HEIGHT
      }
    }

    drawFooter(context, index + 1, pages.length)

    images.push({
      bytes: await pageToJpeg(canvas),
      width: canvas.width,
      height: canvas.height,
    })

    // Release the canvas before rendering the next page.
    canvas.width = 0
    canvas.height = 0
  }

  return assemblePdf(images)
}
