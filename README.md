# brag-sheet (Simple Antigravity Plugin)

A zero-dependency, Antigravity-native plugin that turns AI coding sessions into structured, evidence-backed impact statements for performance reviews, self-reviews, and weekly updates.

## Components Included

- **Skill**: [`skills/brag-sheet/SKILL.md`](skills/brag-sheet/SKILL.md) — 3-part impact statement writer (`Did [action] → [result/impact] → [evidence]`), Backfill scanner, and Review Prep.
- **Hook**: [`hooks.json`](hooks.json) & [`hooks/post-tool-use.mjs`](hooks/post-tool-use.mjs) — PostToolUse lifecycle hook classifying file creation (`write_to_file`), edits (`replace_file_content`), and git commands (`run_command`).
- **Evals**: [`evals/evals.json`](evals/evals.json) — Benchmark test scenarios in the style of [chakrit/kien-thai](https://github.com/chakrit/kien-thai), with strict frontmatter validation, contract checking, and lifecycle tests.

## Installation

Install directly into Antigravity CLI via:

```bash
agy plugin install ./plugins/brag-sheet
```

Verify installation:

```bash
agy plugin list
```

## Running Evals & Tests

Run all unit tests, frontmatter validation, and install lifecycle evals:

```bash
npm test
# or
node --test test/*.test.mjs
```

Validate plugin structure with `agy`:

```bash
agy plugin validate .
```

## License

MIT
