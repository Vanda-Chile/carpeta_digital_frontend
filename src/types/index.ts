export interface FolderDocument {
    id: string
    folder_id: string
    serie: number
    mime_type: string
    size: number        // bytes
    state: string
    tipo: string | null
    observacion: string | null
    uploaded_by: string | null
    uploaded_at: string // ISO 8601
    signed_at: string | null // ISO 8601
    data_url: string // for previewing the document without an extra API call
}
