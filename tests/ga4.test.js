import { describe, it, expect, vi, beforeEach } from "vitest";
import runGA4 from "../src/datasources/ga4.js";

// Mock the GA4 client
vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: vi.fn().mockImplementation(() => ({
    runReport: vi.fn(),
  })),
}));

describe("GA4 Data Source", () => {
  let mockClient;
  let mockRunReport;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRunReport = vi.fn();
    mockClient = {
      runReport: mockRunReport,
    };
    
    // Mock the client constructor
    const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
    BetaAnalyticsDataClient.mockImplementation(() => mockClient);
  });

  it("should query GA4 with basic parameters", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["sessions", "totalUsers"],
      dimensions: ["date", "pagePath"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        ga4: {
          propertyId: "123456789",
          credentialsFile: "./secrets/ga4-sa.json",
        },
      },
    };

    // Mock successful response
    mockRunReport.mockResolvedValue([{
      dimensionHeaders: [
        { name: "date" },
        { name: "pagePath" },
      ],
      metricHeaders: [
        { name: "sessions" },
        { name: "totalUsers" },
      ],
      rows: [
        {
          dimensionValues: [
            { value: "2024-01-01" },
            { value: "/home" },
          ],
          metricValues: [
            { value: "100" },
            { value: "50" },
          ],
        },
      ],
    }]);

    const result = await runGA4(query, config);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2024-01-01",
      pagePath: "/home",
      sessions: 100,
      totalUsers: 50,
    });

    expect(mockRunReport).toHaveBeenCalledWith({
      property: "properties/123456789",
      dateRanges: [{
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
      ],
      dimensions: [
        { name: "date" },
        { name: "pagePath" },
      ],
      limit: 100,
      orderBys: [],
    });
  });

  it("should handle GA4 API errors", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["sessions"],
      dimensions: ["date"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        ga4: {
          propertyId: "123456789",
          credentialsFile: "./secrets/ga4-sa.json",
        },
      },
    };

    // Mock 403 error
    const error = new Error("Access denied");
    error.code = 403;
    mockRunReport.mockRejectedValue(error);

    await expect(runGA4(query, config)).rejects.toThrow(
      "GA4 access denied. Check that your service account has access to property 123456789"
    );
  });

  it("should handle missing property ID", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["sessions"],
      dimensions: ["date"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        ga4: {
          propertyId: "",
          credentialsFile: "./secrets/ga4-sa.json",
        },
      },
    };

    await expect(runGA4(query, config)).rejects.toThrow(
      "GA4 property ID is required"
    );
  });

  it("should build dimension filters correctly", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["sessions"],
      dimensions: ["pagePath"],
      limit: 100,
      orderBys: [],
      filters: [
        {
          type: "dimension",
          field: "pagePath",
          op: "contains",
          value: "/blog",
        },
      ],
    };

    const config = {
      sources: {
        ga4: {
          propertyId: "123456789",
          credentialsFile: "./secrets/ga4-sa.json",
        },
      },
    };

    mockRunReport.mockResolvedValue([{
      dimensionHeaders: [{ name: "pagePath" }],
      metricHeaders: [{ name: "sessions" }],
      rows: [],
    }]);

    await runGA4(query, config);

    expect(mockRunReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                dimensionName: "pagePath",
                stringFilter: {
                  matchType: "CONTAINS",
                  value: "/blog",
                },
              },
            ],
          },
        },
      })
    );
  });
});
