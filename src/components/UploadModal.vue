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

// ── Searchable tipo dropdown ───────────────────────────────────────────────
const allTipos = ref<ApiDocumentType[]>([])
const tipoQuery = ref('')
const tipoSelected = ref<ApiDocumentType | null>(null)
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

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
  tipoSelected.value = t
  tipoQuery.value = ''
  dropdownOpen.value = false
}

function clearTipo() {
  tipoSelected.value = null
  tipoQuery.value = ''
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  if (file && file.type !== 'application/pdf') {
    errorMsg.value = 'Solo se permiten archivos PDF.'
    target.value = ''
    selectedFile.value = null
    return
  }
  selectedFile.value = file
  if (file) errorMsg.value = ''
}

async function upload() {
  if (!selectedFile.value) return

  isProcessing.value = true
  errorMsg.value = ''

  try {
    const content = await readAsBase64(selectedFile.value)
    const doc = await api.documents.upload(props.folderId, {
      filename: selectedFile.value.name,
      mime_type: selectedFile.value.type || 'application/octet-stream',
      content,
      observacion: observacion.value.trim() || undefined,
      tipo: tipoSelected.value?.nombre ?? undefined,
    })
    store.addToCache(props.folderId, doc)
    emit('close')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'No se pudo subir el archivo.'
  } finally {
    isProcessing.value = false
  }
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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
          accept="application/pdf"
          class="hidden"
          @change="onFileChange"
        />
        <template v-if="selectedFile">
          <p class="text-sm font-medium text-gray-800 truncate">{{ selectedFile.name }}</p>
          <p class="text-xs text-gray-400 mt-1">Hacé clic para cambiar el archivo</p>
        </template>
        <template v-else>
          <svg class="mx-auto w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor"
            stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021
                 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p class="text-sm text-gray-500">Hacé clic para seleccionar un archivo</p>
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
            class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50
                   hover:text-indigo-700 transition"
            :class="tipoSelected?.id === t.id ? 'bg-indigo-50 text-indigo-700 font-medium' : ''"
            @mousedown.prevent="selectTipo(t)"
          >
            {{ t.nombre }}
          </button>
        </div>
      </div>

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

      <!-- Actions -->
      <div class="mt-5 flex gap-2 justify-end">
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
                 transition focus:outline-none"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          :disabled="!selectedFile || isProcessing"
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
