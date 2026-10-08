# Service API Documentation

This service provides a comprehensive REST API for managing content management system resources in commercetools. The API supports content types, content items, pages, files, datasources, and state management with versioning capabilities.

## Base URL

All API endpoints are prefixed with `/service`.

## Authentication

The service uses commercetools authentication. Make sure you have the proper credentials and environment variables set up.

## Postman collection

A ready-to-use Postman collection and environment are included in [`postman/`](./postman):

- [`cms-api-postman-collection.json`](./postman/cms-api-postman-collection.json) — all current endpoints, grouped by area (Auth, Configuration, Content Types, File Management, Datasources, Puck Pages, Puck Contents, …)
- [`cms-api-postman-environment.json`](./postman/cms-api-postman-environment.json) — environment variables (`base_url`, `project_key`, `business_unit_key`, bearer token, …)

Import both into Postman, select the environment, then run **Auth → Authenticate Project** first to populate the bearer token. The deprecated content-items and grid-based pages requests are not included in the collection.

## API Endpoints

### Content Types

#### Get All Content Types

```http
GET /service/content-type
```

Returns all content types (both dynamic and static).

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "key": "string",
    "name": "string",
    "schema": {},
    "deployedUrl": "string"
  }
]
```

#### Get Content Type by Key

```http
GET /service/content-type/:key
```

**Parameters:**
- `key` (required): The unique key of the content type

**Response:** `200 OK`
```json
{
  "id": "string",
  "container": "string",
  "key": "string",
  "value": {
    "name": "string",
    "schema": {},
    "deployedUrl": "string"
  }
}
```

#### Create Content Type

```http
POST /service/content-type/:key
```

**Parameters:**
- `key` (required): The unique key for the new content type

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "schema": {},
    "renderer": "string"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "string",
  "container": "string",
  "key": "string",
  "value": {
    "name": "string",
    "schema": {},
    "deployedUrl": "string"
  }
}
```

#### Update Content Type

```http
PUT /service/content-type/:key
```

**Parameters:**
- `key` (required): The unique key of the content type to update

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "schema": {},
    "renderer": "string"
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "string",
  "container": "string",
  "key": "string",
  "value": {
    "name": "string",
    "schema": {},
    "deployedUrl": "string"
  }
}
```

#### Delete Content Type

```http
DELETE /service/content-type/:key
```

**Parameters:**
- `key` (required): The unique key of the content type to delete

**Response:** `204 No Content`

### Content Items

#### Get All Content Items

```http
GET /service/:businessUnitKey/content-items
```

**Parameters:**
- `businessUnitKey` (required): The business unit key

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "key": "string",
    "value": {
      "type": "string",
      "name": "string",
      "data": {},
      "businessUnitKey": "string"
    },
    "states": {
      "draft": {},
      "published": {}
    }
  }
]
```

#### Get Content Items by Content Type

```http
GET /service/:businessUnitKey/content-items/content-type/:contentType
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `contentType` (required): The content type to filter by

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "key": "string",
    "value": {
      "type": "string",
      "name": "string",
      "data": {},
      "businessUnitKey": "string"
    },
    "states": {
      "draft": {},
      "published": {}
    }
  }
]
```

#### Get Content Item by Key

```http
GET /service/:businessUnitKey/content-items/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "type": "string",
    "name": "string",
    "data": {},
    "businessUnitKey": "string"
  }
}
```

#### Get Published Content Item

```http
GET /service/:businessUnitKey/published/content-items/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "type": "string",
    "name": "string",
    "data": {},
    "businessUnitKey": "string"
  }
}
```

#### Get Preview Content Item

```http
GET /service/:businessUnitKey/preview/content-items/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "type": "string",
    "name": "string",
    "data": {},
    "businessUnitKey": "string"
  }
}
```

#### Create Content Item

```http
POST /service/:businessUnitKey/content-items/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key for the new content item

**Request Body:**
```json
{
  "value": {
    "type": "string",
    "name": "string",
    "data": {}
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "type": "string",
    "name": "string",
    "data": {},
    "businessUnitKey": "string"
  }
}
```

#### Update Content Item

```http
PUT /service/:businessUnitKey/content-items/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item to update

