# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `vX.Y.Z`.

This file starts from the change below; prior history is not backfilled.

## [Unreleased]

### Fixed

- Collection write calls (`APIService.updateCollection`, `deleteCollection`, `addProductToCollection`, `removeProductFromCollection`, `addMultipleProductsToCollection`, `addCollectionEditor`, `removeCollectionEditor`) now send the collection's and product's UUID `id` instead of a slug, matching the backend's write-endpoint contract (a11yhood/backend#288). A slug on these calls now returns `404`. Reads are unaffected. See a11yhood/a11yhood.github.io#524.
