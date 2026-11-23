# Accessibility

a11yhood exists to connect people with accessibility technology. A core value of our site is to do so accessibly. However, we are a small team and do not always get everything right. In addition, because a lot of our products are scraped or entered by others, we cannot control their accessibility. If something is hard to use, please tell us.

## Planned Goal

We aim to meet **WCAG 2.2 Level AA** 

Our priorities, in order:

1. **Keyboard use.** Every link and control shoudl be reachable and usable without a mouse, in a logical order, with a visible focus indicator.
2. **Screen readers.** Pages have clear headings, landmarks, labels, and error messages. Changes to the page are announced.
3. **Zoom and reflow.** Content works at 200% zoom and reflows at 400% without losing information or functionality.
4. **Color and contrast.** Text has enough contrast, and color is not the only way to show meaning.
5. **Plain language.** We prefer plain wording over jargon and spell out acronyms on first use.
6. **Motion.** Animations respect the reduced-motion setting.

We have not yet completed a full audit against WCAG 2.2 AA. Our current testing process is described below, and known problems are tracked as issues labeled [`a11y`](https://github.com/a11yhood/a11yhood.github.io/labels/a11y).

## Report an accessibility barrier

If you run into a barrier on a11yhood, please let us know. You do not need to understand the technical cause.

**Option 1: GitHub.** [Open an issue](https://github.com/a11yhood/a11yhood.github.io/issues/new) and add the `a11y` label.

**Option 2: Email.** If GitHub is not familiar for you to use, or you would rather not post publicly, email **create-contact@uw.edu**. We will open an issue for you if you want one, and we will not share your name or any details  without your permission.

It helps if you can tell us:

- What you were trying to do, and on which page
- What you expected to happen, and what happened instead
- Your browser, operating system, and any accessibility technology you were using (with version if you know it)
- How much it got in your way (see severity levels below)

Partial reports are welcome. Please do not hold back because you are unsure of the details.

## Our process for addressing accessibility

We are a small team with limited time, so we cannot promise a specific response time or fix date. What we do commit to:

- A person reads every report and replies with a respectful acknowledgement as soon as we can. We may also ask clarifying questions, if needed.
- We will also label and track the issue and update you when things change. After our own testing is done, if you are willing to help, we will check in on the fix before resolving anything
- We are happy to suggest a workaround if we know of one.

## Severity levels

We use these to prioritize our work. They describe how much a barrier affects a person's ability to complete a task. The below table gives examples (not actual errors on the site!)

| Level | Meaning | Example  |
|---|---|---|
| **Critical** | Blocks a  task completely, with no workaround | Cannot submit a product with your AT |
| **Serious** | A task is possible only with great difficulty or a workaround | Error messages are not announced by screen readers |
| **Moderate** | A task is possible but frustrating or confusing | Heading levels skip, making navigation slower |
| **Minor** | Small annoyance, task is not affected | A decorative image has unnecessary alt text 

Critical and serious barriers on core tasks (finding, viewing, and submitting products, collections, and requests) are prioritized first. 

## Who is responsible

The **CREATE** team at the University of Washington owns accessibility triage for a11yhood: reading reports, assigning severity, and following up with reporters. Contact: **create-contact@uw.edu**.

## Contributing

Everyone who contributes UI changes shares responsibility for accessibility. For general guidance, see [CONTRIBUTING](https://github.com/a11yhood/community/blob/main/CONTRIBUTING.md). For changes to the website, we expect:

- **Semantic HTML first.** Use native elements such as `<button>`, `<nav>`, and `<main>`. Use ARIA only when native HTML is not enough.
- **Keyboard and focus.** Check that your change works with the keyboard alone and that focus is visible and in a sensible order.
- **Labels and errors.** Every form control has a label, and errors are announced.
- **Not color alone.** Check contrast and use more than color to show state.
- **Automated checks pass.** Run `npm run test:a11y` and `npm run lint` before opening a pull request. Our CI runs axe-based tests, and an accessibility scan runs against the live site after each production release.
- **Manual check for UI changes.** Try your change with the keyboard, and with a screen reader at least once if the change is significant. Say what you checked in the pull request.
- **Complete the accessibility checklist** in the pull request template.

New contributors are welcome. Issues labeled `a11y` and `good first issue` are scoped to be approachable.

## Known issues

Known accessibility problems are listed under the [`a11y` label](https://github.com/a11yhood/a11yhood.github.io/labels/a11y). We have not yet done a full manual audit; keyboard-only and screen reader checks of core flows are planned ([#584](https://github.com/a11yhood/a11yhood.github.io/issues/584)).

## Feedback on this document

If this page is unclear or hard to use, tell us through either channel above.
