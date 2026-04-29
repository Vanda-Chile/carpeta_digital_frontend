<script setup lang="ts">
import type { FolderDocument } from '../types'
import { api } from '../api'

const props = defineProps<{ doc: FolderDocument }>()
const emit = defineEmits<{
  (e: 'delete', docId: string): void
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const iconByMime: Record<string, string> = {
  'application/pdf': '📄',
  'image/': '🖼️',
  'text/': '📝',
  'application/vnd.openxmlformats': '📊',
  'application/msword': '📝',
  'application/zip': '🗜️',
}

function docIcon(mimeType: string): string {
  const entry = Object.entries(iconByMime).find(([k]) => mimeType.startsWith(k))
  return entry ? entry[1] : '📎'
}

function openDoc() {
  const url = api.documents.downloadUrl(props.doc.folder_id, props.doc.id)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="flex items-start gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3
              hover:shadow-sm transition">
    <!-- Icon -->
    <span class="text-2xl select-none mt-0.5" aria-hidden="true">{{ docIcon(doc.mime_type) }}</span>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-gray-900 truncate" :title="doc.tipo ?? ''">{{ doc.tipo ?? '—' }}</p>
      <p class="text-xs text-gray-400 mt-0.5">
        {{ formatSize(doc.size) }} &middot; {{ formatDate(doc.uploaded_at) }}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0">
      <button
        class="rounded-lg px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700
               hover:bg-indigo-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
        @click="openDoc"
      >
        Ver
      </button>
      <button
        class="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600
               hover:bg-red-100 transition focus:outline-none focus:ring-2 focus:ring-red-400"
        @click="emit('delete', doc.id)"
      >
        Eliminar
      </button>
    </div>
  </div>
</template>
