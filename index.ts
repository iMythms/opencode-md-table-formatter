import type { Plugin, Hooks } from "@opencode-ai/plugin"

declare const Bun: any

// Width cache for performance optimization
const widthCache = new Map<string, number>()
let cacheOperationCount = 0

// Box-drawing characters for table borders
const BOX = {
  topLeft: "┌",
  topRight: "┐",
  topTee: "┬",
  bottomLeft: "└",
  bottomRight: "┘",
  bottomTee: "┴",
  midLeft: "├",
  midRight: "┤",
  midCross: "┼",
  horizontal: "─",
  vertical: "│",
}

export const FormatTables: Plugin = async () => {
  return {
    "experimental.text.complete": async (
      input: { sessionID: string; messageID: string; partID: string },
      output: { text: string },
    ) => {
      if (typeof output.text !== "string") return;
      
      try {
        output.text = formatMarkdownTables(output.text)
      } catch (error) {
        // If formatting fails, keep original md text
        output.text = output.text + "\n\n<!-- table formatting failed: " + (error as Error).message + " -->"
      }
    },
  } as Hooks
}

function formatMarkdownTables(text: string): string {
  const lines = text.split("\n")
  const result: string[] = []
  let i = 0
  let insideCodeFence = false

  while (i < lines.length) {
    const line = lines[i]

    // Track code fence boundaries (``` or ~~~)
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      insideCodeFence = !insideCodeFence
      result.push(line)
      i++
      continue
    }

    // Skip all content inside code fences
    if (insideCodeFence) {
      result.push(line)
      i++
      continue
    }

    // Detect and skip complete box-drawing tables (┌...│...└ blocks)
    if (isBoxDrawingBorderLine(line)) {
      // Collect the entire box-drawing block
      const blockStart = i
      result.push(line)
      i++
      while (i < lines.length && (isBoxDrawingBorderLine(lines[i]) || isBoxDrawingDataLine(lines[i]))) {
        result.push(lines[i])
        i++
      }
      continue
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [line]
      i++

      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i])
        i++
      }

      if (isValidTable(tableLines)) {
        result.push(...formatTable(tableLines))
      } else {
        result.push(...tableLines)
        result.push("<!-- table not formatted: invalid structure -->")
      }
    } else {
      result.push(line)
      i++
    }
  }

  incrementOperationCount()
  return result.join("\n")
}

// Detect box-drawing border lines: ┌───┬───┐, ├───┼───┤, └───┴───┘
function isBoxDrawingBorderLine(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed.startsWith("┌") ||
    trimmed.startsWith("├") ||
    trimmed.startsWith("└")
  )
}

// Detect box-drawing data lines: │ cell │ cell │
// Only matches lines using ONLY │ (no |), indicating they are part of
// a complete box-drawing table, not AI-mixed markdown
function isBoxDrawingDataLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith("│") && trimmed.endsWith("│") && !trimmed.includes("|")
}

// Strip box-drawing characters that the AI might embed inside markdown pipe cells
// e.g. the AI sometimes outputs: | Bold | text │ ✓ │ |
// We need to clean out the stray │ ─ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ characters
function sanitizeCell(cell: string): string {
  return cell.replace(/[│┌┐└┘├┤┬┴┼─]/g, "").trim()
}

// Normalize a table line by replacing box-drawing │ with |
// then collapsing any resulting double-pipes (e.g. "| text │ |" → "| text | |" → "| text |")
function normalizeTableLine(line: string): string {
  // Replace │ with |
  let normalized = line.replace(/│/g, "|")
  // Collapse sequences like "| |" (pipe-space-pipe with no content) at boundaries
  // and consecutive pipes "||" into single "|"
  normalized = normalized.replace(/\|\s*\|/g, "|")
  // Ensure it still starts and ends with |
  normalized = normalized.trim()
  return normalized
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  // Normalize box-drawing │ to | for AI-mixed output
  const normalized = normalizeTableLine(trimmed)
  return normalized.startsWith("|") && normalized.endsWith("|") && normalized.split("|").length > 2
}

function isSeparatorRow(line: string): boolean {
  const normalized = normalizeTableLine(line.trim())
  if (!normalized.startsWith("|") || !normalized.endsWith("|")) return false
  const cells = normalized.split("|").slice(1, -1)
  return cells.length > 0 && cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell))
}

function isValidTable(lines: string[]): boolean {
  if (lines.length < 2) return false

  const rows = lines.map((line) =>
    normalizeTableLine(line)
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  )

  if (rows.length === 0 || rows[0].length === 0) return false

  const firstRowCellCount = rows[0].length
  const allSameColumnCount = rows.every((row) => row.length === firstRowCellCount)
  if (!allSameColumnCount) return false

  const hasSeparator = lines.some((line) => isSeparatorRow(line))
  return hasSeparator
}

