import { describe, it, expect } from 'vitest'
import { hello } from '../index.js'

describe('hello', () => {
  it('returns handshake', () => {
    const res = hello({})
    expect(res.protocol).toBe('0.3')
    expect(res.actions).toEqual({})
  })
})
