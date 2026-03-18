import { describe, it, expect } from 'vitest'
import { parkingLotKeys } from './hooks'

describe('parkingLotKeys', () => {
  it('all returns base key', () => {
    expect(parkingLotKeys.all).toEqual(['parking-lots'])
  })

  it('lists returns list key', () => {
    expect(parkingLotKeys.lists()).toEqual(['parking-lots', 'list'])
  })

  it('list includes filter in key', () => {
    const filter = { status: 'active' as const, search: '阳光' }
    const key = parkingLotKeys.list(filter)
    expect(key).toEqual(['parking-lots', 'list', filter])
  })

  it('different filters produce different keys', () => {
    const key1 = parkingLotKeys.list({ status: 'active' })
    const key2 = parkingLotKeys.list({ status: 'inactive' })
    expect(key1).not.toEqual(key2)
  })

  it('details returns detail key prefix', () => {
    expect(parkingLotKeys.details()).toEqual(['parking-lots', 'detail'])
  })

  it('detail includes id in key', () => {
    expect(parkingLotKeys.detail('lot-1')).toEqual(['parking-lots', 'detail', 'lot-1'])
  })

  it('stats returns stats key', () => {
    expect(parkingLotKeys.stats()).toEqual(['parking-lots', 'stats'])
  })

  it('gates includes parkingLotId in key', () => {
    expect(parkingLotKeys.gates('lot-1')).toEqual(['parking-lots', 'gates', 'lot-1'])
  })

  it('all keys share common prefix for invalidation', () => {
    const prefix = parkingLotKeys.all
    expect(parkingLotKeys.lists()[0]).toBe(prefix[0])
    expect(parkingLotKeys.stats()[0]).toBe(prefix[0])
    expect(parkingLotKeys.gates('x')[0]).toBe(prefix[0])
    expect(parkingLotKeys.detail('x')[0]).toBe(prefix[0])
  })
})
