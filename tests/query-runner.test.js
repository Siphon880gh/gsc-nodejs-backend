import { describe, it, expect, vi, beforeEach } from "vitest";
import { runQuery } from "../src/core/query-runner.js";

// Mock the data sources
vi.mock("../src/datasources/ga4.js", () => ({
  default: vi.fn(),
}));

vi.mock("../src/datasources/bigquery.js", () => ({
  default: vi.fn(),
}));

describe("Query Runner", () => {
  let mockRunGA4;
  let mockRunBQ;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import and mock the data sources
    const ga4Module = await import("../src/datasources/ga4.js");
    const bqModule = await import("../src/datasources/bigquery.js");
    
    mockRunGA4 = ga4Module.default;
    mockRunBQ = bqModule.default;
  });

  it("should route GA4 queries to GA4 data source", async () => {
    const answers = {
      source: "ga4",
      mode: "preset",
      preset: "top-pages",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        ga4: { enabled: true },
      },
      presets: [
        {
          id: "top-pages",
          source: "ga4",
          metrics: ["totalUsers"],
          dimensions: ["pagePath"],
          orderBys: [{ metric: "totalUsers", desc: true }],
          limit: 50,
          filters: [],
        },
      ],
      limits: { maxRows: 100000 },
    };

    const mockResult = [
      { pagePath: "/home", totalUsers: 100 },
      { pagePath: "/about", totalUsers: 50 },
    ];

    mockRunGA4.mockResolvedValue(mockResult);

    const result = await runQuery(answers, config);

    expect(result).toEqual(mockResult);
    expect(mockRunGA4).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "ga4",
        metrics: ["totalUsers"],
        dimensions: ["pagePath"],
        orderBys: [{ metric: "totalUsers", desc: true }],
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
      preset: "bq-events-sample",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        bigquery: { enabled: true },
      },
      presets: [
        {
          id: "bq-events-sample",
          source: "bigquery",
          metrics: ["event_count"],
          dimensions: ["event_name"],
          orderBys: [{ metric: "event_count", desc: true }],
          limit: 100,
          filters: [],
        },
      ],
      limits: { maxRows: 100000 },
    };

    const mockResult = [
      { event_name: "page_view", event_count: 1000 },
      { event_name: "click", event_count: 500 },
    ];

    mockRunBQ.mockResolvedValue(mockResult);

    const result = await runQuery(answers, config);

    expect(result).toEqual(mockResult);
    expect(mockRunBQ).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "bigquery",
        metrics: ["event_count"],
        dimensions: ["event_name"],
        orderBys: [{ metric: "event_count", desc: true }],
        limit: 100,
        filters: [],
      }),
      config
    );
  });

  it("should handle ad-hoc queries", async () => {
    const answers = {
      source: "ga4",
      mode: "adhoc",
      metrics: ["sessions", "totalUsers"],
      dimensions: ["date", "pagePath"],
      dateRangeType: "last7",
      limit: 1000,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        ga4: { enabled: true },
      },
      limits: { maxRows: 100000 },
    };

    const mockResult = [
      { date: "2024-01-01", pagePath: "/home", sessions: 100, totalUsers: 50 },
    ];

    mockRunGA4.mockResolvedValue(mockResult);

    const result = await runQuery(answers, config);

    expect(result).toEqual(mockResult);
    expect(mockRunGA4).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "ga4",
        metrics: ["sessions", "totalUsers"],
        dimensions: ["date", "pagePath"],
        limit: 1000,
      }),
      config
    );
  });

  it("should apply limit caps from config", async () => {
    const answers = {
      source: "ga4",
      mode: "adhoc",
      metrics: ["sessions"],
      dimensions: ["date"],
      dateRangeType: "last7",
      limit: 200000, // Exceeds maxRows
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        ga4: { enabled: true },
      },
      limits: { maxRows: 100000 },
    };

    const mockResult = [];
    mockRunGA4.mockResolvedValue(mockResult);

    await runQuery(answers, config);

    expect(mockRunGA4).toHaveBeenCalledWith(
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
        ga4: { enabled: true },
      },
      presets: [
        {
          id: "test",
          source: "unsupported",
          metrics: ["sessions"],
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
      source: "ga4",
      mode: "preset",
      preset: "missing-preset",
      dateRangeType: "last7",
    };

    const config = {
      sources: {
        ga4: { enabled: true },
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
      source: "ga4",
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
        ga4: { enabled: true },
      },
      limits: { maxRows: 100000 },
    };

    await expect(runQuery(answers, config)).rejects.toThrow(
      "Query validation failed"
    );
  });
});
