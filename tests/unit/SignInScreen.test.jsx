// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import SignInScreen from '../../src/components/SignInScreen.jsx'

afterEach(cleanup)

describe('SignInScreen', () => {
  it('renders the title, Google button, and the 45 AWS icons', () => {
    render(<SignInScreen />)
    expect(screen.getByText('System Design')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    const icons = document.querySelectorAll('img[src^="/icons/"]')
    expect(icons.length).toBe(45)
  })

  it('hides the card in loading mode (shows only the icon field)', () => {
    render(<SignInScreen loading />)
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
    expect(document.querySelectorAll('img[src^="/icons/"]').length).toBe(45)
  })

  it('offers a dev bypass that fires the callback', async () => {
    const onBypass = vi.fn()
    render(<SignInScreen devBypass={onBypass} />)
    const btn = screen.getByText(/Continue without signing in/i)
    await userEvent.setup().click(btn)
    expect(onBypass).toHaveBeenCalledOnce()
  })
})
