# @imythms/opencode-md-table-formatter

Markdown table formatter plugin for OpenCode with box-drawing borders and concealment mode support.

> Forked from [@franlol/opencode-md-table-formatter](https://github.com/franlol/opencode-md-table-formatter) by [franlol](https://github.com/franlol). Original work licensed under MIT.

## Usage

Add the plugin to your `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["@imythms/opencode-md-table-formatter@latest"],
}
```

## Example

Standard markdown tables are automatically transformed into box-drawing bordered tables:

**Before (markdown input):**

```
| Name            | Age | Grade |
| --------------- | --- | ----- |
| Emma Johnson    | 14  | 9th   |
| Liam Smith      | 15  | 10th  |
| Olivia Williams | 16  | 11th  |
```

**After (formatted output):**

```
┌─────────────────┬─────┬───────┐
│ Name            │ Age │ Grade │
├─────────────────┼─────┼───────┤
│ Emma Johnson    │ 14  │ 9th   │
├─────────────────┼─────┼───────┤
│ Liam Smith      │ 15  │ 10th  │
├─────────────────┼─────┼───────┤
│ Olivia Williams │ 16  │ 11th  │
└─────────────────┴─────┴───────┘
```

## Features

- **Box-drawing borders** - Tables rendered with Unicode box-drawing characters (`┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ │ ─`)
- **Row separators** - Horizontal borders between every row for clear visual separation
- **Automatic table formatting** - Formats markdown tables after AI text completion
- **Concealment mode compatible** - Correctly calculates column widths when markdown symbols are hidden
- **Alignment support** - Left (`:---`), center (`:---:`), and right (`---:`) text alignment
- **Nested markdown handling** - Strips bold, italic, strikethrough with multi-pass algorithm
- **Code block preservation** - Preserves markdown symbols inside inline code (`` `**bold**` ``)
- **Edge case handling** - Emojis, unicode characters, empty cells, long content
- **Silent operation** - No console logs, errors don't interrupt workflow
- **Validation feedback** - Invalid tables get helpful error comments

**Key behaviors:**

- Bold/italic symbols outside code are hidden by concealment but width calculated correctly
- `**bold**` inside backticks shows as literal text with proper spacing
- Emojis and unicode characters align properly
- Columns have consistent spacing with proper box-drawing borders

## How It Works

This plugin uses OpenCode's `experimental.text.complete` hook to format markdown tables after the AI finishes generating text. It intelligently strips markdown symbols (for width calculation) while preserving symbols inside inline code blocks, ensuring tables align correctly ONLY with OpenCode's concealment mode enabled (the default setting).

The plugin uses a multi-pass regex algorithm to handle nested markdown (like `**bold with `code` inside**`) and caches width calculations for performance. Table borders are rendered using Unicode box-drawing characters for a clean, professional appearance.

## Troubleshooting

**Tables not formatting?**

- Ensure the plugin is listed in your `.opencode/opencode.jsonc` config
- Restart OpenCode after adding the plugin
- Check that tables have a separator row (`|---|---|`)

**Invalid table structure comment?**

- The plugin validates tables before formatting
- All rows must have the same number of columns
- Tables must have at least 2 rows including the separator

## Requirements

- OpenCode >= 1.0.137

## License

MIT - see [LICENSE](./LICENSE) for details.

Original work: Copyright (c) 2025 [franlol](https://github.com/franlol)
Modifications: Copyright (c) 2026 [Maitham Jasim](https://github.com/iMythms)

## Links

- [GitHub Repository](https://github.com/iMythms/opencode-md-table-formatter)
- [npm Package](https://www.npmjs.com/package/@imythms/opencode-md-table-formatter)
- [Report Issues](https://github.com/iMythms/opencode-md-table-formatter/issues)
- [Original Project](https://github.com/franlol/opencode-md-table-formatter)
