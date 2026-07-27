import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, type ApiFolder, type FolderFilterParams } from '../api'
import type { FolderDocument } from '../types'

export const useFolderStore = defineStore('folder', () => {
    const recentFolders = ref<ApiFolder[]>([])
    const pagination = ref({
        total: 0,
        page: 1,
        limit: 20,
        pages: 1,
    })
    const documentCache = ref<Record<string, FolderDocument[]>>({})
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchFolders(params?: FolderFilterParams) {
        loading.value = true
        error.value = null
        try {
            const res = await api.folders.list(params)
            if (res && Array.isArray(res.items)) {
                recentFolders.value = res.items
                pagination.value = {
                    total: res.total,
                    page: res.page,
                    limit: res.limit,
                    pages: res.pages,
                }
            } else if (Array.isArray(res)) {
                recentFolders.value = res
                pagination.value = {
                    total: res.length,
                    page: 1,
                    limit: res.length || 20,
                    pages: 1,
                }
            }
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'Error desconocido'
        } finally {
            loading.value = false
        }
    }

    async function fetchDocuments(folderId: string) {
        loading.value = true
        error.value = null
        try {
            documentCache.value[folderId] = await api.documents.list(folderId)
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'Error desconocido'
        } finally {
            loading.value = false
        }
    }

    function getDocuments(folderId: string): FolderDocument[] {
        return documentCache.value[folderId] ?? []
    }

    function addToCache(folderId: string, doc: FolderDocument) {
        if (!documentCache.value[folderId]) documentCache.value[folderId] = []
        documentCache.value[folderId].unshift(doc)
    }

    async function deleteDocument(folderId: string, docId: string) {
        await api.documents.delete(folderId, docId)
        const cache = documentCache.value[folderId]
        if (cache) {
            const idx = cache.findIndex(d => d.id === docId)
            if (idx !== -1) cache[idx] = { ...cache[idx], state: 'deleted' }
        }
    }

    async function setDocumentState(folderId: string, docId: string, state: string) {
        const updated = await api.documents.setState(folderId, docId, state)
        const cache = documentCache.value[folderId]
        if (cache) {
            const idx = cache.findIndex(d => d.id === docId)
            if (idx !== -1) cache[idx] = updated
        }
    }

    async function signFolder(folderId: string) {
        await api.folders.sign(folderId)
        // Refresh docs so all states reflect 'signed'
        await fetchDocuments(folderId)
        // Mark folder as closed in the cache
        const idx = recentFolders.value.findIndex(f => f.id === folderId)
        if (idx !== -1) recentFolders.value[idx] = { ...recentFolders.value[idx], state: 'closed' }
    }

    async function setFolderState(folderId: string, state: string) {
        const updated = await api.folders.setState(folderId, state)
        const idx = recentFolders.value.findIndex(f => f.id === folderId)
        if (idx !== -1) recentFolders.value[idx] = { ...recentFolders.value[idx], state: updated.state }
    }

    async function updateDocumentType(folderId: string, docId: string, tipo: string) {
        const updated = await api.documents.updateType(folderId, docId, tipo)
        const cache = documentCache.value[folderId]
        if (cache) {
            const idx = cache.findIndex(d => d.id === docId)
            if (idx !== -1) cache[idx] = updated
        }
    }

    return {
        recentFolders, pagination, documentCache, loading, error,
        fetchFolders, fetchDocuments, getDocuments, addToCache, deleteDocument, setDocumentState, updateDocumentType, signFolder, setFolderState,
    }
})
