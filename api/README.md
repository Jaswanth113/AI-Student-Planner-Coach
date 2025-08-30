# Life Planner API Endpoints

This document describes the available API endpoints for the Life Planner application.

## Base URL
All endpoints are prefixed with `/api/`.

## Authentication
All endpoints require authentication. Include the user's JWT in the `Authorization` header:
```
Authorization: Bearer <user_jwt_token>
```

## Endpoints

### 1. Detect Input Type
Detects whether the input is a task, grocery, or reminder.

**Endpoint:** `POST /api/detect-type`

**Request Body:**
```json
{
  "text": "Buy milk tomorrow"
}
```

**Response:**
```json
{
  "type": "grocery"
}
```

### 2. Parse Task
Parses natural language input into a structured task.

**Endpoint:** `POST /api/parse-task`

**Request Body:**
```json
{
  "text": "Schedule a meeting with John tomorrow at 2pm",
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "id": "task_123",
  "title": "Meeting with John",
  "due_date": "2023-06-15T14:00:00.000Z",
  "category": "meeting",
  "user_id": "user_123",
  "status": "Inbox",
  "priority": 2,
  "created_at": "2023-06-14T10:00:00.000Z"
}
```

### 3. Parse Grocery
Parses natural language input into a grocery item.

**Endpoint:** `POST /api/parse-grocery`

**Request Body:**
```json
{
  "text": "Buy 2 liters of milk",
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "id": "grocery_123",
  "item_name": "milk",
  "quantity": "2 liters",
  "category": "dairy",
  "user_id": "user_123",
  "bought": false,
  "created_at": "2023-06-14T10:00:00.000Z"
}
```

### 4. Parse Reminder
Parses natural language input into a reminder.

**Endpoint:** `POST /api/parse-reminder`

**Request Body:**
```json
{
  "text": "Remind me to call mom tomorrow at 5pm",
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "id": "reminder_123",
  "title": "Call mom",
  "due_date": "2023-06-15T17:00:00.000Z",
  "category": "personal",
  "user_id": "user_123",
  "is_completed": false,
  "created_at": "2023-06-14T10:00:00.000Z"
}
```

## Error Handling
All endpoints return appropriate HTTP status codes and error messages in the following format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Environment Variables
Make sure to set the following environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `HF_API_KEY`: Your Hugging Face API key

## Rate Limiting
API is rate-limited to 60 requests per minute per IP address.

## CORS
CORS is enabled for all origins. Make sure to include the `Origin` header in your requests.
