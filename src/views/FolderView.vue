<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'
import UploadModal from '../components/UploadModal.vue'
import SignModal from '../components/SignModal.vue'
import BitacoraModal from '../components/BitacoraModal.vue'
import { api, type ApiFolder } from '../api'

const route = useRoute()
const router = useRouter()
const store = useFolderStore()

const folderId = computed(() => decodeURIComponent(route.params.id as string))
const documents = computed(() => store.getDocuments(folderId.value))
const pendingCount = computed(() => documents.value.filter(d => d.state === 'pending').length)

const showUpload = ref(false)
const showSign = ref(false)
const showBitacora = ref(false)
const signing = ref(false)
const downloading = ref(false)
const downloadingFirma = ref(false)
const togglingState = ref(false)
const folder = ref<ApiFolder | null>(null)
const isClosed = computed(() => folder.value?.state === 'closed')
const clientLabel = computed(() =>
  folder.value?.client ? `${folder.value.client.rut} — ${folder.value.client.razon_social}` : undefined
)

onMounted(async () => {
  store.fetchDocuments(folderId.value)
  try { folder.value = await api.folders.get(folderId.value) } catch { /* ignore */ }})

async function handleDelete(docId: string) {
  try {
    await store.deleteDocument(folderId.value, docId)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo eliminar el documento.')
  }
}

async function handleSign() {
  showSign.value = false
  signing.value = true
  try {
    await store.signFolder(folderId.value)
    folder.value = await api.folders.get(folderId.value)
    store.fetchDocuments(folderId.value)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo firmar la carpeta.')
  } finally {
    signing.value = false
  }
}

async function handleDownload() {
  downloading.value = true
  try {
    const name = folder.value?.numero_despacho ?? folderId.value
    await api.folders.downloadZip(folderId.value, `${name}.zip`)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo descargar la carpeta.')
  } finally {
    downloading.value = false
  }
}

async function handleDownloadFirma() {
  downloadingFirma.value = true
  try {
    const name = folder.value?.numero_despacho ?? folderId.value
    await api.folders.downloadFirma(folderId.value, `${name}_firma.zip`)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo descargar los archivos firmados.')
  } finally {
    downloadingFirma.value = false
  }
}

