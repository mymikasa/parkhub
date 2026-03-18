import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getParkingLots,
  getParkingLot,
  createParkingLot,
  updateParkingLot,
  getParkingLotStats,
  getGates,
  createGate,
  updateGate,
  deleteGate,
} from './api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  })
}

describe('getParkingLots', () => {
  it('maps PascalCase response to snake_case', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: {
        Items: [
          {
            ID: 'lot-1',
            Name: '阳光停车场',
            Address: '北京市朝阳区',
            TotalSpaces: 200,
            AvailableSpaces: 150,
            LotType: 'underground',
            Status: 'active',
            EntryCount: 2,
            ExitCount: 1,
            UsageRate: 25,
            CreatedAt: '2026-01-01T00:00:00Z',
            UpdatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        Total: 1,
        Page: 1,
        PageSize: 20,
      },
    })

    const result = await getParkingLots({}, 'test-token')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('lot-1')
    expect(result.items[0].name).toBe('阳光停车场')
    expect(result.items[0].total_spaces).toBe(200)
    expect(result.items[0].available_spaces).toBe(150)
    expect(result.items[0].lot_type).toBe('underground')
    expect(result.items[0].status).toBe('active')
    expect(result.items[0].entry_count).toBe(2)
    expect(result.items[0].exit_count).toBe(1)
    expect(result.items[0].usage_rate).toBe(25)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
  })

  it('maps snake_case response correctly', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: {
        items: [
          {
            id: 'lot-2',
            name: '星光停车场',
            address: '上海市',
            total_spaces: 100,
            available_spaces: 80,
            lot_type: 'ground',
            status: 'inactive',
            entry_count: 1,
            exit_count: 1,
            usage_rate: 20,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      },
    })

    const result = await getParkingLots({}, 'test-token')

    expect(result.items[0].id).toBe('lot-2')
    expect(result.items[0].status).toBe('inactive')
  })

  it('sends auth header', async () => {
    mockJsonResponse({ code: 0, message: 'success', data: { items: [], total: 0, page: 1, page_size: 20 } })

    await getParkingLots({}, 'my-token')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/parking-lots'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    )
  })

  it('builds query string from filter', async () => {
    mockJsonResponse({ code: 0, message: 'success', data: { items: [], total: 0, page: 1, page_size: 20 } })

    await getParkingLots({ status: 'active', search: '阳光', tenant_id: 'tenant-1', page: 2, page_size: 10 }, 'token')

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('status=active')
    expect(url).toContain('search=')
    expect(url).toContain('tenant_id=tenant-1')
    expect(url).toContain('page=2')
    expect(url).toContain('page_size=10')
  })

  it('omits status=all from query', async () => {
    mockJsonResponse({ code: 0, message: 'success', data: { items: [], total: 0, page: 1, page_size: 20 } })

    await getParkingLots({ status: 'all' }, 'token')

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).not.toContain('status=')
  })

  it('handles empty items', async () => {
    mockJsonResponse({ code: 0, message: 'success', data: { items: [], total: 0, page: 1, page_size: 20 } })

    const result = await getParkingLots({}, 'token')

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe('getParkingLot', () => {
  it('returns mapped parking lot', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: {
        id: 'lot-1',
        name: '测试车场',
        address: '地址',
        total_spaces: 50,
        available_spaces: 30,
        lot_type: 'stereo',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })

    const result = await getParkingLot('lot-1', 'token')

    expect(result.id).toBe('lot-1')
    expect(result.lot_type).toBe('stereo')
  })
})

describe('createParkingLot', () => {
  it('sends POST with correct body', async () => {
    mockJsonResponse({
      code: 0,
      message: '创建成功',
      data: { id: 'new-lot', name: '新车场', address: '新地址', total_spaces: 100, available_spaces: 100, lot_type: 'underground', status: 'active', created_at: '', updated_at: '' },
    })

    const result = await createParkingLot(
      { name: '新车场', address: '新地址', total_spaces: 100, lot_type: 'underground' },
      'token'
    )

    expect(result.id).toBe('new-lot')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.name).toBe('新车场')
    expect(body.total_spaces).toBe(100)
  })
})

