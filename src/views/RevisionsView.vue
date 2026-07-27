<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiRevision, type ApiObservation, type ApiDocumentType } from '../api'

const router = useRouter()

const revisions = ref<ApiRevision[]>([])
const documentTypes = ref<ApiDocumentType[]>([])
const loading = ref(false)
const error = ref('')

const filterQ = ref('')
const filterResult = ref('')
const filterNovedad = ref('')
const filterDocType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

// Observations modal state
const showObsModal = ref(false)
const selectedRevision = ref<ApiRevision | null>(null)
const modalObservations = ref<ApiObservation[]>([])
const loadingModalObs = ref(false)
const newObsText = ref('')
const savingNewObs = ref(false)
const modalObsError = ref('')

async function fetchRevisions() {
  loading.value = true
  error.value = ''
  try {
    const params: { q?: string; result?: string; novedad?: boolean; doc_type?: string; date_from?: string; date_to?: string } = {}
    if (filterQ.value.trim()) params.q = filterQ.value.trim()
    if (filterResult.value) params.result = filterResult.value
    if (filterNovedad.value !== '') params.novedad = filterNovedad.value === 'true'
    if (filterDocType.value) params.doc_type = filterDocType.value
    if (filterDateFrom.value) params.date_from = filterDateFrom.value
    if (filterDateTo.value) params.date_to = filterDateTo.value

    revisions.value = await api.revisions.list(params)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar las revisiones'
  } finally {
    loading.value = false
  }
}

async function fetchDocumentTypes() {
  try {
    documentTypes.value = await api.documentTypes.listActive()
  } catch (e: unknown) {
    console.error('Error fetching document types:', e)
  }
}

function handleSearch() {
  fetchRevisions()
}

