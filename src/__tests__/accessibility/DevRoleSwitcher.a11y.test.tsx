import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
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
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