describe('updateParkingLot', () => {
  it('sends PUT with correct body', async () => {
    mockJsonResponse({
      code: 0,
      message: '修改成功',
      data: { id: 'lot-1', name: '改名', address: '新地址', total_spaces: 200, available_spaces: 200, lot_type: 'ground', status: 'inactive', created_at: '', updated_at: '' },
    })

    const result = await updateParkingLot(
      'lot-1',
      { name: '改名', address: '新地址', total_spaces: 200, lot_type: 'ground', status: 'inactive' },
      'token'
    )

    expect(result.name).toBe('改名')
    expect(result.status).toBe('inactive')
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
    expect(mockFetch.mock.calls[0][0]).toContain('/parking-lots/lot-1')
  })
})

describe('getParkingLotStats', () => {
  it('maps PascalCase stats', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: { TotalSpaces: 500, AvailableSpaces: 300, OccupiedVehicles: 200, TotalGates: 8 },
    })

    const result = await getParkingLotStats('token')

    expect(result.total_spaces).toBe(500)
    expect(result.available_spaces).toBe(300)
    expect(result.occupied_vehicles).toBe(200)
    expect(result.total_gates).toBe(8)
  })

  it('maps snake_case stats', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: { total_spaces: 100, available_spaces: 50, occupied_vehicles: 50, total_gates: 4 },
    })

    const result = await getParkingLotStats('token')

    expect(result.total_spaces).toBe(100)
    expect(result.occupied_vehicles).toBe(50)
  })
})

describe('Gate APIs', () => {
  it('getGates maps response with device info', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: [
        {
          id: 'gate-1',
          parking_lot_id: 'lot-1',
          name: '东入口',
          type: 'entry',
          device_id: 'dev-1',
          bound_device_count: 2,
          offline_device_count: 1,
          device: {
            id: 'dev-1',
            serial_number: 'SN001',
            status: 'online',
            last_heartbeat: '2026-01-01T00:00:00Z',
          },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'gate-2',
          parking_lot_id: 'lot-1',
          name: '西出口',
          type: 'exit',
          device_id: null,
          device: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const result = await getGates('lot-1', 'token')

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('东入口')
    expect(result[0].type).toBe('entry')
    expect(result[0].device).not.toBeNull()
    expect(result[0].device!.serial_number).toBe('SN001')
    expect(result[0].device!.status).toBe('online')
    expect(result[0].bound_device_count).toBe(2)
    expect(result[0].offline_device_count).toBe(1)
    expect(result[1].device).toBeNull()
  })

  it('getGates maps PascalCase gate response', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: [
        {
          ID: 'gate-1',
          ParkingLotID: 'lot-1',
          Name: '南入口',
          Type: 'entry',
          DeviceID: null,
          Device: null,
          CreatedAt: '2026-01-01T00:00:00Z',
          UpdatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const result = await getGates('lot-1', 'token')

    expect(result[0].id).toBe('gate-1')
    expect(result[0].name).toBe('南入口')
    expect(result[0].parking_lot_id).toBe('lot-1')
  })

  it('createGate sends POST', async () => {
    mockJsonResponse({
      code: 0,
      message: '添加成功',
      data: { id: 'gate-new', parking_lot_id: 'lot-1', name: '北入口', type: 'entry', device_id: null, created_at: '', updated_at: '' },
    })

    const result = await createGate('lot-1', { name: '北入口', type: 'entry' }, 'token')

    expect(result.id).toBe('gate-new')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(mockFetch.mock.calls[0][0]).toContain('/parking-lots/lot-1/gates')
  })

  it('updateGate sends PUT', async () => {
    mockJsonResponse({
      code: 0,
      message: '修改成功',
      data: { id: 'gate-1', parking_lot_id: 'lot-1', name: '改名入口', type: 'entry', device_id: null, created_at: '', updated_at: '' },
    })

    const result = await updateGate('gate-1', { name: '改名入口' }, 'token')

    expect(result.name).toBe('改名入口')
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
    expect(mockFetch.mock.calls[0][0]).toContain('/gates/gate-1')
  })

  it('deleteGate sends DELETE', async () => {
    mockJsonResponse({ code: 0, message: '删除成功' })

    await deleteGate('gate-1', 'token')

    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
    expect(mockFetch.mock.calls[0][0]).toContain('/gates/gate-1')
  })
})

describe('error handling', () => {
  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ code: 'PARKING_LOT_NAME_EXISTS', message: '该车场名称已存在' }),
    })

    await expect(
      createParkingLot({ name: '重复', address: '地址地址地址', total_spaces: 10 }, 'token')
    ).rejects.toThrow('该车场名称已存在')
  })

  it('throws with default message on parse error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json') },
    })

    await expect(getParkingLots({}, 'token')).rejects.toThrow('请求失败，请重试')
  })
})
