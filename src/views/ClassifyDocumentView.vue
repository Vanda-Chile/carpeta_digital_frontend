<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiFolder, type ApiDocument, type ApiDocumentType } from '../api'

const route = useRoute()
const router = useRouter()
const store = useFolderStore()

const folderId = computed(() => decodeURIComponent(route.params.id as string))
const docId = computed(() => decodeURIComponent(route.params.docId as string))

const folder = ref<ApiFolder | null>(null)
const documents = computed(() => store.getDocuments(folderId.value))
const doc = computed<ApiDocument | null>(() => {
  return documents.value.find(d => d.id === docId.value) ?? null
})

const isClosed = computed(() => folder.value?.state === 'closed')

// Types state
const allTipos = ref<ApiDocumentType[]>([])
const selectedTipo = ref<string>('')
const searchQuery = ref('')
const loadingTipos = ref(false)

// Save state
const isSaving = ref(false)
const saveSuccess = ref(false)
const errorMessage = ref('')

// Preview state
const iframeUrl = ref('')
const iframeLoading = ref(true)
const iframeError = ref(false)

const takenTypes = computed(() => store.takenDocumentTypes(folderId.value, docId.value))

function isTypeTaken(nombre: string): boolean {
  return takenTypes.value.has(nombre.trim().toLowerCase())
}

const filteredTipos = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allTipos.value
  return allTipos.value.filter(t => t.nombre.toLowerCase().includes(q))
})

const hasChanges = computed(() => {
  if (!doc.value) return false
  return selectedTipo.value !== (doc.value.tipo ?? '')
})

async function loadDocumentUrl() {
  if (!folderId.value || !docId.value) return
  iframeLoading.value = true
  iframeError.value = false
  try {
    const res = await api.documents.getUrl(folderId.value, docId.value)
    iframeUrl.value = res.url
  } catch (e: unknown) {
    console.error('Error loading document preview URL:', e)
    iframeError.value = true
  } finally {
    iframeLoading.value = false
  }
}

onMounted(async () => {
  // Load folder info
  try {
    folder.value = await api.folders.get(folderId.value)
  } catch (e) {
    console.error('Error loading folder:', e)
  }

  // Load documents if not cached
  if (store.getDocuments(folderId.value).length === 0) {
    await store.fetchDocuments(folderId.value)
  }

  // Set initial selected type from current document
  if (doc.value?.tipo) {
    selectedTipo.value = doc.value.tipo
  }

  // Load active document types
  loadingTipos.value = true
  try {
    allTipos.value = await api.documentTypes.listActive()
  } catch (e) {
    console.error('Error loading document types:', e)
  } finally {
    loadingTipos.value = false
  }

  // Load document preview URL
  loadDocumentUrl()
})

function selectTipo(tipoName: string) {
  if (isClosed.value || isTypeTaken(tipoName)) return
  selectedTipo.value = tipoName
  errorMessage.value = ''
}

