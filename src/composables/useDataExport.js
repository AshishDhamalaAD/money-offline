import Dexie from "dexie"

import { db } from "@/db/dexie"
import { formatDateTimeForDB, roundAmount } from "@/utils/dateUtils"
import { descriptionToText } from "@/utils/description"
import { toCsv } from "@/utils/csvExport"
import { buildStatementPdf, formatStatementDate } from "@/utils/statementPdf"

const numberText = (value) => String(Math.round((Number(value) || 0) * 100) / 100)

function slugify(value) {
  return (
    String(value || "export")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "export"
  )
}

function fileName(bookName, extension) {
  const date = formatDateTimeForDB().slice(0, 10)
  return `money-${slugify(bookName)}-${date}.${extension}`
}

function download(file) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Web Share with files is what makes "export" feel native on a phone: the file
// goes straight into WhatsApp, Mail, Drive or Files. Desktop browsers and some
// older mobile ones do not support it, so callers fall back to a download.
export function canShareFiles() {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false

  try {
    return navigator.canShare({ files: [new File(["test"], "test.txt", { type: "text/plain" })] })
  } catch {
    return false
  }
}

// Dates are stored as "YYYY-MM-DD HH:mm:ss" strings, so the filter bounds are
// plain strings and both ends of the chosen range are inclusive.
function dateBounds(startDate, endDate) {
  return [startDate ? `${startDate} 00:00:00` : null, endDate ? `${endDate} 23:59:59` : null]
}

function selectTransactions(bookId, startDate, endDate) {
  const allBooks = bookId === "all"
  const numericId = allBooks ? null : Number(bookId)
  const [start, end] = dateBounds(startDate, endDate)

  if (allBooks) {
    return start || end
      ? db.transactions.where("date").between(start ?? Dexie.minKey, end ?? Dexie.maxKey)
      : db.transactions.orderBy("date")
  }

  return db.transactions
    .where("[book_id+date]")
    .between([numericId, start ?? Dexie.minKey], [numericId, end ?? Dexie.maxKey])
}

export function useDataExport() {
  async function collect({ bookId, startDate = "", endDate = "" }) {
    const allBooks = bookId === "all"
    const numericId = allBooks ? null : Number(bookId)

    const [transactions, books, categories, contacts, paymentModes, products] = await Promise.all([
      selectTransactions(bookId, startDate, endDate).toArray(),
      db.books.toArray(),
      db.categories.toArray(),
      db.contacts.toArray(),
      db.payment_modes.toArray(),
      db.products.toArray(),
    ])

    const byId = (rows) => new Map(rows.map((row) => [row.id, row]))
    const bookMap = byId(books)
    const categoryMap = byId(categories)
    const contactMap = byId(contacts)
    const paymentModeMap = byId(paymentModes)
    const productMap = byId(products)

    const rows = transactions.map((transaction) => {
      const categoryNames = (transaction.category_ids || [])
        .map((id) => categoryMap.get(id)?.name)
        .filter(Boolean)

      // Older edited rows have no product name, so fall back to the product
      // master row before giving up.
      const productLines = (transaction.products || []).map((item) => {
        const name = item.name || productMap.get(item.product_id)?.name || "Item"
        return `${name} ${numberText(item.quantity ?? 1)} x ${numberText(item.rate)} = ${numberText(item.amount)}`
      })

      return {
        date: transaction.date,
        dateLabel: formatStatementDate(transaction.date),
        type: transaction.type === "in" ? "Income" : "Expense",
        typeShort: transaction.type === "in" ? "In" : "Out",
        isIncome: transaction.type === "in",
        amount: roundAmount(transaction.amount),
        category: categoryNames.join(", "),
        paymentMode: paymentModeMap.get(transaction.payment_mode_id)?.name || "",
        contact: contactMap.get(transaction.contact_id)?.name || "",
        description: descriptionToText(transaction.description),
        products: productLines.join("; "),
        discount: roundAmount(transaction.discount || 0),
        charge: roundAmount(transaction.charge || 0),
        book: bookMap.get(transaction.book_id)?.name || "",
      }
    })

    const bookName = allBooks ? "All books" : bookMap.get(numericId)?.name || `Book ${numericId}`
    const first = rows[0]
    const last = rows[rows.length - 1]
    const rangeLabel = !first
      ? "No transactions"
      : first.dateLabel === last.dateLabel
        ? first.dateLabel
        : `${first.dateLabel} – ${last.dateLabel}`

    return { rows, includeBook: allBooks, bookName, rangeLabel }
  }

  async function buildCsvFile(filters) {
    const { rows, includeBook, bookName } = await collect(filters)

    const headers = [
      "Date",
      "Type",
      ...(includeBook ? ["Book"] : []),
      "Category",
      "Payment Mode",
      "Contact",
      "Description",
      "Products",
      "Discount",
      "Charge",
      "Amount",
    ]

    const data = rows.map((row) => [
      String(row.date || "").slice(0, 16),
      row.type,
      ...(includeBook ? [row.book] : []),
      row.category,
      row.paymentMode,
      row.contact,
      row.description,
      row.products,
      row.discount.toFixed(2),
      row.charge.toFixed(2),
      row.amount.toFixed(2),
    ])

    // The BOM is what makes Excel read the file as UTF-8 instead of mangling
    // non-Latin names.
    const blob = new Blob(["\uFEFF", toCsv(headers, data)], { type: "text/csv;charset=utf-8" })

    return new File([blob], fileName(bookName, "csv"), { type: "text/csv" })
  }

  async function buildPdfFile(filters) {
    const { rows, includeBook, bookName, rangeLabel } = await collect(filters)

    const income = roundAmount(
      rows.filter((row) => row.isIncome).reduce((total, row) => total + row.amount, 0),
    )
    const expense = roundAmount(
      rows.filter((row) => !row.isIncome).reduce((total, row) => total + row.amount, 0),
    )

    const now = formatDateTimeForDB()

    const blob = await buildStatementPdf({
      bookName,
      rows,
      summary: { income, expense, net: roundAmount(income - expense) },
      includeBook,
      rangeLabel,
      generatedLabel: `${formatStatementDate(now)} ${now.slice(11, 16)}`,
    })

    return new File([blob], fileName(bookName, "pdf"), { type: "application/pdf" })
  }

  async function countTransactions({ bookId, startDate = "", endDate = "" }) {
    return selectTransactions(bookId, startDate, endDate).count()
  }

  async function shareOrDownload(file) {
    if (canShareFiles()) {
      try {
        await navigator.share({ files: [file], title: file.name })
        return "shared"
      } catch (error) {
        // A cancelled share is not an error worth reporting.
        if (error?.name === "AbortError") return "cancelled"
        // Anything else (no longer a user gesture, platform refusal) falls
        // through to a download so the export is not lost.
      }
    }

    download(file)
    return "downloaded"
  }

  return { buildCsvFile, buildPdfFile, countTransactions, shareOrDownload, download }
}
