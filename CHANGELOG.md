# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `vX.Y.Z`.

This file starts from the change below; prior history is not backfilled.

## [Unreleased]

### Fixed

- Products page: clicking "Next" with a source, tag, type, rating, search or date filter active no longer snaps back to page 1. The page now resets only when the filters themselves change, instead of after every fetch. See a11yhood/a11yhood.github.io#521.
- Collection write calls (`APIService.updateCollection`, `deleteCollection`, `addProductToCollection`, `removeProductFromCollection`, `addMultipleProductsToCollection`, `addCollectionEditor`, `removeCollectionEditor`) now send the collection's and product's UUID `id` instead of a slug, matching the backend's write-endpoint contract (a11yhood/backend#288). A slug on these calls now returns `404`. Reads are unaffected. See a11yhood/a11yhood.github.io#524.
