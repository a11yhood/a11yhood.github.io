import { defineConfig } from 'vitest/config'
import { createVitestConfig, REDUCED_TEST_INCLUDE } from './vitest.shared'

export default defineConfig(({ mode }) => createVitestConfig(mode, REDUCED_TEST_INCLUDE))
