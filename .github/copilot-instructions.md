# Copilot Instructions for a11yhood

## Project Overview

a11yhood is an accessibility-focused platform for discovering and sharing accessible software, tutorials, and resources. The codebase is a React + TypeScript single-page application built with Vite, Tailwind CSS, Radix UI primitives, and tested with Vitest and Testing Library.

## Accessibility First

**Accessibility is the core mission of this project. Every piece of code must be accessible by default.**

### Prefer Native HTML

- Use native HTML elements whenever they provide the needed semantics: `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<aside>`, `<details>`, `<summary>`, `<dialog>`, `<form>`, `<fieldset>`, `<legend>`, `<label>`, `<select>`, `<input>`, `<textarea>`, etc.
- Avoid `<div>` or `<span>` as interactive elements. If a custom interactive element is unavoidable, add the correct `role`, `aria-*` attributes, and keyboard event handlers.
- Never use `<div role="button">` when `<button>` will work.
- Prefer `<a href="...">` for navigation and `<button type="button">` for actions.
- Use `<details>` / `<summary>` for disclosure widgets before reaching for a custom accordion.

### Semantic Structure

- Every page must have exactly one `<main>` landmark.
- Use heading levels (`<h1>`–`<h6>`) in a logical, non-skipping order.
- Group related form controls with `<fieldset>` and `<legend>`.
- Use `<ul>` / `<ol>` / `<li>` for lists, not bare `<div>` stacks.

### Labels and Names

- Every interactive element must have an accessible name:
  - `<input>` / `<textarea>` / `<select>` paired with an associated `<label>` (via `htmlFor`/`id` or wrapping).
  - Icon-only buttons need `aria-label` or visually-hidden text (e.g. `<span className="sr-only">`).
  - Images need meaningful `alt` text; decorative images use `alt=""`.
- Use `aria-describedby` to associate helper or error text with an input.

### Keyboard and Focus Management

- All interactive elements must be reachable and operable via keyboard.
- Manage focus explicitly when opening/closing dialogs, drawers, or dynamic panels. Return focus to the trigger on close.
- Do not use `tabIndex` values greater than `0`.
- Ensure visible focus styles are never removed (do not use `outline: none` without a replacement style).
- Trap focus inside modal dialogs (Radix UI dialog components do this automatically—use them).

### Color and Contrast

- Do not convey information by color alone; pair color cues with text or icons.
- Maintain WCAG AA contrast ratios: 4.5:1 for normal text, 3:1 for large text and UI components.
- Support both light and dark themes through Tailwind and, if theme switching is implemented, a properly configured `next-themes` provider.

### Motion and Animation

- Respect `prefers-reduced-motion` when using Framer Motion or CSS animations.
- Framer Motion: wrap animated variants with `useReducedMotion()` or use the `LazyMotion` / `AnimatePresence` reduced-motion variants.

### ARIA Usage

- Only use ARIA when no native HTML element provides the needed semantics.
- Never use a `role` that contradicts the underlying element (e.g. `<a role="button">` without `href`).
- Live regions (`aria-live`, `aria-atomic`) should be used for dynamic status messages (loading, success, errors).
- Use `aria-expanded`, `aria-controls`, `aria-haspopup` correctly on disclosure and menu triggers.

### Testing Accessibility

- Write accessibility tests using `@testing-library/react` — query elements by their accessible role, label, or text (e.g. `getByRole('button', { name: /submit/i })`) rather than by CSS class or test ID.
- Add tests in `src/__tests__/accessibility/` for new interactive components.
- Prefer `getByRole`, `getByLabelText`, `getByText`, and `findByRole` over `getByTestId`.

## Tech Stack Conventions

- **React 19 + TypeScript** — use functional components and hooks; no class components.
- **Radix UI primitives** — prefer them over custom ARIA widgets for complex patterns (menus, dialogs, tooltips, tabs, switches, etc.). They handle accessibility out of the box.
- **Tailwind CSS v4** — use utility classes and `sr-only` for visually-hidden text.
- **Vite** — the build tool; `npm run dev` starts the dev server.
- **Vitest + Testing Library** — `npm run test:run` for a single test pass, `npm run test` for watch mode.
- **ESLint** — `npm run lint` must pass before merging.
- **`username`** is the canonical user identifier in frontend code, API payloads, and route params (e.g. `/profile/:username`). Do not introduce new `login` fields.

## Code Style

- Keep components small and focused on a single responsibility.
- Co-locate types with the component or in `src/lib/types.ts` for shared types.
- Use `clsx` / `tailwind-merge` for conditional class names.
- Prefer named exports for components.
- Document non-obvious accessibility decisions with a brief comment.