async function toggleFolderState() {
  if (!folder.value || togglingState.value) return
  togglingState.value = true
  try {
    const newState = folder.value.state === 'open' ? 'closed' : 'open'
    await store.setFolderState(folderId.value, newState)
    folder.value = { ...folder.value, state: newState }
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo cambiar el estado.')
  } finally {
    togglingState.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader
      show-back
      :subtitle="folder?.numero_despacho ?? folderId"
      :subtitle2="clientLabel"
      @back="router.push('/')"
      @upload="() => { if (!isClosed) showUpload = true }"
    />

    <!-- Closure date banner -->
    <div v-if="folder" class="max-w-5xl mx-auto px-4 pt-4 flex items-center gap-3">
      <span
        :class="folder.operacion === 'exportacion' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'"
        class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
      >{{ folder.operacion === 'exportacion' ? 'Exportación' : 'Importación' }}</span>
      <p v-if="folder.closed_at" class="text-xs text-gray-500">
        Cerrada el <time :datetime="folder.closed_at" class="font-medium text-gray-700">{{ formatDateTime(folder.closed_at) }}</time>
      </p>
    </div>

    <!-- Action bar -->
    <div class="max-w-5xl mx-auto px-4 pt-4 flex items-center justify-end gap-2">
      <!-- Bitácora -->
      <button
        class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700
               hover:bg-gray-50 transition flex items-center gap-1.5"
        @click="showBitacora = true"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        Bitácora
      </button>
      <!-- Folder state toggle -->
      <button
        v-if="folder"
        :disabled="togglingState"
        :class="folder.state === 'open'
          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
        class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition
               disabled:opacity-40 flex items-center gap-1.5"
        @click="toggleFolderState"
      >
        <span class="inline-block w-1.5 h-1.5 rounded-full"
          :class="folder.state === 'open' ? 'bg-green-500' : 'bg-gray-400'"
        />
        {{ folder.state === 'open' ? 'Abierta' : 'Cerrada' }}
      </button>
      <button
        :disabled="downloading"
        class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700
               hover:bg-gray-50 disabled:opacity-40 transition flex items-center gap-1.5"
        @click="handleDownload"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {{ downloading ? 'Descargando…' : 'Descargar Archivos' }}
      </button>
      <!-- Download signed XMLs — shown only when folder is already signed/closed -->
      <button
        v-if="folder?.state === 'closed'"
        :disabled="downloadingFirma"
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700
               hover:bg-emerald-100 disabled:opacity-40 transition flex items-center gap-1.5"
        @click="handleDownloadFirma"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        {{ downloadingFirma ? 'Descargando…' : 'Descargar Carpeta' }}
      </button>
      <!-- Sign button — hidden once folder is signed/closed -->
      <button
        v-if="folder?.state !== 'closed'"
        :disabled="signing"
        class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700
               hover:bg-indigo-100 disabled:opacity-40 transition flex items-center gap-1.5"
        @click="showSign = true"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
        {{ signing ? 'Firmando…' : 'Firmar' }}
      </button>
      <button
        v-if="!isClosed"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white
               hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        @click="showUpload = true"
      >
        + Subir
      </button>
    </div>

    <!-- Content -->
    <main class="max-w-5xl mx-auto px-4 py-4">
      <!-- Loading -->
      <template v-if="store.loading">
        <div class="flex justify-center py-24">
          <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="store.error">
        <p class="text-center py-12 text-sm text-red-500">{{ store.error }}</p>
      </template>

      <!-- Empty state -->
      <template v-else-if="documents.length === 0">
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5"
              viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0
                   01 13.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 11.625h4.5m-4.5
                   3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504
                   1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p class="text-sm font-medium text-gray-500">Aún no hay documentos</p>
          <p class="text-xs text-gray-400 mt-1">Subí un archivo para comenzar</p>
          <button
            v-if="!isClosed"
            class="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                   hover:bg-indigo-700 transition"
            @click="showUpload = true"
          >
            Subir documento
          </button>
        </div>
      </template>

      <!-- Document table -->
      <template v-else>
        <p class="text-xs text-gray-400 mb-3">
          {{ documents.length }} {{ documents.length === 1 ? 'documento' : 'documentos' }}
        </p>
        <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table class="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Serie</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Observación</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tamaño</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Subido por</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha Creación</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha Firma</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="doc in documents" :key="doc.id" class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-center font-mono text-xs font-semibold text-indigo-600 whitespace-nowrap">{{ doc.serie }}</td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/folder/${encodeURIComponent(doc.folder_id)}/document/${encodeURIComponent(doc.id)}`"
                    class="font-medium text-indigo-600 hover:underline truncate block max-w-xs"
                  >{{ doc.tipo ?? '—' }}</router-link>
                </td>
                <td class="px-4 py-3 text-gray-500 max-w-xs">
                  <span class="line-clamp-2" :title="doc.observacion ?? ''">
                    {{ doc.observacion ?? '—' }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    :class="{
                      'bg-yellow-100 text-yellow-700': doc.state === 'pending',
                      'bg-green-100 text-green-700': doc.state === 'active' || doc.state === 'accepted',
                      'bg-red-100 text-red-500': doc.state === 'rejected' || doc.state === 'deleted',
                      'bg-indigo-100 text-indigo-700': doc.state === 'signed',
                    }"
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                  >{{ { pending: 'Pendiente', active: 'Activo', accepted: 'Aceptado', rejected: 'Rechazado', deleted: 'Eliminado', signed: 'Firmado' }[doc.state] ?? doc.state }}</span>
                </td>
                <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ formatSize(doc.size) }}</td>
                <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ doc.uploaded_by ?? '—' }}</td>
                <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ formatDate(doc.uploaded_at) }}</td>
                <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ doc.signed_at ? formatDateTime(doc.signed_at) : '—' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <button
                    class="text-xs font-medium text-red-500 hover:text-red-700 transition"
                    @click="handleDelete(doc.id)"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </main>

    <!-- Modals -->
    <UploadModal
      v-if="showUpload"
      :folder-id="folderId"
      @close="showUpload = false"
    />
    <SignModal
      v-if="showSign"
      :folder-id="folderId"
      :pending-count="pendingCount"
      @close="showSign = false"
      @confirmed="handleSign"
    />
    <BitacoraModal
      v-if="showBitacora"
      :folder-id="folderId"
      @close="showBitacora = false"
    />
  </div>
</template>
