<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiObservation } from '../api'

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

// Observations state
const showObsModal = ref(false)
const obsText = ref('')
const obsError = ref('')
const savingObs = ref(false)
const observationsList = ref<ApiObservation[]>([])
const loadingObsList = ref(false)

async function fetchObservations() {
  if (!docId.value) return
  loadingObsList.value = true
  try {
    observationsList.value = await api.documents.listObservations(folderId.value, docId.value)
  } catch (e: unknown) {
    console.error('Error fetching observations:', e)
  } finally {
    loadingObsList.value = false
  }
}

async function handleSaveObservation() {
  obsError.value = ''
  const text = obsText.value.trim()
  if (!text) {
    obsError.value = 'Por favor ingresá un texto para la observación.'
    return
  }
  savingObs.value = true
  try {
    await api.documents.addObservation(folderId.value, docId.value, text)
    obsText.value = ''
    showObsModal.value = false
    await fetchObservations()
  } catch (e: unknown) {
    obsError.value = e instanceof Error ? e.message : 'Error al guardar la observación'
  } finally {
    savingObs.value = false
  }
}

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

// Reset iframe state and fetch observations when navigating between documents
watch(docId, () => {
  iframeLoading.value = true
  iframeError.value = false
  fetchObservations()
})

onMounted(async () => {
  if (store.getDocuments(folderId.value).length === 0) {
    await store.fetchDocuments(folderId.value)
  }
  fetchObservations()
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
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

    <main class="flex flex-col flex-1 max-w-7xl w-full mx-auto px-4 py-4 gap-4">

      <!-- Accept / Reject action bar -->
      <div v-if="doc" class="flex items-center gap-3">
        <button
          :disabled="stateLoading || doc.state === 'accepted'"
          class="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          @click="setState('accepted')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Aceptar
        </button>

        <!-- Observacion button (in between Aceptar and Rechazar) -->
        <button
          class="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-amber-600 transition cursor-pointer"
          @click="showObsModal = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Observación
        </button>

        <button
          :disabled="stateLoading || doc.state === 'rejected'"
          class="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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

      <!-- Saved Observations list section -->
      <div v-if="observationsList.length > 0" class="bg-amber-50/50 rounded-xl border border-amber-200 p-4 shadow-sm">
        <h3 class="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Observaciones del Documento ({{ observationsList.length }})
        </h3>
        <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
          <div
            v-for="obs in observationsList"
            :key="obs.id"
            class="bg-white rounded-lg border border-amber-100 p-3 text-xs text-gray-800 shadow-2xs flex flex-col gap-1"
          >
            <div class="flex items-center justify-between text-gray-500 font-medium">
              <span>{{ obs.user_name || 'Usuario' }}</span>
              <span>{{ formatDateTime(obs.created_at) }}</span>
            </div>
            <p class="text-gray-800 font-normal whitespace-pre-wrap">{{ obs.text }}</p>
          </div>
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

    <!-- Add Observation Modal -->
    <div
      v-if="showObsModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showObsModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 class="text-base font-semibold text-gray-800">Agregar Observación</h2>
          </div>
          <button class="text-gray-400 hover:text-gray-600 transition" @click="showObsModal = false" aria-label="Cerrar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p class="text-xs text-gray-500">
          Agregá una observación para este documento. Esta acción <strong>no modifica</strong> el estado del documento.
        </p>

        <form @submit.prevent="handleSaveObservation" class="flex flex-col gap-3">
          <div>
            <label for="obs-text" class="block text-xs font-semibold text-gray-700 mb-1">Observación</label>
            <textarea
              id="obs-text"
              v-model="obsText"
              rows="4"
              required
              placeholder="Escribí aquí las observaciones del documento..."
              class="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-800 placeholder-gray-400
                     focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition resize-y"
            ></textarea>
          </div>

          <p v-if="obsError" class="text-xs text-red-500 font-medium">{{ obsError }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              @click="showObsModal = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="savingObs"
              class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
            >
              <svg v-if="savingObs" class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {{ savingObs ? 'Guardando…' : 'Guardar Observación' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