function resetFilters() {
  filterQ.value = ''
  filterResult.value = ''
  filterNovedad.value = ''
  filterDocType.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  fetchRevisions()
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goToFolder(folderId: string) {
  router.push(`/folder/${encodeURIComponent(folderId)}`)
}

async function handleObservaciones(rev: ApiRevision) {
  selectedRevision.value = rev
  showObsModal.value = true
  modalObsError.value = ''
  newObsText.value = ''
  await fetchModalObservations()
}

async function fetchModalObservations() {
  if (!selectedRevision.value) return
  loadingModalObs.value = true
  try {
    modalObservations.value = await api.documents.listObservations(
      selectedRevision.value.folder_id,
      selectedRevision.value.document_id
    )
  } catch (e: unknown) {
    modalObsError.value = e instanceof Error ? e.message : 'Error al cargar las observaciones'
  } finally {
    loadingModalObs.value = false
  }
}

async function handleAddModalObservation() {
  if (!selectedRevision.value) return
  modalObsError.value = ''
  const text = newObsText.value.trim()
  if (!text) {
    modalObsError.value = 'Por favor ingresá un texto para la observación.'
    return
  }
  savingNewObs.value = true
  try {
    await api.documents.addObservation(
      selectedRevision.value.folder_id,
      selectedRevision.value.document_id,
      text
    )
    newObsText.value = ''
    await fetchModalObservations()
  } catch (e: unknown) {
    modalObsError.value = e instanceof Error ? e.message : 'Error al guardar la observación'
  } finally {
    savingNewObs.value = false
  }
}

onMounted(() => {
  fetchRevisions()
  fetchDocumentTypes()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader show-back @back="router.push('/')" />

    <main class="max-w-7xl mx-auto w-full px-4 py-8">
      <!-- Title -->
      <div class="mb-6">
        <h1 class="text-xl font-bold text-gray-900">Buscar Revisiones</h1>
        <p class="text-xs text-gray-500 mt-1">Historial de revisiones de documentos y registro de novedades por carpeta</p>
      </div>

      <!-- Filter bar -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <form @submit.prevent="handleSearch" class="flex flex-wrap items-center gap-3">
          <!-- Search input -->
          <div class="flex-1 min-w-[200px]">
            <label for="search-despacho" class="sr-only">Buscar por despacho</label>
            <div class="relative">
              <input
                id="search-despacho"
                v-model="filterQ"
                type="text"
                placeholder="Buscar por N° Despacho..."
                class="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              />
              <svg class="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </div>
          </div>

          <!-- Result filter -->
          <div class="w-40">
            <select
              v-model="filterResult"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 bg-white
                     focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            >
              <option value="">Todos los resultados</option>
              <option value="accepted">Aceptados</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>

          <!-- Novedad filter -->
          <div class="w-40">
            <select
              v-model="filterNovedad"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 bg-white
                     focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            >
              <option value="">Todas las novedades</option>
              <option value="true">Con Novedad</option>
              <option value="false">Sin Novedad</option>
            </select>
          </div>

          <!-- Document type filter -->
          <div class="w-48">
            <select
              v-model="filterDocType"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 bg-white
                     focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            >
              <option value="">Todos los tipos de doc.</option>
              <option v-for="dt in documentTypes" :key="dt.id" :value="dt.nombre">
                {{ dt.nombre }}
              </option>
            </select>
          </div>

          <!-- Date range filter: Desde & Hasta -->
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-gray-500">Desde:</span>
            <input
              type="date"
              v-model="filterDateFrom"
              class="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-800 bg-white
                     focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            />
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-gray-500">Hasta:</span>
            <input
              type="date"
              v-model="filterDateTo"
              class="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-800 bg-white
                     focus:border-indigo-500 focus:outline-none transition cursor-pointer"
            />
          </div>

          <!-- Actions -->
          <button
            type="submit"
            class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
          >
            Buscar
          </button>

          <button
            type="button"
            class="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            @click="resetFilters"
          >
            Limpiar
          </button>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-20">
        <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12 text-sm text-red-500 font-medium">
        {{ error }}
      </div>

      <!-- Empty State -->
      <div v-else-if="revisions.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-500">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-600">No se encontraron revisiones</p>
        <p class="text-xs text-gray-400 mt-1">Las revisiones se registran automáticamente al Aceptar o Rechazar documentos en las carpetas.</p>
      </div>

      <!-- Revisions Table -->
      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Despacho</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo Documento</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha y Hora</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Novedades</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Resultado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Opciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="rev in revisions" :key="rev.id" class="hover:bg-gray-50 transition">
              <!-- Despacho -->
              <td class="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                {{ rev.numero_despacho }}
              </td>

              <!-- Tipo Documento -->
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ rev.document_tipo || 'Sin clasificar' }}
              </td>

              <!-- Datetime -->
              <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {{ formatDate(rev.created_at) }}
              </td>

              <!-- Novedades -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  v-if="rev.novedad"
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Con Novedad
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  Sin Novedad
                </span>
              </td>

              <!-- Resultado -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  v-if="rev.result === 'accepted'"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                >
                  &#10003; Aceptado
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200"
                >
                  &#10005; Rechazado
                </span>
              </td>

              <!-- Opciones -->
              <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                <!-- Acceder button -->
                <button
                  class="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700
                         hover:bg-indigo-100 transition cursor-pointer inline-flex items-center gap-1"
                  @click="goToFolder(rev.folder_id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Acceder
                </button>

                <!-- Observaciones button -->
                <button
                  class="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700
                         hover:bg-gray-50 transition cursor-pointer inline-flex items-center gap-1"
                  @click="handleObservaciones(rev)"
                >
                  <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  Observaciones
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Observations Modal -->
    <div
      v-if="showObsModal && selectedRevision"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showObsModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-hidden">
        <!-- Modal Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-800">Observaciones del Documento</h2>
              <p class="text-xs text-gray-500">
                Despacho N° {{ selectedRevision.numero_despacho }}
                <span v-if="selectedRevision.document_tipo"> • {{ selectedRevision.document_tipo }}</span>
              </p>
            </div>
          </div>
          <button class="text-gray-400 hover:text-gray-600 transition cursor-pointer" @click="showObsModal = false" aria-label="Cerrar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Observations List -->
        <div class="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
          <div v-if="loadingModalObs" class="py-8 flex justify-center">
            <svg class="animate-spin w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>

          <div v-else-if="modalObservations.length === 0" class="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
            No hay observaciones registradas para este documento.
          </div>

          <div
            v-for="obs in modalObservations"
            :key="obs.id"
            class="bg-amber-50/50 rounded-xl border border-amber-200/60 p-3.5 text-xs text-gray-800 flex flex-col gap-1"
          >
            <div class="flex items-center justify-between text-gray-500 font-medium">
              <span class="font-semibold text-amber-900">{{ obs.user_name || 'Usuario' }}</span>
              <span>{{ formatDate(obs.created_at) }}</span>
            </div>
            <p class="text-gray-800 font-normal whitespace-pre-wrap leading-relaxed">{{ obs.text }}</p>
          </div>
        </div>

        <!-- Add new observation inline -->
        <form @submit.prevent="handleAddModalObservation" class="border-t border-gray-100 pt-3 flex flex-col gap-2 shrink-0">
          <label for="new-obs" class="text-xs font-semibold text-gray-700">Agregar nueva observación</label>
          <div class="flex gap-2">
            <textarea
              id="new-obs"
              v-model="newObsText"
              rows="2"
              placeholder="Escribí una nueva observación..."
              class="flex-1 rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 placeholder-gray-400
                     focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition"
            ></textarea>
            <button
              type="submit"
              :disabled="savingNewObs || !newObsText.trim()"
              class="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition self-end cursor-pointer"
            >
              {{ savingNewObs ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
          <p v-if="modalObsError" class="text-xs text-red-500 font-medium">{{ modalObsError }}</p>
        </form>

        <!-- Footer -->
        <div class="flex justify-end pt-1">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            @click="showObsModal = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
