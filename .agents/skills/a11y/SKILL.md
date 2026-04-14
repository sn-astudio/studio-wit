---
name: a11y
description: "Comprehensive accessibility audit and remediation. Bundles 4 a11y skills: contrast-checker (WCAG color contrast), link-purpose (WCAG 2.4.4 link text), use-of-color (WCAG 1.4.1 color-only info), refactor (accessibility refactoring). Use when checking accessibility, WCAG compliance, color contrast, ARIA patterns, or fixing a11y issues."
---

# A11y (Combined Skill)

This skill bundles all accessibility-related skills into a single entry point.

## Included Skills

| Skill | WCAG Criteria | Purpose |
|-------|---------------|---------|
| `contrast-checker` | 1.4.3 Contrast (Minimum) | Calculate contrast ratios, find violations, suggest accessible alternatives |
| `link-purpose` | 2.4.4 Link Purpose (In Context) | Identify generic/ambiguous link text, recommend descriptive text and ARIA |
| `use-of-color` | 1.4.1 Use of Color | Find color-only information conveyance, recommend additional indicators |
| `refactor` | Multiple | Automated a11y refactoring: extract accessible components, fix ARIA patterns |

## How to Use

When `/a11y` is invoked, run a full accessibility audit:

### 1. Scope

Determine what to audit:
- **Specific file/component**: audit only that file
- **Page**: audit all components rendered on that page
- **Full project**: audit all components in `src/components/`

### 2. Run all checks in parallel

Launch all 4 sub-skills concurrently on the target scope:

| Check | What it finds |
|-------|---------------|
| **Contrast** | Text/background pairs below 4.5:1 (AA) or 3:1 (large text) |
| **Link Purpose** | Generic link text ("click here", "read more") without context |
| **Use of Color** | Status/error/success conveyed by color alone (no icon/text) |
| **ARIA Patterns** | Missing labels, roles, states; broken focus order; inaccessible widgets |

### 3. Report and fix

- List all violations grouped by severity (Critical / Major / Minor)
- Auto-fix what can be safely fixed
- Flag items that need design decisions for user input
