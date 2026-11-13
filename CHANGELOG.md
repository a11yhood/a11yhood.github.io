# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `vX.Y.Z`.

This file starts from the change below; prior history is not backfilled.

## [Unreleased]

### Fixed

- Header: below the `sm` breakpoint (phones, or a desktop browser zoomed in past it) the About, Blog and Collections links showed only an icon and had no accessible name, because their labels used `hidden sm:inline`. Screen readers announced them as unnamed links and voice control could not target them (axe `link-name`). The labels now use `sr-only sm:not-sr-only`, so they stay available to assistive technology at every width; the layout is unchanged. See a11yhood/a11yhood.github.io#73.
- Header: the signed-in user menu button showed the username but was named "User menu", so a voice control user saying "click <username>" got no match (WCAG 2.5.3 Label in Name). Its name now starts with the username ("alice, user menu"). See a11yhood/a11yhood.github.io#73.

## [0.6.1] - 2026-11-01

### Changed

- Products page: paging, sort and filter clicks now fetch faster instead of waiting out the 400 ms search-typing debounce (the debounce still applies while the search text changes), and product card and list images load lazily, so a page no longer requests all of its images at once through the backend. See a11yhood/a11yhood.github.io#441.

### Fixed

- Products page: clicking "Previous" back to page 1 on the default view (no filters or sort change) no longer leaves page 2's products on screen under a "Page 1" label. The "reuse the initial load's products" shortcut now applies only until the view first moves off them, so returning to the default view refetches. Covered by a regression test in `App.pagination.filters.test.tsx`. See a11yhood/a11yhood.github.io#441.
- Products page: clicking "Next" with a source, tag, type, rating, search or date filter active no longer snaps back to page 1. The page now resets only when the filters themselves change, instead of after every fetch. See a11yhood/a11yhood.github.io#521.
- Collection write calls (`APIService.updateCollection`, `deleteCollection`, `addProductToCollection`, `removeProductFromCollection`, `addMultipleProductsToCollection`, `addCollectionEditor`, `removeCollectionEditor`) now send the collection's and product's UUID `id` instead of a slug, matching the backend's write-endpoint contract (a11yhood/backend#288). A slug on these calls now returns `404`. Reads are unaffected. See a11yhood/a11yhood.github.io#524.
