import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportTransitRecords,
  getTransitExceptionSummary,
  getTransitRecords,
  resolveTransitRecord,
} from "./api";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

describe("getTransitRecords", () => {
  it("maps PascalCase response and sends filters", async () => {
    mockJsonResponse({
      code: 0,
      message: "success",
      data: {
        Items: [
          {
            ID: "rec-1",
            TenantID: "tenant-1",
            ParkingLotID: "lot-1",
            ParkingLotName: "测试车场",
            GateID: "gate-1",
            GateName: "1号入口",
            PlateNumber: "沪A12345",
            Type: "entry",
            Status: "normal",
            CreatedAt: "2026-03-13T12:00:00Z",
            UpdatedAt: "2026-03-13T12:00:00Z",
          },
        ],
        Total: 1,
        Page: 2,
        PageSize: 8,
      },
    });

    const result = await getTransitRecords(
      { page: 2, page_size: 8, status_group: "exception", plate_number: "沪A" },
      "token"
    );

    expect(result.items[0].id).toBe("rec-1");
    expect(result.items[0].parking_lot_name).toBe("测试车场");
    expect(result.total).toBe(1);
    expect(result.page).toBe(2);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("status_group=exception");
    expect(url).toContain("plate_number=");
  });
});

describe("getTransitExceptionSummary", () => {
  it("aggregates three exception status totals", async () => {
    mockJsonResponse({ code: 0, message: "success", data: { items: [], total: 3, page: 1, page_size: 1 } });
    mockJsonResponse({ code: 0, message: "success", data: { items: [], total: 2, page: 1, page_size: 1 } });
    mockJsonResponse({ code: 0, message: "success", data: { items: [], total: 1, page: 1, page_size: 1 } });

    const result = await getTransitExceptionSummary({ parking_lot_id: "lot-1" }, "token");

    expect(result.no_exit).toBe(3);
    expect(result.no_entry).toBe(2);
    expect(result.recognition_failed).toBe(1);
    expect(result.total).toBe(6);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe("resolveTransitRecord", () => {
  it("sends PUT payload", async () => {
    mockJsonResponse({
      code: 0,
      message: "异常已处理",
      data: {
        id: "rec-2",
        tenant_id: "tenant-1",
        parking_lot_id: "lot-1",
        parking_lot_name: "测试车场",
        gate_id: "gate-1",
        gate_name: "1号出口",
        plate_number: "沪B66666",
        type: "exit",
        status: "paid",
        created_at: "2026-03-13T13:00:00Z",
        updated_at: "2026-03-13T13:00:00Z",
      },
    });

    await resolveTransitRecord(
      "rec-2",
      { plate_number: "沪B66666", remark: "人工确认" },
      "token"
    );

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("PUT");
    expect(options.body).toContain("沪B66666");
  });
});

describe("exportTransitRecords", () => {
  it("requests export endpoint and parses filename", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["a,b"]),
      headers: {
        get: (key: string) =>
          key.toLowerCase() === "content-disposition"
            ? 'attachment; filename="transit-records-20260313.csv"'
            : null,
      },
    });

    const result = await exportTransitRecords({ status_group: "exception" }, "csv", "token");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/transit-records/export");
    expect(url).toContain("status_group=exception");
    expect(url).toContain("format=csv");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer token");
    expect(result.filename).toBe("transit-records-20260313.csv");
  });
});
