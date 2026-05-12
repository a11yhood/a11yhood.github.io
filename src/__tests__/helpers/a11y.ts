import { axe } from 'vitest-axe'
import type { AxeResults } from 'axe-core'

export async function runA11yScan(container: HTMLElement): Promise<AxeResults> {
  return axe(container)
}
