import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AdminUsersStats } from '@/components/AdminUsersStats'
import { MemoryRouter } from 'react-router-dom'

describe('AdminUsersStats accessibility', () => {
  it('has no button-name violations in empty state', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminUsersStats />
      </MemoryRouter>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