function formatTable(lines: string[]): string[] {
  const separatorIndices = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    if (isSeparatorRow(lines[i])) separatorIndices.add(i)
  }

  const rows = lines.map((line) =>
    normalizeTableLine(line)
      .split("|")
      .slice(1, -1)
      .map((cell) => sanitizeCell(cell.trim())),
  )

  if (rows.length === 0) return lines

  const colCount = Math.max(...rows.map((row) => row.length))

  const colAlignments: Array<"left" | "center" | "right"> = Array(colCount).fill("left")
  for (const rowIndex of separatorIndices) {
    const row = rows[rowIndex]
    for (let col = 0; col < row.length; col++) {
      colAlignments[col] = getAlignment(row[col])
    }
  }

  const colWidths: number[] = Array(colCount).fill(3)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    if (separatorIndices.has(rowIndex)) continue
    const row = rows[rowIndex]
    for (let col = 0; col < row.length; col++) {
      const displayWidth = calculateDisplayWidth(row[col])
      colWidths[col] = Math.max(colWidths[col], displayWidth)
    }
  }

  // Build the formatted table with box-drawing characters
  const result: string[] = []

  // Top border: ┌─────┬─────┐
  result.push(buildBorderRow(colWidths, BOX.topLeft, BOX.topTee, BOX.topRight))

  // Filter out separator rows — only render data rows
  const dataRows = rows.filter((_, idx) => !separatorIndices.has(idx))

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]

    // Data row: │ cell │ cell │
    const cells: string[] = []
    for (let col = 0; col < colCount; col++) {
      const cell = row[col] ?? ""
      const align = colAlignments[col]
      cells.push(padCell(cell, colWidths[col], align))
    }
    result.push(BOX.vertical + " " + cells.join(" " + BOX.vertical + " ") + " " + BOX.vertical)

    // Mid border between rows: ├─────┼─────┤ (not after the last row)
    if (i < dataRows.length - 1) {
      result.push(buildBorderRow(colWidths, BOX.midLeft, BOX.midCross, BOX.midRight))
    }
  }

  // Bottom border: └─────┴─────┘
  result.push(buildBorderRow(colWidths, BOX.bottomLeft, BOX.bottomTee, BOX.bottomRight))

  return result
}

function buildBorderRow(
  colWidths: number[],
  left: string,
  mid: string,
  right: string,
): string {
  const segments = colWidths.map((w) => BOX.horizontal.repeat(w + 2))
  return left + segments.join(mid) + right
}

function getAlignment(delimiterCell: string): "left" | "center" | "right" {
  const trimmed = delimiterCell.trim()
  const hasLeftColon = trimmed.startsWith(":")
  const hasRightColon = trimmed.endsWith(":")

  if (hasLeftColon && hasRightColon) return "center"
  if (hasRightColon) return "right"
  return "left"
}

function calculateDisplayWidth(text: string): number {
  if (widthCache.has(text)) {
    return widthCache.get(text)!
  }

  const width = getStringWidth(text)
  widthCache.set(text, width)
  return width
}

function getStringWidth(text: string): number {
  // Strip markdown symbols for concealment mode
  // OpenCode's TUI hides **, *, ~~, ` visually but preserves content inside `code`

  // Step 1: Extract and protect inline code content
  const codeBlocks: string[] = []
  let textWithPlaceholders = text.replace(/`(.+?)`/g, (match, content) => {
    codeBlocks.push(content)
    return `\x00CODE${codeBlocks.length - 1}\x00`
  })

  // Step 2: Strip markdown from non-code parts (multi-pass for nested)
  let visualText = textWithPlaceholders
  let previousText = ""

  while (visualText !== previousText) {
    previousText = visualText
    visualText = visualText
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1") // ***bold+italic***
      .replace(/\*\*(.+?)\*\*/g, "$1")     // **bold**
      .replace(/\*(.+?)\*/g, "$1")         // *italic*
      .replace(/~~(.+?)~~/g, "$1")         // ~~strikethrough~~
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")        // ![alt](url) -> alt
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")    // [text](url) -> text (url)
  }

  // Step 3: Restore code content (markdown inside backticks is literal)
  visualText = visualText.replace(/\x00CODE(\d+)\x00/g, (match, index) => {
    return codeBlocks[parseInt(index)]
  })

  return Bun.stringWidth(visualText)
}

function padCell(text: string, width: number, align: "left" | "center" | "right"): string {
  const displayWidth = calculateDisplayWidth(text)
  const totalPadding = Math.max(0, width - displayWidth)

  if (align === "center") {
    const leftPad = Math.floor(totalPadding / 2)
    const rightPad = totalPadding - leftPad
    return " ".repeat(leftPad) + text + " ".repeat(rightPad)
  } else if (align === "right") {
    return " ".repeat(totalPadding) + text
  } else {
    return text + " ".repeat(totalPadding)
  }
}

function incrementOperationCount() {
  cacheOperationCount++

  if (cacheOperationCount > 100 || widthCache.size > 1000) {
    cleanupCache()
  }
}

function cleanupCache() {
  widthCache.clear()
  cacheOperationCount = 0
}
