<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { api, type ApiDocumentType } from '../api'
import { useFolderStore } from '../stores/folderStore'

const props = defineProps<{ folderId: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const store = useFolderStore()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const observacion = ref('')
const isProcessing = ref(false)
const errorMsg = ref('')
const resolutionWarning = ref('')

// ── Searchable tipo dropdown ───────────────────────────────────────────────
const allTipos = ref<ApiDocumentType[]>([])
const tipoQuery = ref('')
const tipoSelected = ref<ApiDocumentType | null>(null)
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

const takenTypes = computed(() => store.takenDocumentTypes(props.folderId))

function isTypeTaken(nombre: string): boolean {
  return takenTypes.value.has(nombre.trim().toLowerCase())
}

const selectedTypeTaken = computed(() =>
  tipoSelected.value ? isTypeTaken(tipoSelected.value.nombre) : false,
)

const filteredTipos = computed(() => {
  const q = tipoQuery.value.toLowerCase()
  return q
    ? allTipos.value.filter(t => t.nombre.toLowerCase().includes(q))
    : allTipos.value
})

onMounted(async () => {
  try {
    allTipos.value = await api.documentTypes.listActive()
  } catch { /* non-critical */ }
  document.addEventListener('mousedown', onOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideClick)
})

function onOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

function selectTipo(t: ApiDocumentType) {
  if (isTypeTaken(t.nombre)) return
  tipoSelected.value = t
  tipoQuery.value = ''
  dropdownOpen.value = false
  errorMsg.value = ''
}

function clearTipo() {
  tipoSelected.value = null
  tipoQuery.value = ''
}

const PDF_ONLY = 'Solo se permiten archivos PDF/A.'
let fileCheck = 0

function isPdfCandidate(file: File): boolean {
  const name = file.name
  if (
    name !== name.trim()
    || !name.toLowerCase().endsWith('.pdf')
    || name.includes('/')
    || name.includes('\\')
  ) return false
  return file.type === '' || file.type === 'application/pdf' || file.type === 'application/octet-stream'
}

function hasPdfAid(text: string): boolean {
  return text.includes('http://www.aiim.org/pdfa/ns/id/') || text.includes('pdfaid:part')
}

async function inflateFlate(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null
  let data = bytes
  while (data.length && (data[data.length - 1] === 0x0a || data[data.length - 1] === 0x0d)) {
    data = data.subarray(0, data.length - 1)
  }
  try {
    const copy = data.slice()
    const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate'))
    const inflated = new Uint8Array(await new Response(stream).arrayBuffer())
    return new TextDecoder('latin1').decode(inflated)
  } catch {
    return null
  }
}

/** Rejects ordinary PDFs before upload. Undecodable metadata is left for the server. */
async function inspectPdfA(file: File): Promise<'pdfa' | 'not-pdf' | 'not-pdfa' | 'unknown'> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < 5) return 'not-pdf'
  const text = new TextDecoder('latin1').decode(bytes)
  if (!text.startsWith('%PDF-')) return 'not-pdf'
  if (hasPdfAid(text)) return 'pdfa'

  const metaRe = /\/Type\s*\/Metadata\b[\s\S]{0,1200}?stream\r?\n/g
  let undecoded = false
  let match: RegExpExecArray | null
  while ((match = metaRe.exec(text)) !== null) {
    const start = match.index + match[0].length
    const end = text.indexOf('endstream', start)
    if (end < 0) {
      undecoded = true
      continue
    }
    const raw = bytes.subarray(start, end)
    const chunk = match[0].includes('/FlateDecode')
      ? await inflateFlate(raw)
      : new TextDecoder('latin1').decode(raw)
    if (chunk == null) {
      undecoded = true
      continue
    }
    if (hasPdfAid(chunk)) return 'pdfa'
  }
  return undecoded ? 'unknown' : 'not-pdfa'
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  const check = ++fileCheck
  selectedFile.value = null
  errorMsg.value = ''
  resolutionWarning.value = ''
  if (!file) return
  if (!isPdfCandidate(file)) {
    errorMsg.value = PDF_ONLY
    target.value = ''
    return
  }
  const claim = await inspectPdfA(file)
  if (check !== fileCheck) return
  if (claim === 'not-pdf' || claim === 'not-pdfa') {
    errorMsg.value = PDF_ONLY
    target.value = ''
    return
  }
  selectedFile.value = file
}

