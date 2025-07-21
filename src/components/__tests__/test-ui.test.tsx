import { render, screen } from '@testing-library/react'
import { TestUI } from '../test-ui'

describe('TestUI', () => {
  it('renders shadcn/ui test components', () => {
    render(<TestUI />)
    
    expect(screen.getByText('shadcn/ui Test')).toBeInTheDocument()
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Testing shadcn/ui components integration')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Test input field')).toBeInTheDocument()
    expect(screen.getByText('Primary Button')).toBeInTheDocument()
    expect(screen.getByText('Outline Button')).toBeInTheDocument()
  })
})
