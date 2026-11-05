<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'
import UploadModal from '../components/UploadModal.vue'
import SignModal from '../components/SignModal.vue'
import BitacoraModal from '../components/BitacoraModal.vue'
import FolderDetailModal from '../components/FolderDetailModal.vue'
import SendMailModal from '../components/SendMailModal.vue'
import SendAduanaModal from '../components/SendAduanaModal.vue'
import { api, type ApiFolder, type ApiDocument, type ApiDocumentType } from '../api'

const route = useRoute()
const router = useRouter()
const store = useFolderStore()

const folderId = computed(() => decodeURIComponent(route.params.id as string))
const documents = computed(() => store.getDocuments(folderId.value))
const pendingCount = computed(() => documents.value.filter(d => d.state === 'pending').length)

const showUpload = ref(false)
const showSign = ref(false)
const showBitacora = ref(false)
const showDetail = ref(false)
const showSendMail = ref(false)
const showSendAduana = ref(false)
const signing = ref(false)
const downloading = ref(false)
const downloadingFirma = ref(false)
const togglingState = ref(false)
const folder = ref<ApiFolder | null>(null)
const checklistRows = computed(() => {
  const items = folder.value?.checklist_types ?? []
  const present = new Set(
    documents.value
      .filter(d => d.state !== 'deleted' && d.tipo?.trim())
      .map(d => d.tipo!.trim().toLowerCase()),
  )
  return items.map(item => ({
    id: item.id,
    nombre: item.nombre,
    fulfilled: present.has(item.nombre.trim().toLowerCase()),
  }))
})
const checklistDoneCount = computed(() => checklistRows.value.filter(item => item.fulfilled).length)
const checklistBlocksSign = computed(() => checklistRows.value.some(item => !item.fulfilled))
const isClosed = computed(() => folder.value?.state === 'closed')

const documentTypes = ref<ApiDocumentType[]>([])
const tipoQuery = ref('')
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)
const checklistSaving = ref(false)
const checklistError = ref('')

const availableTypes = computed(() => {
  const selected = new Set(checklistRows.value.map(item => item.id))
  const q = tipoQuery.value.trim().toLowerCase()
  return documentTypes.value.filter(tipo => {
    if (selected.has(tipo.id)) return false
    return !q || tipo.nombre.toLowerCase().includes(q)
  })
})
const clientLabel = computed(() =>
  folder.value?.client ? `${folder.value.client.rut} — ${folder.value.client.razon_social}` : undefined
)

onMounted(async () => {
  store.fetchDocuments(folderId.value)
  try { folder.value = await api.folders.get(folderId.value) } catch { /* ignore */ }
  try { documentTypes.value = await api.documentTypes.listActive() } catch { documentTypes.value = [] }
  document.addEventListener('mousedown', onChecklistOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onChecklistOutsideClick)
})

function onChecklistOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

async function saveChecklist(ids: number[]) {
  if (!folder.value || isClosed.value || checklistSaving.value) return
  checklistSaving.value = true
  checklistError.value = ''
  try {
    folder.value = await api.folders.updateChecklist(folderId.value, ids.join(','))
  } catch (e: unknown) {
    checklistError.value = e instanceof Error ? e.message : 'No se pudo actualizar la checklist.'
  } finally {
    checklistSaving.value = false
  }
}

function addChecklistType(tipo: ApiDocumentType) {
  if (checklistRows.value.some(item => item.id === tipo.id)) return
  tipoQuery.value = ''
  dropdownOpen.value = false
  saveChecklist([...checklistRows.value.map(item => item.id), tipo.id])
}

function removeChecklistType(id: number) {
  saveChecklist(checklistRows.value.filter(item => item.id !== id).map(item => item.id))
}

async function handleDelete(docId: string) {
  try {
    await store.deleteDocument(folderId.value, docId)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo eliminar el documento.')
  }
}

function openClassify(doc: ApiDocument) {
  router.push(`/folder/${encodeURIComponent(folderId.value)}/document/${encodeURIComponent(doc.id)}/classify`)
}

function openSign() {
  if (signing.value || !folder.value || checklistBlocksSign.value) return
  showSign.value = true
}

