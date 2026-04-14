---
name: design
description: "Comprehensive UI/UX design review and implementation. Bundles 7 design skills: frontend-design, make-interfaces-feel-better, refactoring-ui, tailwind-design-system, ui-animation, ui-ux-pro-max, web-design-guidelines. Use when designing, building, reviewing, or improving any visual interface."
---

# Design (Combined Skill)

This skill bundles all design-related skills into a single entry point.

## Included Skills

| Skill | Purpose |
|-------|---------|
| `ui-ux-pro-max` | Design system generation, style/color/font recommendations, UX guidelines |
| `frontend-design` | Production-grade frontend interface creation |
| `make-interfaces-feel-better` | Polish, micro-interactions, shadows, borders, typography details |
| `refactoring-ui` | Visual hierarchy, spacing, color, depth audit and fixes |
| `tailwind-design-system` | Tailwind CSS v4 design systems and component patterns |
| `ui-animation` | Motion, springs, gestures, CSS transitions, animation review |
| `web-design-guidelines` | Web Interface Guidelines compliance review |
## How to Use

When `/design` is invoked, follow this workflow:

### 1. Determine the task type

| Task | Primary Skill | Supporting Skills |
|------|--------------|-------------------|
| New page/component design | `ui-ux-pro-max` | `frontend-design`, `tailwind-design-system` |
| Design review / audit | `refactoring-ui` | `web-design-guidelines` |
| Polish / "make it feel better" | `make-interfaces-feel-better` | `ui-animation` |
| Animation / motion | `ui-animation` | `make-interfaces-feel-better` |
| Style/color/font selection | `ui-ux-pro-max` | `refactoring-ui` |
| Design system / tokens | `tailwind-design-system` | `ui-ux-pro-max` |

### 2. Load the relevant sub-skill

Use the `Skill` tool to invoke the primary sub-skill for the task. If the task spans multiple areas, invoke them sequentially.

### 3. Apply guidelines from all relevant skills

When implementing or reviewing, cross-reference guidelines from all applicable sub-skills to ensure comprehensive coverage.
