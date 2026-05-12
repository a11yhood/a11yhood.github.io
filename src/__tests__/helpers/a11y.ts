import { axe } from 'vitest-axe'

export async function runA11yScan(container: HTMLElement): ReturnType<typeof axe> {
  return axe(container)
}
