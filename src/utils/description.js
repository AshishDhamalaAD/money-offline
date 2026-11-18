// Text-only descriptions.
//
// Older rows (and data arriving from sync) can contain HTML such as
// `<p>Lunch</p>`. The app never renders HTML for descriptions any more: this
// helper turns markup into readable plain text for display, search and export,
// which removes the injection path instead of filtering it.

const BLOCK_END = /<\/(p|div|li|h[1-6]|tr|blockquote|section|article|pre)>/gi
const LINE_BREAK = /<br\s*\/?>/gi
const SCRIPT_OR_STYLE = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi
const ANY_TAG = /<\/?[a-z][^>]*>/gi
const ENTITY = /&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
}

function decodeEntities(text) {
  return text.replace(ENTITY, (match, entity) => {
    const key = entity.toLowerCase()

    if (key.startsWith("#")) {
      const code = key.startsWith("#x")
        ? Number.parseInt(key.slice(2), 16)
        : Number.parseInt(key.slice(1), 10)

      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code)
        } catch {
          return match
        }
      }

      return match
    }

    return NAMED_ENTITIES[key] ?? match
  })
}

export function descriptionToText(value) {
  if (value == null) return ""

  let text = String(value)

  // Plain text is the normal case: leave it exactly as the user typed it,
  // including a literal "<" or "&".
  if (!/<\/?[a-z][^>]*>/i.test(text)) return text

  text = text.replace(SCRIPT_OR_STYLE, "")
  text = text.replace(LINE_BREAK, "\n")
  text = text.replace(BLOCK_END, "\n")
  text = text.replace(ANY_TAG, "")
  text = decodeEntities(text)

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
