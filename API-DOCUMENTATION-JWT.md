# GSC Node.js Backend API Documentation (JWT Authentication)

This API provides all the functionality of the CLI as REST endpoints with JWT-based authentication for secure multi-user support.

## Base URL
```
http://localhost:3000
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Users authenticate once and receive a token that must be included in subsequent requests.

### Authentication Flow

1. **Login**: `POST /api/auth/login` - Authenticate with Google and receive JWT token
2. **Use Token**: Include `Authorization: Bearer <token>` header in all subsequent requests
3. **Logout**: `POST /api/auth/logout` - Invalidate token and clear user data

## Endpoints

### Health Check
```http
GET /health
```
Returns server status and timestamp.

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "userId": "your-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "your-user-id",
  "expiresIn": "24h"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "cleared": ["OAuth tokens", "selected site"]
}
```

### User Status
```http
GET /api/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "userId": "your-user-id",
  "authenticated": true,
  "currentSite": "https://example.com/",
  "hasValidSite": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Site Management

#### List All Sites
```http
GET /api/sites
Authorization: Bearer <token>
```

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
GET /api/sites/verified
Authorization: Bearer <token>
```

#### Select Site
```http
POST /api/sites/select
Authorization: Bearer <token>
Content-Type: application/json

{
  "siteUrl": "https://example.com/"
}
```

#### Get Current Site
```http
GET /api/sites/current
Authorization: Bearer <token>
```

#### Clear Selected Site
```http
DELETE /api/sites/current
Authorization: Bearer <token>
```

### Queries

#### Ad-hoc Query
```http
POST /api/query/adhoc
Authorization: Bearer <token>
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

#### Preset Query
```http
POST /api/query/preset
Authorization: Bearer <token>
Content-Type: application/json

{
  "preset": "top-queries",
  "dateRangeType": "last28",
  "limit": 500,
  "outputFormat": "json"
}
```

### Configuration

#### Get Available Presets
```http
GET /api/presets
Authorization: Bearer <token>
```

#### Get Schema
```http
GET /api/schema
Authorization: Bearer <token>
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
- `403`: Forbidden (invalid or expired token)
- `404`: Not Found (endpoint or resource not found)
- `500`: Internal Server Error

## Usage Examples

### Complete Workflow

1. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

2. **Use the token for subsequent requests:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Check status
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/status

# List sites
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/sites

# Run a query
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["clicks", "impressions"],
    "dimensions": ["query"],
    "dateRangeType": "last7",
    "limit": 100
  }' http://localhost:3000/api/query/adhoc

# Logout
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/logout
```

### CSV Export
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["clicks", "impressions"],
    "dimensions": ["query"],
    "dateRangeType": "last7",
    "outputFormat": "csv"
  }' http://localhost:3000/api/query/adhoc > data.csv
```

## Security Features

### JWT Token Security
- Tokens are signed with a secret key
- Tokens expire after 24 hours by default
- Session data is stored securely in SQLite database
- Tokens are hashed before storage (not stored in plain text)

### User Isolation
- Each user has separate authentication tokens
- Each user has separate site selections
- User data is isolated in the database
- Sessions are tracked and can be revoked

### Session Management
- Automatic cleanup of expired sessions
- Session revocation on logout
- Token validation on every request

## Starting the JWT API Server

```bash
# Install dependencies
npm install

# Start the JWT API server
npm run api:jwt

# Start in development mode (with auto-restart)
npm run api:jwt:dev
```

## Testing

Run the comprehensive test suite:
```bash
node test-api-jwt.js
```

This will test all endpoints including authentication, site management, queries, and security features.

## Environment Variables

Set these environment variables for production:

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
PORT=3000
```

## Database Schema

The JWT authentication system uses the following database tables:

- `user_sessions`: Stores JWT session information
- `oauth_tokens`: Stores OAuth2 tokens for each user
- `selected_sites`: Stores selected sites for each user

All tables are automatically created when needed.
