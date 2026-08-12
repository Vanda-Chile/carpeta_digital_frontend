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
    user_id: string | number
    user_name: string | null
    client_rut: string | null
    client: ApiClient | null
    agent_id?: string | null
    agent?: ApiAgent | null
    numero_aceptacion: string | null
    fecha_aceptacion: string | null
    created_at: string
    closed_at: string | null
    document_count: number
    needs_signing?: boolean
    state: string        // 'open' | 'closed'
}

export interface ApiPaginatedFolders {
    items: ApiFolder[]
    total: number
    page: number
    limit: number
    pages: number
}

export interface FolderFilterParams {
    numero_despacho?: string
    numero_aceptacion?: string
    client?: string
    agent_id?: string
    creating_user?: string
    state?: string
    operacion?: string
    has_documents?: string
    needs_signing?: string
    desde?: string
    hasta?: string
    sort_by?: 'created_at' | 'fecha_aceptacion' | 'numero_despacho'
    order?: 'asc' | 'desc'
    page?: number
    limit?: number
}

export interface ApiStats {
    total_folders: number
    folders_this_month: number
    total_documents: number
    documents_this_month: number
    total_clients: number
    month: string
    period?: string
    period_label?: string
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

export interface ApiContact {
    id: number
    name: string
    email: string
}

export interface ApiRevision {
    id: number
    document_id: string
    result: string
    novedad: boolean
    created_at: string
    numero_despacho: string
    folder_id: string
    document_tipo: string | null
}

export interface ApiObservation {
    id: number
    document_id: string
    text: string
    created_at: string
    user_name: string | null
}

export const api = {
    stats: {
        get: (period: string = 'month') => request<ApiStats>(`/folders/stats?period=${encodeURIComponent(period)}`),
    },
    revisions: {
        list: (params?: { q?: string; result?: string; novedad?: boolean; doc_type?: string; date_from?: string; date_to?: string }) => {
            const query = new URLSearchParams()
            if (params?.q) query.set('q', params.q)
            if (params?.result) query.set('result', params.result)
            if (params?.novedad !== undefined) query.set('novedad', String(params.novedad))
            if (params?.doc_type) query.set('doc_type', params.doc_type)
            if (params?.date_from) query.set('date_from', params.date_from)
            if (params?.date_to) query.set('date_to', params.date_to)
            const qStr = query.toString() ? `?${query.toString()}` : ''
            return request<ApiRevision[]>(`/revisions/${qStr}`)
        },
    },
    contacts: {
        list: () =>
            request<ApiContact[]>('/contacts/'),
        get: (id: number) =>
            request<ApiContact>(`/contacts/${id}`),
        create: (payload: { name: string; email: string }) =>
            request<ApiContact>('/contacts/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        update: (id: number, payload: { name?: string; email?: string }) =>
            request<ApiContact>(`/contacts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        delete: (id: number) =>
            request<void>(`/contacts/${id}`, { method: 'DELETE' }),
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
        list: (params?: FolderFilterParams) => {
            const query = new URLSearchParams()
            if (params?.numero_despacho) query.set('numero_despacho', params.numero_despacho)
            if (params?.numero_aceptacion) query.set('numero_aceptacion', params.numero_aceptacion)
            if (params?.client) query.set('client', params.client)
            const agentVal = params?.agent_id || (params as { agent?: string })?.agent
            if (agentVal) query.set('agent_id', agentVal)
            if (params?.creating_user) query.set('creating_user', params.creating_user)
            if (params?.state) query.set('state', params.state)
            if (params?.operacion) query.set('operacion', params.operacion)
            if (params?.has_documents) query.set('has_documents', params.has_documents)
            if (params?.needs_signing) query.set('needs_signing', params.needs_signing)
            if (params?.desde) query.set('desde', params.desde)
            if (params?.hasta) query.set('hasta', params.hasta)
            if (params?.sort_by) query.set('sort_by', params.sort_by)
            if (params?.order) query.set('order', params.order)
            if (params?.page) query.set('page', params.page.toString())
            if (params?.limit) query.set('limit', params.limit.toString())
            const qs = query.toString()
            return request<ApiPaginatedFolders>(`/folders/${qs ? `?${qs}` : ''}`)
        },
        get: (uuid: string) =>
            request<ApiFolder>(`/folders/${uuid}`),
        create: (payload: {
            numero_despacho: string
            operacion?: string
            client_rut?: string
            client_razon_social?: string
            agent_id?: string
            numero_aceptacion?: string
            fecha_aceptacion?: string
        }) =>
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
        sendEmail: (uuid: string, payload: { to_email: string; subject?: string; message?: string }) =>
            request<{ message: string }>(`/folders/${uuid}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        sendAduana: (uuid: string, payload: { contact_ids: number[]; validity_days?: number }) =>
            request<{ message: string; sent_count: number }>(`/folders/${uuid}/send-aduana`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
    },
    documents: {
        list: (folderUuid: string) =>
            request<ApiDocument[]>(`/folders/${folderUuid}/documents/`),
        getUploadUrl: (
            folderUuid: string,
            payload: { filename: string; mime_type: string },
        ) =>
            request<{ upload_url: string; temp_path: string; expires_in: number }>(`/folders/${folderUuid}/documents/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        uploadToGcs: async (uploadUrl: string, file: File) => {
            const res = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
                body: file,
            })
            if (!res.ok) {
                throw new Error(`Error al subir archivo a GCS: ${res.statusText} (${res.status})`)
            }
        },
        upload: (
            folderUuid: string,
            payload: { filename: string; temp_path: string; mime_type: string; observacion?: string; tipo?: string },
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
        updateType: (folderUuid: string, docId: string, tipo: string) =>
            request<ApiDocument>(`/folders/${folderUuid}/documents/${docId}/type`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo }),
            }),
        search: (q: string) =>
            request<ApiDocument[]>(`/documents/?q=${encodeURIComponent(q)}`),
        getUrl: (folderUuid: string, docId: string) =>
            request<{ url: string }>(`/folders/${folderUuid}/documents/${docId}/url`),
        downloadUrl: (folderUuid: string, docId: string) =>
            `${BASE_URL}/folders/${folderUuid}/documents/${docId}/download`,
        addObservation: (folderUuid: string, docId: string, text: string) =>
            request<ApiObservation>(`/folders/${folderUuid}/documents/${docId}/observations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            }),
        listObservations: (folderUuid: string, docId: string) =>
            request<ApiObservation[]>(`/folders/${folderUuid}/documents/${docId}/observations`),
    },
    organizations: {
        list: () => request<ApiOrganization[]>('/organizations/'),
        create: (payload: { name: string; code?: string | null; systemFlag: boolean }) =>
            request<ApiOrganization>('/organizations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        listUsers: (orgId: string) =>
            request<ApiOrganizationUser[]>(`/organizations/${orgId}/users`),
        addUser: (orgId: string, payload: { user_id: string; is_admin: boolean }) =>
            request<ApiOrganizationUser>(`/organizations/${orgId}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        updateUser: (orgId: string, userId: string, payload: { user_id: string; is_admin: boolean }) =>
            request<ApiOrganizationUser>(`/organizations/${orgId}/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        removeUser: (orgId: string, userId: string) =>
            request<void>(`/organizations/${orgId}/users/${userId}`, {
                method: 'DELETE',
            }),
    },
    agents: {
        getMyAgency: () => request<ApiAgencyDetails>('/agents/my-agency'),
        list: () => request<ApiAgent[]>('/agents/'),
        create: (payload: { name: string; code?: string; rut?: string; pin: boolean; slot: boolean }) =>
            request<ApiAgent>('/agents/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        update: (id: string, payload: Partial<{ name: string; code?: string; rut?: string; pin: boolean; slot: boolean }>) =>
            request<ApiAgent>(`/agents/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        delete: (id: string) =>
            request<void>(`/agents/${id}`, {
                method: 'DELETE',
            }),
    },
    certificates: {
        upload: (agentId: string, file: File, password: string) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('password', password)
            return request<ApiCertificate>(`/agents/${agentId}/certificate/`, {
                method: 'POST',
                body: formData,
            })
        },
        get: (agentId: string) =>
            request<ApiCertificate>(`/agents/${agentId}/certificate/`),
        delete: (agentId: string) =>
            request<void>(`/agents/${agentId}/certificate/`, {
                method: 'DELETE',
            }),
    },
}

export interface ApiOrganizationUser {
    id: string
    organization_id: string
    user_id: string
    is_admin: boolean
}

export interface ApiOrganization {
    id: string
    name: string
    code?: string | null
    systemFlag: boolean
    user_count: number
    users: ApiOrganizationUser[]
}

export interface ApiCertificate {
    id: string
    agent_id: string
    subject_cn: string | null
    issuer: string | null
    rut_firmante: string | null
    valid_from: string | null
    valid_until: string | null
    fingerprint_sha256: string | null
    is_active: boolean
    created_at: string
}

export interface ApiAgent {
    id: string
    name: string
    organization_id?: string | null
    code?: string | null
    rut?: string | null
    pin: boolean
    slot: boolean
    certificate?: ApiCertificate | null
}

export interface ApiAgencyDetails {
    id: string
    name: string
    code?: string | null
    systemFlag: boolean
    agents: ApiAgent[]
}



