# GSC Node.js Backend API Documentation

This API provides all the functionality of the CLI as REST endpoints, with multi-user support through user IDs.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require a `userId` parameter to identify the user. This can be provided in:
- URL path: `/api/{userId}/endpoint`
- Query parameter: `?userId=your-user-id`
- Request body: `{"userId": "your-user-id"}`

## Endpoints

### Health Check
```http
GET /health
```
Returns server status and timestamp.

### User Status
```http
GET /api/{userId}/status
```
Returns the current user's authentication status, selected site, and other relevant information.

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "authenticated": true,
  "currentSite": "https://example.com/",
  "hasValidSite": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Authentication

#### Authenticate with Google
```http
POST /api/{userId}/auth
```
Initiates OAuth2 authentication flow for the user.

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "userId": "user123"
}
```

#### Sign Out
```http
POST /api/{userId}/signout
```
Clears all stored authentication and site data for the user.

**Response:**
```json
{
  "success": true,
  "message": "Sign out successful",
  "cleared": ["OAuth tokens", "selected site"]
}
```

### Site Management

#### List All Sites
```http
GET /api/{userId}/sites
```
Returns all Google Search Console sites the user has access to.

**Response:**
```json
{
  "success": true,
  "sites": [
    {
      "siteUrl": "https://example.com/",
      "permissionLevel": "siteOwner"
    }
  ],
  "currentSite": "https://example.com/",
  "total": 1
}
```

#### List Verified Sites Only
```http
GET /api/{userId}/sites/verified
```
Returns only verified sites (sites where user has full access).

#### Select Site
```http
POST /api/{userId}/sites/select
Content-Type: application/json

{
  "siteUrl": "https://example.com/"
}
```
Selects a site for queries.

**Response:**
```json
{
  "success": true,
  "message": "Selected site: https://example.com/",
  "selectedSite": "https://example.com/"
}
```

#### Get Current Site
```http
GET /api/{userId}/sites/current
```
Returns the currently selected site.

#### Clear Selected Site
```http
DELETE /api/{userId}/sites/current
```
Clears the currently selected site.

### Queries

#### Ad-hoc Query
```http
POST /api/{userId}/query/adhoc
Content-Type: application/json

{
  "metrics": ["clicks", "impressions", "ctr", "position"],
  "dimensions": ["query", "page"],
  "dateRangeType": "last7",
  "customStartDate": "2024-01-01",
  "customEndDate": "2024-01-07",
  "limit": 1000,
  "outputFormat": "json",
  "sorting": {
    "columns": [
      {"column": "clicks", "direction": "desc"}
    ]
  }
}
```

**Parameters:**
- `metrics` (array): Metrics to retrieve (default: ["clicks", "impressions", "ctr", "position"])
- `dimensions` (array): Dimensions to group by (default: ["query"])
- `dateRangeType` (string): "last7", "last28", "last90", or "custom"
- `customStartDate` (string): Start date in YYYY-MM-DD format (required if dateRangeType is "custom")
- `customEndDate` (string): End date in YYYY-MM-DD format (required if dateRangeType is "custom")
- `limit` (number): Maximum number of rows (default: 1000, max: 100000)
- `outputFormat` (string): "json", "csv", or "table" (default: "json")
- `sorting` (object): Optional sorting configuration

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "query": "example search",
      "page": "https://example.com/page",
      "clicks": 100,
      "impressions": 1000,
      "ctr": 0.1,
      "position": 5.5
    }
  ],
  "total": 1,
  "site": "https://example.com/",
  "query": {
    "metrics": ["clicks", "impressions", "ctr", "position"],
    "dimensions": ["query", "page"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-07"
    },
    "limit": 1000
  }
}
```

#### Preset Query
```http
POST /api/{userId}/query/preset
Content-Type: application/json

{
  "preset": "top_queries",
  "dateRangeType": "last28",
  "limit": 500,
  "outputFormat": "json"
}
```

**Parameters:**
- `preset` (string): Preset ID (required)
- `dateRangeType` (string): "last7", "last28", "last90", or "custom"
- `customStartDate` (string): Start date in YYYY-MM-DD format (required if dateRangeType is "custom")
- `customEndDate` (string): End date in YYYY-MM-DD format (required if dateRangeType is "custom")
- `limit` (number): Maximum number of rows (default: 1000, max: 100000)
- `outputFormat` (string): "json", "csv", or "table" (default: "json")

### Configuration

#### Get Available Presets
```http
GET /api/{userId}/presets
```
Returns all available preset queries.

**Response:**
```json
{
  "success": true,
  "presets": [
    {
      "id": "top_queries",
      "label": "Top Queries",
      "description": "Most popular search queries",
      "metrics": ["clicks", "impressions", "ctr", "position"],
      "dimensions": ["query"]
    }
  ]
}
```

#### Get Schema
```http
GET /api/{userId}/schema
```
Returns available metrics and dimensions for queries.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "clicks": "clicks",
    "impressions": "impressions",
    "ctr": "ctr",
    "position": "position"
  },
  "dimensions": {
    "query": "query",
    "page": "page",
    "country": "country",
    "device": "device"
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing parameters, invalid data)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (endpoint or resource not found)
- `500`: Internal Server Error

## Usage Examples

### Complete Workflow

1. **Check status:**
```bash
curl http://localhost:3000/api/user123/status
```

2. **Authenticate:**
```bash
curl -X POST http://localhost:3000/api/user123/auth
```

3. **List sites:**
```bash
curl http://localhost:3000/api/user123/sites
```

4. **Select a site:**
```bash
curl -X POST http://localhost:3000/api/user123/sites/select \
  -H "Content-Type: application/json" \
  -d '{"siteUrl": "https://example.com/"}'
```

5. **Run a query:**
```bash
curl -X POST http://localhost:3000/api/user123/query/adhoc \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["clicks", "impressions"],
    "dimensions": ["query"],
    "dateRangeType": "last7",
    "limit": 100
  }'
```

### CSV Export
To get data as CSV:
```bash
curl -X POST http://localhost:3000/api/user123/query/adhoc \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["clicks", "impressions"],
    "dimensions": ["query"],
    "dateRangeType": "last7",
    "outputFormat": "csv"
  }' > data.csv
```

## Multi-User Support

Each user has their own:
- Authentication tokens
- Selected site
- Query history (stored in database)

Users are identified by the `userId` parameter in all requests.

## Starting the API Server

```bash
# Install dependencies
npm install

# Start the API server
npm run api

# Start in development mode (with auto-restart)
npm run api:dev
```

The server will start on `http://localhost:3000` by default.
