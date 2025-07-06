# API Response Logging System

## Overview

This system externalizes FAL API responses from the main `metadata.json` file to prevent it from becoming too large for LLM processing. Base64 video data and complete API responses are now stored in individual log files.

## Directory Structure

```
public/
├── videos/               # Video files (.mp4)
├── logs/
│   └── api-responses/   # Individual API response log files
└── metadata.json        # Clean metadata (no base64 data)
```

## How It Works

### 1. Video Generation Process

1. **FAL API Call** (`/api/fal/proxy`)
   - Generates unique `videoId` for each request
   - Calls FAL API and receives complete response (including base64 data)
   - Saves complete API response to: `{videoId}_{timestamp}_api-response.json`
   - Returns clean response without base64 data

2. **Video Save** (`/api/videos/save`)
   - Receives clean response with `videoId` and `logReference`
   - Downloads video file from URL
   - Saves metadata with reference to log file
   - Updates `metadata.json` with clean data

### 2. Log File Format

Each API response log file contains:
```json
{
  "videoId": "uuid-here",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "apiResponse": {
    // Complete FAL API response including base64 data
  }
}
```

### 3. Metadata Format

The `metadata.json` now includes a reference to the log file:
```json
{
  "id": "uuid-here",
  "title": "Video Title",
  // ... other metadata fields
  "apiResponseLog": "uuid_timestamp_api-response.json"
}
```

## API Endpoints

### Retrieve API Response Log
```
GET /api/logs/{videoId}
```
Returns the complete API response for a specific video, including base64 data.

### Video Management (Updated)
```
POST /api/videos/save
```
Now accepts additional parameters:
- `videoId`: UUID from FAL proxy
- `logReference`: Reference to the log file

## Benefits

1. **Lightweight metadata.json**: No more base64 data bloating the main file
2. **LLM Friendly**: metadata.json stays small and readable
3. **Isolated Logs**: Each API response in its own file
4. **Scalable**: No single file grows indefinitely
5. **Backward Compatible**: Existing functionality preserved

## File Management

- **Creation**: Log files created automatically during video generation
- **Deletion**: Log files automatically deleted when videos are deleted
- **Retrieval**: Use `/api/logs/{videoId}` to access complete API responses
- **Cleanup**: Each log file contains only one API response

## Migration Notes

- Previous metadata.json files with embedded base64 data are replaced with clean format
- Existing videos will work but won't have associated log files
- New videos will automatically use the logging system