async function handleSign() {
  if (checklistBlocksSign.value) {
    showSign.value = false
    return
  }
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
    <div v-if="folder" class="max-w-7xl mx-auto px-4 pt-4 flex flex-wrap items-center gap-3">
      <span
        :class="folder.operacion === 'exportacion' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'"
        class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
      >{{ folder.operacion === 'exportacion' ? 'Exportación' : 'Importación' }}</span>
      <span v-if="folder.numero_aceptacion" class="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium">
        N° Aceptación: {{ folder.numero_aceptacion }}
      </span>
      <p v-if="folder.fecha_aceptacion" class="text-xs text-gray-500">
        Aceptación el <time :datetime="folder.fecha_aceptacion" class="font-medium text-gray-700">{{ formatDate(folder.fecha_aceptacion) }}</time>
      </p>
      <p v-if="folder.closed_at" class="text-xs text-gray-500">
        Cerrada el <time :datetime="folder.closed_at" class="font-medium text-gray-700">{{ formatDateTime(folder.closed_at) }}</time>
      </p>
    </div>

    <!-- Action bar -->
    <div class="max-w-7xl mx-auto px-4 pt-4 flex items-center justify-end gap-2">
      <!-- Enviar a Aduana -->
      <button
        :disabled="folder?.state !== 'closed'"
        :title="folder?.state !== 'closed' ? 'La carpeta debe estar firmada para poder enviarse a Aduana' : 'Enviar a Aduana'"
        class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700
               hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
        @click="showSendAduana = true"
      >
        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5" />
        </svg>
        Enviar a Aduana
      </button>
      <!-- Enviar por mail -->
      <button
        class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700
               hover:bg-gray-50 transition flex items-center gap-1.5 cursor-pointer"
        @click="showSendMail = true"
      >
        <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        Enviar por Mail
      </button>
      <!-- Ver Detalle -->
      <button
        v-if="folder"
        class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700
               hover:bg-gray-50 transition flex items-center gap-1.5 cursor-pointer"
        @click="showDetail = true"
      >
        <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        Ver Detalle
      </button>
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
        {{ downloading ? 'Descargando…' : 'Descargar' }}
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
        :disabled="signing || !folder || checklistBlocksSign"
        :title="checklistBlocksSign ? 'Completá la checklist antes de firmar' : 'Firmar la carpeta'"
        class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700
               hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
        @click="openSign"
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
    <main class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex flex-col lg:flex-row gap-4 items-start">
      <div class="flex-1 min-w-0 w-full">
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
                <td class="px-4 py-3 whitespace-nowrap space-x-2">
                  <button
                    v-if="!isClosed && doc.state !== 'deleted'"
                    class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    @click="openClassify(doc)"
                  >
                    Clasificar
                  </button>
                  <button
                    v-if="!isClosed && doc.state !== 'deleted'"
                    class="text-xs font-medium text-red-500 hover:text-red-700 transition cursor-pointer"
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
      </div>

      <aside class="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-4">
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="text-sm font-semibold text-gray-800">Checklist</h2>
            <span v-if="checklistRows.length" class="text-xs font-medium text-gray-400">
              {{ checklistDoneCount }} de {{ checklistRows.length }}
            </span>
          </div>

          <div v-if="folder && !isClosed" ref="dropdownRef" class="relative mb-3">
            <input
              v-model="tipoQuery"
              type="text"
              :disabled="checklistSaving"
              placeholder="Agregar tipo…"
              class="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 disabled:opacity-50 transition"
              @focus="dropdownOpen = true"
              @input="dropdownOpen = true"
            />
            <ul
              v-if="dropdownOpen"
              class="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200
                     bg-white shadow-lg"
            >
              <li v-if="documentTypes.length === 0" class="px-3 py-2 text-xs text-gray-400">
                No hay tipos configurados.
              </li>
              <li v-else-if="availableTypes.length === 0" class="px-3 py-2 text-xs text-gray-400">
                Sin resultados.
              </li>
              <li v-for="tipo in availableTypes" :key="tipo.id">
                <button
                  type="button"
                  class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 transition"
                  @mousedown.prevent="addChecklistType(tipo)"
                >
                  {{ tipo.nombre }}
                </button>
              </li>
            </ul>
          </div>

          <p v-if="!folder" class="text-xs text-gray-400">Cargando…</p>
          <p v-else-if="checklistRows.length === 0" class="text-xs text-gray-400 leading-relaxed">
            Esta carpeta no tiene tipos de documento requeridos.
          </p>
          <ul v-else class="space-y-2">
            <li
              v-for="item in checklistRows"
              :key="item.id"
              class="flex items-start gap-2"
            >
              <span
                class="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                :class="item.fulfilled
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-gray-300 bg-white text-transparent'"
                aria-hidden="true"
              >
                <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span
                class="min-w-0 flex-1 text-sm leading-5"
                :class="item.fulfilled ? 'text-gray-700' : 'text-gray-800'"
              >
                <span class="sr-only">{{ item.fulfilled ? 'Cumplido: ' : 'Pendiente: ' }}</span>
                {{ item.nombre }}
              </span>
              <button
                v-if="!isClosed"
                type="button"
                class="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition"
                :disabled="checklistSaving"
                :aria-label="`Quitar ${item.nombre}`"
                @click="removeChecklistType(item.id)"
              >
                Quitar
              </button>
            </li>
          </ul>

          <p v-if="checklistError" class="mt-3 text-xs text-red-600">{{ checklistError }}</p>

          <p
            v-if="checklistBlocksSign && folder?.state !== 'closed'"
            class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-800"
          >
            Faltan documentos de la checklist. No se puede firmar la carpeta hasta completarlos.
          </p>
        </div>
      </aside>
      </div>
    </main>

    <!-- Modals -->
    <FolderDetailModal
      v-if="showDetail && folder"
      :folder="folder"
      @close="showDetail = false"
    />
    <UploadModal
      v-if="showUpload"
      :folder-id="folderId"
      @close="showUpload = false"
    />
    <SignModal
      v-if="showSign"
      :folder-id="folderId"
      :pending-count="pendingCount"
      :agent="folder?.agent"
      @close="showSign = false"
      @confirmed="handleSign"
    />
    <BitacoraModal
      v-if="showBitacora"
      :folder-id="folderId"
      @close="showBitacora = false"
    />
    <SendMailModal
      v-if="showSendMail"
      :folder-id="folderId"
      :folder-name="folder?.numero_despacho"
      @close="showSendMail = false"
    />
    <SendAduanaModal
      v-if="showSendAduana"
      :folder-id="folderId"
      :despacho="folder?.numero_despacho"
      :folder-state="folder?.state"
      @close="showSendAduana = false"
    />
  </div>
</template>
