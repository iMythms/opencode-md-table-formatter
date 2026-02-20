import { describe, expect, test } from "bun:test"
import { formatMarkdownTables } from "./index"

/**
 * These tests verify width calculation for markdown that gets "concealed" in OpenCode.
 * 
 * IMPORTANT: The raw output may look misaligned, but that's intentional!
 * In concealment mode, markdown symbols (**, *, _, ~, ^, etc.) are hidden visually.
 * The formatter calculates column widths based on VISUAL width, not raw character count.
 * 
 * Example: `_Italic_` is 8 raw chars but displays as "Italic" (6 chars) when concealed.
 * So the column is padded to width 6, making the raw text appear to overflow.
 * When viewed in OpenCode with concealment ON, the columns align perfectly.
 */

describe("formatMarkdownTables", () => {
  describe("markdown concealment - underscore styles", () => {
    test("calculates correct width for _italic_", () => {
      const input = `
| Style | Example |
|-------|---------|
| _Italic_ | text |
`.trim()

      expect(formatMarkdownTables(input)).toMatchInlineSnapshot(`
        "| Style  | Example |
        | ------ | ------- |
        | _Italic_ | text    |"
      `)
    })

    test("calculates correct width for __bold__", () => {
      const input = `
| Style | Example |
|-------|---------|
| __Bold__ | text |
`.trim()

      expect(formatMarkdownTables(input)).toMatchInlineSnapshot(`
        "| Style | Example |
        | ----- | ------- |
        | __Bold__  | text    |"
      `)
    })

    test("calculates correct width for **_bold italic_**", () => {
      const input = `
| Style | Example |
|-------|---------|
| **_Mixed_** | text |
`.trim()

      expect(formatMarkdownTables(input)).toMatchInlineSnapshot(`
        "| Style | Example |
        | ----- | ------- |
        | **_Mixed_** | text    |"
      `)
    })
  })

  describe("markdown concealment - subscript and superscript", () => {
    test("calculates correct width for ~subscript~", () => {
      const input = `
| Style | Example |
|-------|---------|
| H~2~O | text |
`.trim()

      expect(formatMarkdownTables(input)).toMatchInlineSnapshot(`
        "| Style | Example |
        | ----- | ------- |
        | H~2~O   | text    |"
      `)
    })

    test("calculates correct width for ^superscript^", () => {
      const input = `
| Style | Example |
|-------|---------|
| E=mc^2^ | text |
`.trim()

      expect(formatMarkdownTables(input)).toMatchInlineSnapshot(`
        "| Style | Example |
        | ----- | ------- |
        | E=mc^2^ | text    |"
      `)
    })
  })
})
