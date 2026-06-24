# API Design

## API for: Test requirement for API

### Endpoints

#### Primary Endpoint
- **Method**: POST
- **Path**: /api/v1/process
- **Description**: Main processing endpoint for the requirement.

**Request Body:**
```json
{
  "input": "string",
  "options": {
    "mode": "default"
  }
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "completed",
  "result": {},
  "timestamp": "ISO8601"
}
```

**Response (400):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Description of the validation failure",
  "details": []
}
```

**Response (500):**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "traceId": "uuid"
}
```

### Status Endpoint
- **Method**: GET
- **Path**: /api/v1/status/:id
- **Description**: Check the status of a processing request.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "completed | processing | failed",
  "progress": 100,
  "result": {}
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input failed validation |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource state conflict |
| INTERNAL_ERROR | 500 | Unexpected server error |

### API Conventions
- All endpoints return JSON.
- Timestamps are in ISO 8601 format.
- IDs are UUID v4 strings.
- Pagination uses cursor-based approach where applicable.
