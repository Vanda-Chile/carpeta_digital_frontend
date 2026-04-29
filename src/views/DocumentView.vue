<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'
import { api } from '../api'

const route = useRoute()
const router = useRouter()
const store = useFolderStore()

const folderId = computed(() => decodeURIComponent(route.params.id as string))
const docId = computed(() => decodeURIComponent(route.params.docId as string))

const documents = computed(() => store.getDocuments(folderId.value))
const currentIndex = computed(() => documents.value.findIndex(d => d.id === docId.value))
const doc = computed(() => documents.value[currentIndex.value] ?? null)

const prevDoc = computed(() => currentIndex.value > 0 ? documents.value[currentIndex.value - 1] : null)
const nextDoc = computed(() => currentIndex.value < documents.value.length - 1 ? documents.value[currentIndex.value + 1] : null)

function navigateTo(id: string) {
  router.replace(`/folder/${encodeURIComponent(folderId.value)}/document/${encodeURIComponent(id)}`)
}

const iframeUrl = computed(() => api.documents.downloadUrl(folderId.value, docId.value))
const iframeLoading = ref(true)
const iframeError = ref(false)
const stateLoading = ref(false)

async function setState(newState: string) {
  if (stateLoading.value) return
  stateLoading.value = true
  try {
    await store.setDocumentState(folderId.value, docId.value, newState)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo actualizar el estado.')
  } finally {
    stateLoading.value = false
  }
}

// Reset iframe state when navigating between documents
watch(docId, () => {
  iframeLoading.value = true
  iframeError.value = false
})

onMounted(async () => {
  if (store.getDocuments(folderId.value).length === 0) {
    await store.fetchDocuments(folderId.value)
  }
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col" @keydown.left.window="prevDoc && navigateTo(prevDoc.id)" @keydown.right.window="nextDoc && navigateTo(nextDoc.id)">
    <AppHeader
      show-back
      :subtitle="doc?.tipo ?? docId"
      @back="router.push(`/folder/${encodeURIComponent(folderId)}`)"
    />

    <main class="flex flex-col flex-1 max-w-6xl w-full mx-auto px-4 py-4 gap-4">

      <!-- Accept / Reject action bar -->
      <div v-if="doc" class="flex items-center gap-3">
        <button
          :disabled="stateLoading || doc.state === 'accepted'"
          class="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          @click="setState('accepted')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Aceptar
        </button>
        <button
          :disabled="stateLoading || doc.state === 'rejected'"
          class="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          @click="setState('rejected')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Rechazar
        </button>
        <span
          v-if="doc.state === 'accepted' || doc.state === 'rejected'"
          :class="doc.state === 'accepted' ? 'text-green-600' : 'text-red-600'"
          class="text-xs font-medium"
        >
          {{ doc.state === 'accepted' ? '&#10003; Aceptado' : '&#10005; Rechazado' }}
        </span>
      </div>
      <div v-if="doc" class="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm">
        <span><span class="font-semibold text-gray-700">Serie:</span> {{ doc.serie }}</span>
        <span v-if="doc.tipo"><span class="font-semibold text-gray-700">Tipo:</span> {{ doc.tipo }}</span>
        <span v-if="doc.observacion"><span class="font-semibold text-gray-700">Observación:</span> {{ doc.observacion }}</span>
        <span><span class="font-semibold text-gray-700">Tamaño:</span> {{ formatSize(doc.size) }}</span>
        <span v-if="doc.uploaded_by"><span class="font-semibold text-gray-700">Subido por:</span> {{ doc.uploaded_by }}</span>
        <span><span class="font-semibold text-gray-700">Fecha:</span> {{ formatDate(doc.uploaded_at) }}</span>
        <span
          :class="{
            'bg-yellow-100 text-yellow-700': doc.state === 'pending',
            'bg-green-100 text-green-700': doc.state === 'active' || doc.state === 'accepted',
            'bg-red-100 text-red-500': doc.state === 'rejected' || doc.state === 'deleted',
            'bg-indigo-100 text-indigo-700': doc.state === 'signed',
          }"
          class="rounded-full px-2 py-0.5 font-medium capitalize"
        >{{ { pending: 'Pendiente', active: 'Activo', accepted: 'Aceptado', rejected: 'Rechazado', deleted: 'Eliminado', signed: 'Firmado' }[doc.state] ?? doc.state }}</span>

        <!-- Download button -->
        <a
          :href="iframeUrl"
          download
          class="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
        >
          Descargar
        </a>

        <!-- Prev / Next navigation -->
        <div class="flex items-center gap-1">
          <button
            :disabled="!prevDoc"
            class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600
                   hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
            :title="prevDoc ? `Anterior: ${prevDoc.tipo ?? ''}` : ''"
            @click="prevDoc && navigateTo(prevDoc.id)"
          >
            &#8592; Anterior
          </button>
          <span class="text-xs text-gray-400">{{ currentIndex + 1 }} / {{ documents.length }}</span>
          <button
            :disabled="!nextDoc"
            class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600
                   hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
            :title="nextDoc ? `Siguiente: ${nextDoc.tipo ?? ''}` : ''"
            @click="nextDoc && navigateTo(nextDoc.id)"
          >
            Siguiente &#8594;
          </button>
        </div>
      </div>

      <!-- PDF viewer -->
      <div class="relative flex-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white"
           style="min-height: 70vh;">

        <!-- Spinner while iframe loads -->
        <div
          v-if="iframeLoading && !iframeError"
          class="absolute inset-0 flex items-center justify-center bg-white z-10"
        >
          <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>

        <!-- Error fallback -->
        <div
          v-if="iframeError"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-gray-500"
        >
          <p>No se pudo mostrar el documento en el navegador.</p>
          <a
            :href="iframeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >Abrir en nueva pestaña</a>
        </div>

        <iframe
          v-show="!iframeLoading && !iframeError"
          :src="iframeUrl"
          class="absolute inset-0 w-full h-full border-0"
          @load="iframeLoading = false"
          @error="iframeError = true; iframeLoading = false"
        />
      </div>
    </main>
  </div>
</template>
