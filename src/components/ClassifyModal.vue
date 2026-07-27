<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { api, type ApiDocument, type ApiDocumentType } from '../api'
import { useFolderStore } from '../stores/folderStore'

const props = defineProps<{
  folderId: string
  document: ApiDocument
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void
}>()

const store = useFolderStore()

const allTipos = ref<ApiDocumentType[]>([])
const tipoQuery = ref('')
const tipoSelected = ref<ApiDocumentType | null>(null)
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

const isProcessing = ref(false)
const errorMsg = ref('')

const filteredTipos = computed(() => {
  const q = tipoQuery.value.trim().toLowerCase()
  return q
    ? allTipos.value.filter(t => t.nombre.toLowerCase().includes(q))
    : allTipos.value
})

onMounted(async () => {
  try {
    allTipos.value = await api.documentTypes.listActive()
    // Preselect matching tipo if present in existing active types
    if (props.document.tipo) {
      const match = allTipos.value.find(t => t.nombre.toLowerCase() === props.document.tipo?.toLowerCase())
      if (match) tipoSelected.value = match
    }
  } catch { /* ignore */ }
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
  errorMsg.value = ''
}

function clearTipo() {
  tipoSelected.value = null
  tipoQuery.value = ''
}

async function handleSave() {
  if (!tipoSelected.value) {
    errorMsg.value = 'Debés seleccionar un tipo de documento existente de la lista.'
    return
  }

  errorMsg.value = ''
  isProcessing.value = true

  try {
    await store.updateDocumentType(props.folderId, props.document.id, tipoSelected.value.nombre)
    emit('updated')
    emit('close')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'No se pudo clasificar el documento.'
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    @click.self="emit('close')"
  >
    <!-- Modal Card -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div>
          <h2 class="text-base font-bold text-gray-900">Clasificar Documento</h2>
          <p class="text-xs text-gray-400 font-mono mt-0.5">Serie {{ props.document.serie }}</p>
        </div>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-600 transition rounded-lg p-1 hover:bg-gray-100 cursor-pointer"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">

        <!-- Error alert -->
        <div v-if="errorMsg" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
          {{ errorMsg }}
        </div>

        <!-- Current doc info -->
        <div class="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 text-xs text-indigo-900">
          <span class="font-medium text-indigo-700">Tipo actual:</span>
          <span class="ml-1 font-semibold">{{ props.document.tipo ?? 'Sin clasificar' }}</span>
        </div>

        <!-- Tipo Selector -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1.5">
            Seleccionar Tipo de Documento Existente
          </label>
          <div ref="dropdownRef" class="relative">
            <!-- Selected Pill / Clear trigger -->
            <div
              v-if="tipoSelected"
              class="flex items-center justify-between rounded-xl border border-indigo-300 bg-indigo-50/60 px-3.5 py-2.5 text-xs text-indigo-900 font-medium"
            >
              <span>{{ tipoSelected.nombre }}</span>
              <button
                type="button"
                @click="clearTipo"
                class="text-indigo-400 hover:text-indigo-700 font-bold ml-2 cursor-pointer"
                title="Cambiar tipo"
              >
                ✕
              </button>
            </div>

            <!-- Search Input -->
            <div v-else class="relative">
              <input
                v-model="tipoQuery"
                type="text"
                placeholder="Buscar tipo de documento existente..."
                @focus="dropdownOpen = true"
                @input="dropdownOpen = true"
                class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-indigo-500 transition"
              />
              <button
                type="button"
                @click="dropdownOpen = !dropdownOpen"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <!-- Dropdown Options -->
            <div
              v-if="dropdownOpen && !tipoSelected"
              class="absolute z-20 mt-1.5 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-xs"
            >
              <div v-if="filteredTipos.length === 0" class="px-3.5 py-2.5 text-gray-400">
                No se encontraron tipos coincidentes
              </div>
              <button
                v-for="t in filteredTipos"
                :key="t.id"
                type="button"
                @click="selectTipo(t)"
                class="w-full text-left px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-700 font-medium text-gray-700 transition cursor-pointer"
              >
                {{ t.nombre }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          type="button"
          @click="emit('close')"
          class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isProcessing || !tipoSelected"
          @click="handleSave"
          class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
        >
          {{ isProcessing ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>

    </div>
  </div>
</template>