**Request Body:**
```json
{
  "value": {
    "type": "string",
    "name": "string",
    "data": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "type": "string",
    "name": "string",
    "data": {},
    "businessUnitKey": "string"
  }
}
```

#### Delete Content Item

```http
DELETE /service/:businessUnitKey/content-items/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item to delete

**Response:** `204 No Content`

### Pages

#### Get All Pages

```http
GET /service/:businessUnitKey/pages
```

**Parameters:**
- `businessUnitKey` (required): The business unit key

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "key": "string",
    "value": {
      "name": "string",
      "content": {},
      "businessUnitKey": "string"
    }
  }
]
```

#### Get Page by Key

```http
GET /service/:businessUnitKey/pages/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "name": "string",
    "content": {},
    "businessUnitKey": "string"
  }
}
```

#### Create Page

```http
POST /service/:businessUnitKey/pages/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key for the new page

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "content": {}
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "name": "string",
    "content": {},
    "businessUnitKey": "string"
  }
}
```

#### Update Page

```http
PUT /service/:businessUnitKey/pages/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page to update

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "content": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "name": "string",
    "content": {},
    "businessUnitKey": "string"
  }
}
```

#### Delete Page

```http
DELETE /service/:businessUnitKey/pages/:key
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page to delete

**Response:** `204 No Content`

### File Management

#### Upload File

```http
POST /service/:businessUnitKey/upload-file
```

**Parameters:**
- `businessUnitKey` (required): The business unit key

**Request Body:** `multipart/form-data`
- `file` (required): The file to upload
- `title` (optional): File title
- `description` (optional): File description

**Response:** `200 OK`
```json
{
  "url": "string"
}
```

#### Get Media Library

```http
GET /service/:businessUnitKey/media-library
```

**Parameters:**
- `businessUnitKey` (required): The business unit key

**Query Parameters:**
- `extensions` (optional): Comma-separated list of file extensions to filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "url": "string",
      "title": "string",
      "description": "string",
      "extension": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### Compile and Upload

```http
POST /service/compile-upload
```

**Request Body:**
```json
{
  "files": {
    "filename.ts": {
      "content": "string"
    }
  },
  "key": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "url": "string"
}
```

### Datasources

#### Get All Datasources

```http
GET /service/datasource
```

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "key": "string",
    "value": {
      "name": "string",
      "type": "string",
      "config": {}
    }
  }
]
```

#### Get Datasource by Key

```http
GET /service/datasource/:key
```

**Parameters:**
- `key` (required): The unique key of the datasource

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "name": "string",
    "type": "string",
    "config": {}
  }
}
```

#### Create Datasource

```http
POST /service/datasource/:key
```

**Parameters:**
- `key` (required): The unique key for the new datasource

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "type": "string",
    "config": {}
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "name": "string",
    "type": "string",
    "config": {}
  }
}
```

#### Update Datasource

```http
PUT /service/datasource/:key
```

**Parameters:**
- `key` (required): The unique key of the datasource to update

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "type": "string",
    "config": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "string",
  "key": "string",
  "value": {
    "name": "string",
    "type": "string",
    "config": {}
  }
}
```

#### Delete Datasource

```http
DELETE /service/datasource/:key
```

**Parameters:**
- `key` (required): The unique key of the datasource to delete

**Response:** `204 No Content`

### State Management

#### Get Content Item States

```http
GET /service/:businessUnitKey/content-items/:key/states
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "draft": {},
    "published": {}
  }
}
```

#### Save Content Item Draft State

```http
PUT /service/:businessUnitKey/content-items/:key/states/draft
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Request Body:**
```json
{
  "value": {
    "type": "string",
    "name": "string",
    "data": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "draft": {},
    "published": {}
  }
}
```

#### Publish Content Item State

