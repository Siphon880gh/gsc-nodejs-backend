import { describe, it, expect, vi, beforeEach } from "vitest";
import runBQ from "../src/datasources/bigquery.js";

// Mock the BigQuery client
vi.mock("@google-cloud/bigquery", () => ({
  BigQuery: vi.fn().mockImplementation(() => ({
    createQueryJob: vi.fn(),
  })),
}));

describe("BigQuery Data Source", () => {
  let mockClient;
  let mockCreateQueryJob;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateQueryJob = vi.fn();
    mockClient = {
      createQueryJob: mockCreateQueryJob,
    };
    
    // Mock the client constructor
    const { BigQuery } = await import("@google-cloud/bigquery");
    BigQuery.mockImplementation(() => mockClient);
  });

  it("should query BigQuery with basic parameters", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["event_count"],
      dimensions: ["event_name", "page_location"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        bigquery: {
          projectId: "test-project",
          dataset: "analytics_123456789",
          location: "US",
          tables: {
            ga4Events: "events_*",
          },
        },
      },
    };

    // Mock successful response
    const mockJob = {
      getQueryResults: vi.fn().mockResolvedValue([[
        {
          event_name: "page_view",
          page_location: "https://example.com/",
          event_count: 100,
        },
      ]]),
    };

    mockCreateQueryJob.mockResolvedValue([mockJob]);

    const result = await runBQ(query, config);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      event_name: "page_view",
      page_location: "https://example.com/",
      event_count: 100,
    });

    expect(mockCreateQueryJob).toHaveBeenCalledWith({
      query: expect.stringContaining("SELECT `event_name`, `page_location`, `event_count`"),
      params: {
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        limit: 100,
      },
    });
  });

  it("should handle BigQuery API errors", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["event_count"],
      dimensions: ["event_name"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        bigquery: {
          projectId: "test-project",
          dataset: "analytics_123456789",
          location: "US",
        },
      },
    };

    // Mock 403 error
    const error = new Error("Access denied");
    error.code = 403;
    mockCreateQueryJob.mockRejectedValue(error);

    await expect(runBQ(query, config)).rejects.toThrow(
      "BigQuery access denied. Check that your service account has access to project test-project"
    );
  });

  it("should handle missing project ID", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["event_count"],
      dimensions: ["event_name"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        bigquery: {
          projectId: "",
          dataset: "analytics_123456789",
          location: "US",
        },
      },
    };

    await expect(runBQ(query, config)).rejects.toThrow(
      "BigQuery project ID is required"
    );
  });

  it("should handle missing dataset", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["event_count"],
      dimensions: ["event_name"],
      limit: 100,
      orderBys: [],
      filters: [],
    };

    const config = {
      sources: {
        bigquery: {
          projectId: "test-project",
          dataset: "",
          location: "US",
        },
      },
    };

    await expect(runBQ(query, config)).rejects.toThrow(
      "BigQuery dataset is required"
    );
  });

  it("should build SQL with filters correctly", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["event_count"],
      dimensions: ["event_name"],
      limit: 100,
      orderBys: [],
      filters: [
        {
          type: "dimension",
          field: "event_name",
          op: "eq",
          value: "page_view",
        },
      ],
    };

    const config = {
      sources: {
        bigquery: {
          projectId: "test-project",
          dataset: "analytics_123456789",
          location: "US",
        },
      },
    };

    const mockJob = {
      getQueryResults: vi.fn().mockResolvedValue([[]]),
    };

    mockCreateQueryJob.mockResolvedValue([mockJob]);

    await runBQ(query, config);

    expect(mockCreateQueryJob).toHaveBeenCalledWith({
      query: expect.stringContaining("AND `event_name` = @p_event_name"),
      params: expect.objectContaining({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        limit: 100,
      }),
    });
  });

  it("should build SQL with order by correctly", async () => {
    const query = {
      dateRange: { start: "2024-01-01", end: "2024-01-31" },
      metrics: ["event_count"],
      dimensions: ["event_name"],
      limit: 100,
      orderBys: [
        { metric: "event_count", desc: true },
        { dimension: "event_name", desc: false },
      ],
      filters: [],
    };

    const config = {
      sources: {
        bigquery: {
          projectId: "test-project",
          dataset: "analytics_123456789",
          location: "US",
        },
      },
    };

    const mockJob = {
      getQueryResults: vi.fn().mockResolvedValue([[]]),
    };

    mockCreateQueryJob.mockResolvedValue([mockJob]);

    await runBQ(query, config);

    expect(mockCreateQueryJob).toHaveBeenCalledWith({
      query: expect.stringContaining("ORDER BY `event_count` DESC, `event_name` ASC"),
      params: expect.objectContaining({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        limit: 100,
      }),
    });
  });
});
