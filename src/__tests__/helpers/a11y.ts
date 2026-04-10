import { axe, type AxeResults } from 'vitest-axe'

export async function runA11yScan(container: HTMLElement): Promise<AxeResults> {
  return axe(container)
}
