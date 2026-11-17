export const SYNC_APP_DATA_API_URL = '/sync-app-data'

// Incremental sync: GET pulls changes since a cursor, POST pushes local changes.
// Servers that only accept a full backup answer 404/405/501 here and the client
// falls back to SYNC_APP_DATA_API_URL.
export const SYNC_CHANGES_API_URL = '/sync-app-data/changes'

export const UPLOAD_IMAGE_API_URL = '/upload-image'
