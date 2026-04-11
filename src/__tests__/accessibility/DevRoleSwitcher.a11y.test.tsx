import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import { MemoryRouter } from 'react-router-dom'

describe('DevRoleSwitcher accessibility', () => {
  it('has no button-name violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <DevRoleSwitcher userAccount={null} />
      </MemoryRouter>
    )
    await act(async () => {})
    const results = await axe(container)
    if (results.violations.length > 0) {
      console.log('VIOLATIONS:', JSON.stringify(results.violations.map((v: any) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n: any) => n.html)
      })), null, 2))
    }
    expect(results).toHaveNoViolations()
  })
})