async function handleSave() {
  if (!selectedTipo.value) {
    errorMessage.value = 'Por favor seleccioná un tipo de documento.'
    return
  }
  if (isClosed.value) {
    errorMessage.value = 'La carpeta está cerrada y no permite modificaciones.'
    return
  }
  if (isTypeTaken(selectedTipo.value)) {
    errorMessage.value = 'Ya existe un documento de este tipo en la carpeta.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    await store.updateDocumentType(folderId.value, docId.value, selectedTipo.value)
    saveSuccess.value = true
    setTimeout(() => {
      router.push(`/folder/${encodeURIComponent(folderId.value)}`)
    }, 1000)
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : 'No se pudo actualizar el tipo de documento.'
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push(`/folder/${encodeURIComponent(folderId.value)}`)
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatSize(bytes?: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
    <AppHeader
      show-back
      :subtitle="`Clasificar Documento • Despacho N° ${folder?.numero_despacho ?? folderId}`"
      @back="goBack"
    />

    <!-- Main Container -->
    <main class="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
      
      <!-- Top Navigation & Summary Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 text-xs font-semibold transition cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver a la carpeta
          </button>
          <div class="h-4 w-px bg-slate-200"></div>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="font-bold text-slate-900 font-mono">Serie {{ doc?.serie ?? '—' }}</span>
            <span>•</span>
            <span>Despacho <strong class="text-slate-700">{{ folder?.numero_despacho ?? folderId }}</strong></span>
            <span v-if="folder?.client">•</span>
            <span v-if="folder?.client" class="text-slate-600 truncate max-w-xs">{{ folder.client.razon_social }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span
            :class="{
              'bg-amber-100 text-amber-800 border-amber-200': doc?.state === 'pending',
              'bg-emerald-100 text-emerald-800 border-emerald-200': doc?.state === 'active' || doc?.state === 'accepted',
              'bg-rose-100 text-rose-700 border-rose-200': doc?.state === 'rejected' || doc?.state === 'deleted',
              'bg-indigo-100 text-indigo-800 border-indigo-200': doc?.state === 'signed',
            }"
            class="rounded-full px-2.5 py-0.5 font-semibold capitalize border"
          >
            {{ { pending: 'Pendiente', active: 'Activo', accepted: 'Aceptado', rejected: 'Rechazado', deleted: 'Eliminado', signed: 'Firmado' }[doc?.state ?? ''] ?? doc?.state }}
          </span>
          <span class="text-slate-400">|</span>
          <span class="text-slate-500">{{ formatSize(doc?.size) }}</span>
        </div>
      </div>

      <!-- Closed folder warning -->
      <div v-if="isClosed" class="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 text-xs flex items-center gap-3">
        <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <strong class="font-semibold">Carpeta cerrada:</strong>
          La carpeta ya se encuentra firmada y cerrada. No se pueden modificar los tipos de documentos.
        </div>
      </div>

      <!-- Split Layout (Left: Classification & Types | Right: Preview) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">

        <!-- ── LEFT COLUMN: Document Type & Selection (5 of 12 cols) ── -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          
          <!-- Classification Card -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col gap-4">
            <div>
              <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                Clasificación del Documento
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Seleccioná el tipo correspondiente para este archivo digitalizado.
              </p>
            </div>

            <!-- Current Type Card -->
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Tipo Actual Asignado</span>
                <span class="text-xs font-bold text-slate-800">{{ doc?.tipo || 'Sin clasificar' }}</span>
              </div>
              <span
                v-if="doc?.tipo"
                class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold text-[11px]"
              >
                Asignado
              </span>
              <span
                v-else
                class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold text-[11px]"
              >
                Pendiente
              </span>
            </div>

            <!-- Prospective Selected Type Banner -->
            <div
              v-if="selectedTipo && selectedTipo !== doc?.tipo"
              class="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between animate-fade-in"
            >
              <div>
                <span class="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">Nuevo Tipo Seleccionado</span>
                <span class="text-xs font-bold text-indigo-950">{{ selectedTipo }}</span>
              </div>
              <span class="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[10px] tracking-wide">
                POR GUARDAR
              </span>
            </div>

            <!-- Search Filter -->
            <div>
              <label for="search-tipo" class="block text-xs font-bold text-slate-700 mb-1.5">
                Lista de Tipos de Documentos Disponibles
              </label>
              <div class="relative">
                <input
                  id="search-tipo"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Buscar tipo de documento..."
                  :disabled="isClosed"
                  class="w-full rounded-xl border border-slate-300 pl-9 pr-8 py-2.5 text-xs text-slate-800 placeholder-slate-400
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition disabled:bg-slate-100"
                />
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <button
                  v-if="searchQuery"
                  @click="searchQuery = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                <span>{{ filteredTipos.length }} de {{ allTipos.length }} tipos</span>
                <span v-if="selectedTipo" class="text-indigo-600 font-medium truncate max-w-[200px]">
                  Seleccionado: {{ selectedTipo }}
                </span>
              </div>
            </div>

            <!-- List of Types -->
            <div class="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div v-if="loadingTipos" class="py-12 flex justify-center items-center">
                <svg class="animate-spin w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div
                v-else-if="filteredTipos.length === 0"
                class="p-8 text-center text-xs text-slate-400"
              >
                No se encontraron tipos con el término "<strong class="text-slate-600">{{ searchQuery }}</strong>"
              </div>
              <div v-else class="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
                <button
                  v-for="t in filteredTipos"
                  :key="t.id"
                  type="button"
                  :disabled="isClosed || isTypeTaken(t.nombre)"
                  @click="selectTipo(t.nombre)"
                  :class="[
                    isClosed ? 'opacity-50' : '',
                    isTypeTaken(t.nombre)
                      ? 'text-slate-400 cursor-not-allowed'
                      : selectedTipo.toLowerCase() === t.nombre.toLowerCase()
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-medium cursor-pointer',
                  ]"
                  class="w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition flex items-center justify-between gap-2 disabled:cursor-not-allowed"
                >
                  <span class="truncate">{{ t.nombre }}</span>
                  <span
                    v-if="isTypeTaken(t.nombre)"
                    class="shrink-0 text-[10px] font-semibold uppercase tracking-wide"
                  >Ya existe</span>
                  <svg
                    v-else-if="selectedTipo.toLowerCase() === t.nombre.toLowerCase()"
                    class="w-4 h-4 text-white shrink-0"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Error message -->
            <p v-if="errorMessage" class="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-3 rounded-xl">
              {{ errorMessage }}
            </p>

            <!-- Success message -->
            <p v-if="saveSuccess" class="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ¡Clasificación guardada exitosamente! Redirigiendo...
            </p>

            <!-- Action buttons -->
            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                @click="goBack"
                class="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="isSaving || !hasChanges || isClosed || saveSuccess"
                @click="handleSave"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <svg v-if="isSaving" class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <svg v-else class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {{ isSaving ? 'Guardando…' : 'Guardar Clasificación' }}
              </button>
            </div>

          </div>

          <!-- Document Metadata Info Card -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Metadatos del Documento
            </h3>
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Serie</span>
                <span class="font-semibold text-slate-800">{{ doc?.serie ?? '—' }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Tamaño</span>
                <span class="font-semibold text-slate-800">{{ formatSize(doc?.size) }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Fecha Subida</span>
                <span class="font-semibold text-slate-800">{{ formatDate(doc?.uploaded_at) }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Subido Por</span>
                <span class="font-semibold text-slate-800 truncate block">{{ doc?.uploaded_by || '—' }}</span>
              </div>
            </div>
            <div v-if="doc?.observacion" class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Observación</span>
              <span class="text-slate-700">{{ doc.observacion }}</span>
            </div>
          </div>

        </div>

        <!-- ── RIGHT COLUMN: Document Preview (7 of 12 cols) ── -->
        <div class="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden" style="min-height: 720px;">
          
          <!-- Preview Header Bar -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/80">
            <div class="flex items-center gap-2 text-xs text-slate-700 font-semibold">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span>Vista Previa del Documento</span>
              <span v-if="doc?.serie" class="font-mono text-slate-400 font-normal">({{ `00${doc.serie}`.slice(-3) }})</span>
            </div>

            <div class="flex items-center gap-2">
              <a
                v-if="iframeUrl"
                :href="iframeUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                title="Abrir en pestaña nueva"
              >
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Pestaña Nueva
              </a>
              <a
                v-if="iframeUrl"
                :href="iframeUrl"
                download
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition"
                title="Descargar documento"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Descargar
              </a>
            </div>
          </div>

          <!-- Preview Frame Area -->
          <div class="relative flex-1 bg-slate-100 min-h-[640px]">
            <!-- Spinner -->
            <div
              v-if="iframeLoading && !iframeError"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10"
            >
              <svg class="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span class="text-xs text-slate-500 font-medium">Cargando vista previa del documento...</span>
            </div>

            <!-- Error fallback -->
            <div
              v-if="iframeError"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-sm text-slate-500 bg-white p-6 text-center"
            >
              <div class="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p class="font-semibold text-slate-800">No se pudo cargar la vista previa directa</p>
              <p class="text-xs text-slate-400 max-w-sm">Podés abrir el documento en una nueva pestaña o descargarlo directamente.</p>
              <div class="flex items-center gap-2 mt-2">
                <a
                  v-if="iframeUrl"
                  :href="iframeUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Abrir en nueva pestaña
                </a>
                <button
                  @click="loadDocumentUrl"
                  class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Reintentar
                </button>
              </div>
            </div>

            <!-- Iframe preview -->
            <iframe
              v-show="!iframeLoading && !iframeError"
              :src="iframeUrl"
              class="w-full h-full border-0 absolute inset-0"
              @load="iframeLoading = false"
              @error="iframeError = true; iframeLoading = false"
            />
          </div>

        </div>

      </div>

    </main>
  </div>
</template>
