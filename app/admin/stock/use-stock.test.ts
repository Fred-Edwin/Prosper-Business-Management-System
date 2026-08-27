import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StockRequestError,
  stockApi,
  previousBusinessDate,
} from "./use-stock";

// The fetch layer is the only thing worth unit-testing here (the React hooks
// need a DOM and are covered by the pnpm dev smoke). `request<T>` unwraps
// `{ data }` and throws a typed StockRequestError on `{ error }` / non-2xx.

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("stockApi request<T>", () => {
  it("unwraps { data } on a 2xx", async () => {
    mockFetchOnce(200, { data: [{ id: "m1", quantity: "5.0000" }] });
    const rows = await stockApi.listMovements({ date: "2026-08-24" });
    expect(rows).toEqual([{ id: "m1", quantity: "5.0000" }]);
  });

  it("throws a typed StockRequestError on { error }", async () => {
    mockFetchOnce(403, {
      error: { code: "FORBIDDEN", message: "closed day", field: undefined },
    });
    await expect(
      stockApi.correct({ movementId: "m1", correctedQuantity: "3" }),
    ).rejects.toMatchObject({
      name: "StockRequestError",
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("throws StockRequestError on a non-2xx with no error body", async () => {
    mockFetchOnce(500, null);
    await expect(stockApi.outstanding()).rejects.toBeInstanceOf(
      StockRequestError,
    );
  });

  it("correct() sends correctedQuantity and never a delta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: "delta-row" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await stockApi.correct({
      movementId: "m1",
      correctedQuantity: "18.5",
      note: "  kitchen re-issue  ",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/stock-movements/m1/correct");
    const sent = JSON.parse(init.body);
    expect(sent).toEqual({ correctedQuantity: "18.5", note: "kitchen re-issue" });
    expect(sent).not.toHaveProperty("delta");
  });

  it("setOpeningStock() posts a discriminated opening body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: "opening-row" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await stockApi.setOpeningStock({
      productId: "p1",
      locationId: "loc-store",
      businessDate: "2026-08-24",
      quantity: "25.0",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/stock-movements");
    expect(JSON.parse(init.body)).toEqual({
      movementType: "opening",
      productId: "p1",
      locationId: "loc-store",
      businessDate: "2026-08-24",
      quantity: "25.0",
    });
  });

  it("balances() short-circuits an empty product list without a fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(stockApi.balances([], "loc-store")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("previousBusinessDate", () => {
  it("steps back one calendar day", () => {
    expect(previousBusinessDate("2026-08-24")).toBe("2026-08-23");
  });
  it("crosses a month boundary", () => {
    expect(previousBusinessDate("2026-09-01")).toBe("2026-08-31");
  });
  it("crosses a year boundary", () => {
    expect(previousBusinessDate("2026-01-01")).toBe("2025-12-31");
  });
});