async function upload() {
  if (!selectedFile.value || selectedTypeTaken.value) return

  isProcessing.value = true
  errorMsg.value = ''

  try {
    const filename = selectedFile.value.name
    const mime_type = 'application/pdf'

    // 1. Get GCS pre-signed upload URL
    const { upload_url, temp_path } = await api.documents.getUploadUrl(props.folderId, {
      filename,
      mime_type,
    })

    // 2. Upload directly to GCS
    await api.documents.uploadToGcs(upload_url, selectedFile.value, mime_type)

    // 3. Create document record and move file in GCS
    const doc = await api.documents.upload(props.folderId, {
      filename,
      temp_path,
      mime_type,
      observacion: observacion.value.trim() || undefined,
      tipo: tipoSelected.value?.nombre ?? undefined,
    })

    store.addToCache(props.folderId, doc)
    if (doc.resolution_warning) {
      resolutionWarning.value = doc.resolution_warning
      return
    }
    emit('close')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'No se pudo subir el archivo.'
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/40 z-20 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-base font-semibold text-gray-900">Subir documento</h2>
        <button
          class="text-gray-400 hover:text-gray-700 transition focus:outline-none"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Drop / select area -->
      <div
        class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer
               hover:border-indigo-400 hover:bg-indigo-50 transition"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,application/pdf"
          class="hidden"
          @change="onFileChange"
        />
        <template v-if="selectedFile">
          <p class="text-sm font-medium text-gray-800 truncate">{{ selectedFile.name }}</p>
          <p class="text-xs text-gray-400 mt-1">Haga click para cambiar el archivo</p>
        </template>
        <template v-else>
          <svg class="mx-auto w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor"
            stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021
                 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p class="text-sm text-gray-500">Haga click para seleccionar un archivo</p>
          <p class="text-xs text-gray-400 mt-1">Solo se acepta el formato PDF/A</p>
        </template>
      </div>

      <!-- Tipo field (searchable dropdown) -->
      <div class="mt-4 relative" ref="dropdownRef">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Tipo
          <span class="text-gray-400 font-normal">(opcional)</span>
        </label>

        <!-- Selected chip OR search input -->
        <div
          class="relative flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2
                 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition"
        >
          <!-- Selected badge -->
          <template v-if="tipoSelected">
            <span class="flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700
                         px-2.5 py-0.5 text-xs font-semibold shrink-0">
              {{ tipoSelected.nombre }}
              <button
                type="button"
                class="text-indigo-400 hover:text-indigo-700 focus:outline-none"
                aria-label="Quitar tipo"
                @click="clearTipo"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2"
                  viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </template>

          <!-- Search input -->
          <input
            v-model="tipoQuery"
            type="text"
            :placeholder="tipoSelected ? '' : 'Buscar tipo…'"
            :class="tipoSelected ? 'w-0 p-0 opacity-0' : 'flex-1'"
            class="text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            @focus="dropdownOpen = true"
            @input="dropdownOpen = true"
          />

          <!-- Chevron -->
          <svg
            class="w-4 h-4 text-gray-400 shrink-0 transition-transform"
            :class="dropdownOpen ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24" aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <!-- Dropdown list -->
        <div
          v-if="dropdownOpen"
          class="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200
                 bg-white shadow-lg py-1"
        >
          <p v-if="allTipos.length === 0" class="px-4 py-3 text-sm text-gray-400">
            No hay tipos configurados.
          </p>
          <template v-else-if="filteredTipos.length === 0">
            <p class="px-4 py-3 text-sm text-gray-400">Sin resultados para "{{ tipoQuery }}"</p>
          </template>
          <button
            v-for="t in filteredTipos"
            :key="t.id"
            type="button"
            :disabled="isTypeTaken(t.nombre)"
            class="w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between gap-2
                   disabled:cursor-not-allowed"
            :class="isTypeTaken(t.nombre)
              ? 'text-gray-400'
              : tipoSelected?.id === t.id
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'"
            @mousedown.prevent="selectTipo(t)"
          >
            <span class="truncate">{{ t.nombre }}</span>
            <span v-if="isTypeTaken(t.nombre)" class="shrink-0 text-xs font-medium">Ya existe</span>
          </button>
        </div>
      </div>
      <p v-if="selectedTypeTaken" class="mt-2 text-xs text-red-600">
        Ya existe un documento de este tipo en la carpeta.
      </p>

      <!-- Observacion field -->
      <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700 mb-1" for="doc-obs">
          Observación
          <span class="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="doc-obs"
          v-model="observacion"
          maxlength="250"
          rows="3"
          placeholder="Notas u observaciones sobre este documento…"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                 focus:border-indigo-500 transition resize-none"
        />
        <p class="text-right text-xs text-gray-400 mt-0.5">{{ observacion.length }}/250</p>
      </div>

      <!-- Error -->
      <p v-if="errorMsg" class="mt-2 text-xs text-red-600">{{ errorMsg }}</p>
      <p v-if="resolutionWarning" class="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
        {{ resolutionWarning }}
      </p>

      <!-- Actions -->
      <div class="mt-5 flex gap-2 justify-end">
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
                 transition focus:outline-none"
          @click="emit('close')"
        >
          {{ resolutionWarning ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button
          v-if="!resolutionWarning"
          :disabled="!selectedFile || isProcessing || selectedTypeTaken"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                 disabled:opacity-40 disabled:cursor-not-allowed"
          @click="upload"
        >
          {{ isProcessing ? 'Procesando…' : 'Subir' }}
        </button>
      </div>
    </div>
  </div>
</template>
