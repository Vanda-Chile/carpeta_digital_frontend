const BASE_URL = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'http://127.0.0.1:8080'
const GATEWAY_APIKEY = (import.meta.env.VITE_GATEWAY_APIKEY as string | undefined) ?? ''

function getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem('cd_access_token')
    const headers: Record<string, string> = {}
    if (GATEWAY_APIKEY) headers['apikey'] = GATEWAY_APIKEY
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
}

async function requestBlob(path: string, options?: RequestInit): Promise<Blob> {
    const headers = new Headers({ ...getAuthHeaders(), ...options?.headers })
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    if (!res.ok) {
        let detail = `Error ${res.status}`
        try {
            const body = await res.json()
            detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
        } catch { /* ignore */ }
        throw new Error(detail)
    }
    return res.blob()
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers = new Headers({ ...getAuthHeaders(), ...options?.headers })
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    if (res.status === 204) return undefined as T
    if (!res.ok) {
        let detail = `Error ${res.status}`
        try {
            const body = await res.json()
            detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
        } catch { /* ignore */ }
        throw new Error(detail)
    }
    return res.json()
}

export interface ApiClient {
    rut: string
    razon_social: string
}

export interface ApiFolder {
    id: string           // system UUID
    numero_despacho: string
    operacion: string    // 'importacion' | 'exportacion'
    user_id: number
    client_rut: string | null
    client: ApiClient | null
    created_at: string
    closed_at: string | null
    document_count: number
    state: string        // 'open' | 'closed'
}

export interface ApiStats {
    total_folders: number
    folders_this_month: number
    total_documents: number
    documents_this_month: number
    total_clients: number
    month: string
}

export interface ApiDocument {
    id: string
    folder_id: string
    serie: number
    mime_type: string
    size: number
    state: string
    observacion: string | null
    tipo: string | null
    uploaded_by: string | null
    uploaded_at: string
    signed_at: string | null
}

export interface ApiDocumentType {
    id: number
    nombre: string
    activo: boolean
}

export interface ApiBitacoraEntry {
    id: number
    event_type: string
    user_name: string | null
    document_tipo: string | null
    timestamp: string
}

export const api = {
    stats: {
        get: () => request<ApiStats>('/folders/stats'),
    },
    documentTypes: {
        listActive: () =>
            request<ApiDocumentType[]>('/document-types/'),
        listAll: () =>
            request<ApiDocumentType[]>('/document-types/all'),
        create: (nombre: string) =>
            request<ApiDocumentType>('/document-types/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre }),
            }),
        update: (id: number, payload: { nombre?: string; activo?: boolean }) =>
            request<ApiDocumentType>(`/document-types/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
    },
    clients: {
        search: (q: string) =>
            request<ApiClient[]>(`/clients/?q=${encodeURIComponent(q)}`),
        create: (rut: string, razon_social: string) =>
            request<ApiClient>('/clients/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rut, razon_social }),
            }),
    },
    folders: {
        list: () =>
            request<ApiFolder[]>('/folders/'),
        get: (uuid: string) =>
            request<ApiFolder>(`/folders/${uuid}`),
        create: (payload: { numero_despacho: string; operacion?: string; client_rut?: string; client_razon_social?: string }) =>
            request<ApiFolder>('/folders/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        delete: (uuid: string) =>
            request<void>(`/folders/${uuid}`, { method: 'DELETE' }),
        setState: (uuid: string, state: string) =>
            request<ApiFolder>(`/folders/${uuid}/state`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state }),
            }),
        sign: (uuid: string) =>
            request<void>(`/folders/${uuid}/sign`, { method: 'POST' }),
        downloadZip: async (uuid: string, filename: string) => {
            const blob = await requestBlob(`/folders/${uuid}/download`)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()
            URL.revokeObjectURL(url)
        },
        downloadFirma: async (uuid: string, filename: string) => {
            const blob = await requestBlob(`/folders/${uuid}/download-firma`)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()
            URL.revokeObjectURL(url)
        },
        audit: (uuid: string) =>
            request<ApiBitacoraEntry[]>(`/folders/${uuid}/audit`),
    },
    documents: {
        list: (folderUuid: string) =>
            request<ApiDocument[]>(`/folders/${folderUuid}/documents/`),
        upload: (
            folderUuid: string,
            payload: { filename: string; mime_type: string; content: string; observacion?: string; tipo?: string },
        ) =>
            request<ApiDocument>(`/folders/${folderUuid}/documents/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        delete: (folderUuid: string, docId: string) =>
            request<void>(
                `/folders/${folderUuid}/documents/${docId}`,
                { method: 'DELETE' },
            ),
        setState: (folderUuid: string, docId: string, state: string) =>
            request<ApiDocument>(`/folders/${folderUuid}/documents/${docId}/state`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state }),
            }),
        search: (q: string) =>
            request<ApiDocument[]>(`/documents/?q=${encodeURIComponent(q)}`),
        downloadUrl: (folderUuid: string, docId: string) =>
            `${BASE_URL}/folders/${folderUuid}/documents/${docId}/download`,
    },
}