```http
PUT /service/:businessUnitKey/content-items/:key/states/published
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Query Parameters:**
- `clearDraft` (optional): Set to 'true' to remove draft state after publishing

**Request Body:**
```json
{
  "value": {
    "type": "string",
    "name": "string",
    "data": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "draft": {},
    "published": {}
  }
}
```

#### Delete Content Item Draft State

```http
DELETE /service/:businessUnitKey/content-items/:key/states/draft
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "published": {}
  }
}
```

#### Get Page States

```http
GET /service/:businessUnitKey/pages/:key/states
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "draft": {},
    "published": {}
  }
}
```

#### Save Page Draft State

```http
PUT /service/:businessUnitKey/pages/:key/states/draft
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "content": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "draft": {},
    "published": {}
  }
}
```

#### Publish Page State

```http
PUT /service/:businessUnitKey/pages/:key/states/published
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Query Parameters:**
- `clearDraft` (optional): Set to 'true' to remove draft state after publishing

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "content": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "draft": {},
    "published": {}
  }
}
```

#### Delete Page Draft State

```http
DELETE /service/:businessUnitKey/pages/:key/states/draft
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "states": {
    "published": {}
  }
}
```

### Version Management

#### Get Content Item Versions

```http
GET /service/:businessUnitKey/content-items/:key/versions
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "versions": [
    {
      "id": "string",
      "timestamp": "string",
      "type": "string",
      "name": "string",
      "data": {}
    }
  ]
}
```

#### Get Specific Content Item Version

```http
GET /service/:businessUnitKey/content-items/:key/versions/:versionId
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item
- `versionId` (required): The unique ID of the version

**Response:** `200 OK`
```json
{
  "id": "string",
  "timestamp": "string",
  "type": "string",
  "name": "string",
  "data": {}
}
```

#### Create Content Item Version

```http
POST /service/:businessUnitKey/content-items/:key/versions
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the content item

**Request Body:**
```json
{
  "value": {
    "type": "string",
    "name": "string",
    "data": {}
  }
}
```

**Response:** `201 Created`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "versions": [
    {
      "id": "string",
      "timestamp": "string",
      "type": "string",
      "name": "string",
      "data": {}
    }
  ]
}
```

#### Get Page Versions

```http
GET /service/:businessUnitKey/pages/:key/versions
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Response:** `200 OK`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "versions": [
    {
      "id": "string",
      "timestamp": "string",
      "name": "string",
      "content": {}
    }
  ]
}
```

#### Get Specific Page Version

```http
GET /service/:businessUnitKey/pages/:key/versions/:versionId
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page
- `versionId` (required): The unique ID of the version

**Response:** `200 OK`
```json
{
  "id": "string",
  "timestamp": "string",
  "name": "string",
  "content": {}
}
```

#### Create Page Version

```http
POST /service/:businessUnitKey/pages/:key/versions
```

**Parameters:**
- `businessUnitKey` (required): The business unit key
- `key` (required): The unique key of the page

**Request Body:**
```json
{
  "value": {
    "name": "string",
    "content": {}
  }
}
```

**Response:** `201 Created`
```json
{
  "key": "string",
  "businessUnitKey": "string",
  "versions": [
    {
      "id": "string",
      "timestamp": "string",
      "name": "string",
      "content": {}
    }
  ]
}
```

### Proxy

#### Proxy Script

```http
GET /service/proxy-script
```

**Query Parameters:**
- `url` (required): The URL of the external script to proxy

**Response:** `200 OK`
Returns the JavaScript content with appropriate headers to avoid CORS issues.

## Error Responses

The API may return the following error responses:

- `400 Bad Request`: When required parameters are missing or invalid
- `404 Not Found`: When the requested resource doesn't exist
- `500 Internal Server Error`: When an unexpected error occurs

**Error Response Body:**
```json
{
  "statusCode": number,
  "message": "string"
}
```

## Environment Variables

- `MAX_VERSIONS`: Maximum number of versions to keep (default: 5)

## Authentication Setup

This service integrates with commercetools and requires the following environment variables:
- Commercetools client credentials
- Region configuration
- Project key

For detailed authentication setup, refer to the main project configuration documentation.
