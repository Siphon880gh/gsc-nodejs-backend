import { describe, it, expect, vi, beforeEach } from "vitest";
import { runQuery } from "../src/core/query-runner.js";

// Mock the data sources
vi.mock("../src/datasources/searchconsole.js", () => ({
  default: vi.fn(),
}));

vi.mock("../src/datasources/bigquery.js", () => ({
  default: vi.fn(),
}));

describe("Query Runner", () => {
  let mockRunGSC;
  let mockRunBQ;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import and mock the data sources
    const gscModule = await import("../src/datasources/searchconsole.js");
    const bqModule = await import("../src/datasources/bigquery.js");
    
    mockRunGSC = gscModule.default;
    mockRunBQ = bqModule.default;
  });

  it("should route GSC queries to GSC data source", async () => {
    const answers = {
      source: "searchconsole",
      mode: "preset",
      preset: "top-pages-gsc",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        searchconsole: { enabled: true },
      },
      presets: [
        {
          id: "top-pages-gsc",
          source: "searchconsole",
          metrics: ["clicks", "impressions"],
          dimensions: ["page"],
          orderBys: [{ metric: "clicks", desc: true }],
          limit: 50,
          filters: [],
        },
      ],
      limits: { maxRows: 100000 },
    };

    const mockResult = [
      { page: "/home", clicks: 100, impressions: 1000 },
      { page: "/about", clicks: 50, impressions: 500 },
    ];

    mockRunGSC.mockResolvedValue(mockResult);

    const result = await runQuery(answers, config);

    expect(result).toEqual(mockResult);
    expect(mockRunGSC).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "searchconsole",
        metrics: ["clicks", "impressions"],
        dimensions: ["page"],
        orderBys: [{ metric: "clicks", desc: true }],
        limit: 50,
        filters: [],
      }),
      config
    );
  });

  it("should route BigQuery queries to BigQuery data source", async () => {
    const answers = {
      source: "bigquery",
      mode: "preset",
      preset: "bq-gsc-sample",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        bigquery: { enabled: true },
      },
      presets: [
        {
          id: "bq-gsc-sample",
          source: "bigquery",
          metrics: ["clicks", "impressions"],
          dimensions: ["query", "page"],
          orderBys: [{ metric: "clicks", desc: true }],
          limit: 100,
          filters: [],
        },
      ],
      limits: { maxRows: 100000 },
    };

    const mockResult = [
      { query: "example search", page: "/home", clicks: 100, impressions: 1000 },
      { query: "another search", page: "/about", clicks: 50, impressions: 500 },
    ];

    mockRunBQ.mockResolvedValue(mockResult);

    const result = await runQuery(answers, config);

    expect(result).toEqual(mockResult);
    expect(mockRunBQ).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "bigquery",
        metrics: ["clicks", "impressions"],
        dimensions: ["query", "page"],
        orderBys: [{ metric: "clicks", desc: true }],
        limit: 100,
        filters: [],
      }),
      config
    );
  });

  it("should handle ad-hoc queries", async () => {
    const answers = {
      source: "searchconsole",
      mode: "adhoc",
      metrics: ["clicks", "impressions"],
      dimensions: ["date", "page"],
      dateRangeType: "last7",
      limit: 1000,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        searchconsole: { enabled: true },
      },
      limits: { maxRows: 100000 },
    };

    const mockResult = [
      { date: "2024-01-01", page: "/home", clicks: 100, impressions: 1000 },
    ];

    mockRunGSC.mockResolvedValue(mockResult);

    const result = await runQuery(answers, config);

    expect(result).toEqual(mockResult);
    expect(mockRunGSC).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "searchconsole",
        metrics: ["clicks", "impressions"],
        dimensions: ["date", "page"],
        limit: 1000,
      }),
      config
    );
  });

  it("should apply limit caps from config", async () => {
    const answers = {
      source: "searchconsole",
      mode: "adhoc",
      metrics: ["clicks"],
      dimensions: ["date"],
      dateRangeType: "last7",
      limit: 200000, // Exceeds maxRows
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        searchconsole: { enabled: true },
      },
      limits: { maxRows: 100000 },
    };

    const mockResult = [];
    mockRunGSC.mockResolvedValue(mockResult);

    await runQuery(answers, config);

    expect(mockRunGSC).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100000, // Should be capped
      }),
      config
    );
  });

  it("should throw error for unsupported source", async () => {
    const answers = {
      source: "unsupported",
      mode: "preset",
      preset: "test",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        searchconsole: { enabled: true },
      },
      presets: [
        {
          id: "test",
          source: "unsupported",
          metrics: ["clicks"],
          dimensions: ["date"],
          orderBys: [],
          limit: 100,
          filters: [],
        },
      ],
      limits: { maxRows: 100000 },
    };

    await expect(runQuery(answers, config)).rejects.toThrow(
      "Unsupported source: unsupported"
    );
  });

  it("should throw error for missing preset", async () => {
    const answers = {
      source: "searchconsole",
      mode: "preset",
      preset: "missing-preset",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        searchconsole: { enabled: true },
      },
      presets: [],
      limits: { maxRows: 100000 },
    };

    await expect(runQuery(answers, config)).rejects.toThrow(
      "Preset not found: missing-preset"
    );
  });

  it("should validate query parameters", async () => {
    const answers = {
      source: "searchconsole",
      mode: "adhoc",
      metrics: [], // Empty metrics should fail
      dimensions: ["date"],
      dateRangeType: "last7",
      limit: 1000,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        searchconsole: { enabled: true },
      },
      limits: { maxRows: 100000 },
    };

    await expect(runQuery(answers, config)).rejects.toThrow(
      "Query validation failed"
    );
  });
});
