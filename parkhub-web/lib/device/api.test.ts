import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bindDevice,
  createDevice,
  getDevice,
  getDevices,
  getDeviceStats,
  unbindDevice,
  updateDeviceName,
} from './api'

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

describe('getDevices', () => {
  it('maps list payload and query string', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: {
        Items: [
          {
            ID: 'device-1',
            TenantID: 'tenant-1',
            Name: 'A区入口',
            Status: 'active',
            FirmwareVersion: 'v1.0.0',
            ParkingLotID: 'lot-1',
            ParkingLotName: '阳光停车场',
            GateID: 'gate-1',
            GateName: '东入口',
            CreatedAt: '2026-01-01T00:00:00Z',
            UpdatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        Total: 1,
        Page: 2,
        PageSize: 10,
      },
    })

    const result = await getDevices({ status: 'active', keyword: 'A区', page: 2, page_size: 10 }, 'token')

    expect(result.items[0].id).toBe('device-1')
    expect(result.items[0].parking_lot_name).toBe('阳光停车场')
    expect(result.page).toBe(2)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('status=active')
    expect(url).toContain('keyword=')
    expect(url).toContain('page=2')
    expect(url).toContain('page_size=10')
  })
})

describe('getDeviceStats', () => {
  it('maps stats response', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: {
        Total: 10,
        Active: 5,
        Offline: 2,
        Pending: 2,
        Disabled: 1,
      },
    })

    const result = await getDeviceStats('token')

    expect(result.total).toBe(10)
    expect(result.active).toBe(5)
    expect(result.pending).toBe(2)
  })
})

describe('device mutations', () => {
  it('createDevice sends POST body', async () => {
    mockJsonResponse({
      code: 0,
      message: '创建成功',
      data: {
        id: 'device-1',
        tenant_id: 'tenant-1',
        name: '设备A',
        status: 'pending',
        firmware_version: '',
        parking_lot_id: null,
        gate_id: null,
        created_at: '',
        updated_at: '',
      },
    })

    const result = await createDevice({ id: 'device-1', name: '设备A' }, 'token')

    expect(result.id).toBe('device-1')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ id: 'device-1', name: '设备A' })
  })

  it('getDevice maps detail', async () => {
    mockJsonResponse({
      code: 0,
      message: 'success',
      data: {
        id: 'device-1',
        tenant_id: 'tenant-1',
        name: '设备A',
        status: 'active',
        firmware_version: 'v1.0.0',
        parking_lot_id: 'lot-1',
        gate_id: 'gate-1',
        created_at: '',
        updated_at: '',
      },
    })

    const result = await getDevice('device-1', 'token')

    expect(result.status).toBe('active')
    expect(result.gate_id).toBe('gate-1')
  })

  it('updateDeviceName sends PUT body', async () => {
    mockJsonResponse({
      code: 0,
      message: '修改成功',
      data: {
        id: 'device-1',
        tenant_id: 'tenant-1',
        name: '新设备名',
        status: 'active',
        firmware_version: '',
        parking_lot_id: 'lot-1',
        gate_id: 'gate-1',
        created_at: '',
        updated_at: '',
      },
    })

    const result = await updateDeviceName('device-1', { name: '新设备名' }, 'token')

    expect(result.name).toBe('新设备名')
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
  })

  it('bindDevice sends POST body to bind endpoint', async () => {
    mockJsonResponse({
      code: 0,
      message: '绑定成功',
      data: {
        id: 'device-1',
        tenant_id: 'tenant-1',
        name: '设备A',
        status: 'active',
        firmware_version: '',
        parking_lot_id: 'lot-1',
        gate_id: 'gate-1',
        created_at: '',
        updated_at: '',
      },
    })

    const result = await bindDevice(
      'device-1',
      { tenant_id: 'tenant-1', parking_lot_id: 'lot-1', gate_id: 'gate-1' },
      'token'
    )

    expect(result.status).toBe('active')
    expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/devices/device-1/bind')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
  })

  it('unbindDevice sends POST to unbind endpoint', async () => {
    mockJsonResponse({
      code: 0,
      message: '解绑成功',
      data: {
        id: 'device-1',
        tenant_id: 'tenant-platform',
        name: '设备A',
        status: 'pending',
        firmware_version: '',
        parking_lot_id: null,
        gate_id: null,
        created_at: '',
        updated_at: '',
      },
    })

    const result = await unbindDevice('device-1', 'token')

    expect(result.status).toBe('pending')
    expect(result.parking_lot_id).toBeNull()
    expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/devices/device-1/unbind')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
  })
})
