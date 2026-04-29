<script setup lang="ts">
import type { FolderDocument } from '../types'

const props = defineProps<{ doc: FolderDocument }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const isImage = props.doc.mimeType.startsWith('image/')
const isPdf = props.doc.mimeType === 'application/pdf'
const isText = props.doc.mimeType.startsWith('text/')

// Decode text content for plain-text previews
function decodeText(dataUrl: string): string {
  try {
    const base64 = dataUrl.split(',')[1]
    return atob(base64)
  } catch {
    return 'No se pudo decodificar el contenido.'
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 z-20 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <h2 class="text-sm font-semibold text-gray-900 truncate" :title="doc.tipo ?? ''">
          {{ doc.tipo ?? '—' }}
        </h2>
        <button
          class="ml-4 shrink-0 text-gray-400 hover:text-gray-700 transition focus:outline-none"
          aria-label="Cerrar vista previa"
          @click="emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Preview area -->
      <div class="overflow-auto flex-1 p-4">
        <!-- Image -->
        <img
          v-if="isImage"
          :src="doc.dataUrl"
          :alt="doc.tipo ?? ''"
          class="max-w-full mx-auto rounded-lg"
        />

        <!-- PDF -->
        <iframe
          v-else-if="isPdf"
          :src="doc.dataUrl"
          :title="doc.tipo ?? ''"
          class="w-full rounded-lg"
          style="height: 60vh; border: none;"
        />

        <!-- Plain text -->
        <pre
          v-else-if="isText"
          class="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-auto whitespace-pre-wrap"
        >{{ decodeText(doc.dataUrl) }}</pre>

        <!-- Unsupported type -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <span class="text-5xl mb-4">📎</span>
          <p class="text-sm text-gray-500">Vista previa no disponible para este tipo de archivo.</p>
          <a
            :href="doc.dataUrl"
            :download="(doc.tipo ?? 'documento') + '.pdf'"
            class="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                   hover:bg-indigo-700 transition"
          >
            Descargar archivo
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
