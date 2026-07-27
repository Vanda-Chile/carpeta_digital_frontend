<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiAgent } from '../api'

const router = useRouter()
const route = useRoute()
const store = useFolderStore()

// ── Agents state ──────────────────────────────────────────────────────────────
const agents = ref<ApiAgent[]>([])
const filterAgent = ref('')

// ── Filters ──────────────────────────────────────────────────────────────────
const filterDespacho = ref('')
const filterAceptacion = ref('')
const filterCliente = ref('')
const filterUser = ref('')
const filterDesde = ref('')
const filterHasta = ref('')
const filterState = ref('open')
const filterOperacion = ref('')
const filterDocs = ref('')
const sortBy = ref<'created_at' | 'fecha_aceptacion' | 'numero_despacho'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)

const itemsPerPage = ref(30)
const itemsPerPageOptions = [10, 20, 30, 50, 100]

function applyFilters(page = 1) {
  currentPage.value = page

  const query: Record<string, string> = {}
  if (filterDespacho.value.trim()) query.numero_despacho = filterDespacho.value.trim()
  if (filterAceptacion.value.trim()) query.numero_aceptacion = filterAceptacion.value.trim()
  if (filterCliente.value.trim()) query.client = filterCliente.value.trim()
  if (filterAgent.value) query.agent_id = filterAgent.value
  if (filterUser.value.trim()) query.creating_user = filterUser.value.trim()
  if (filterState.value && filterState.value !== 'open') query.state = filterState.value
  if (filterOperacion.value) query.operacion = filterOperacion.value
  if (filterDocs.value) query.has_documents = filterDocs.value
  if (filterDesde.value) query.desde = filterDesde.value
  if (filterHasta.value) query.hasta = filterHasta.value
  if (currentPage.value > 1) query.page = String(currentPage.value)

  router.replace({ query })

  store.fetchFolders({
    numero_despacho: filterDespacho.value.trim() || undefined,
    numero_aceptacion: filterAceptacion.value.trim() || undefined,
    client: filterCliente.value.trim() || undefined,
    agent_id: filterAgent.value || undefined,
    creating_user: filterUser.value.trim() || undefined,
    state: filterState.value || undefined,
    operacion: filterOperacion.value || undefined,
    has_documents: filterDocs.value || undefined,
    desde: filterDesde.value || undefined,
    hasta: filterHasta.value || undefined,
    sort_by: sortBy.value,
    order: sortOrder.value,
    page: currentPage.value,
    limit: itemsPerPage.value,
  })
}

function clearFilters() {
  filterDespacho.value = ''
  filterAceptacion.value = ''
  filterCliente.value = ''
  filterAgent.value = ''
  filterUser.value = ''
  filterDesde.value = ''
  filterHasta.value = ''
  filterState.value = 'open'
  filterOperacion.value = ''
  filterDocs.value = ''
  sortBy.value = 'created_at'
  sortOrder.value = 'desc'
  itemsPerPage.value = 30
  applyFilters(1)
}

function selectState(stateVal: string) {
  filterState.value = stateVal
  applyFilters(1)
}

function selectOperacion(opVal: string) {
  filterOperacion.value = opVal
  applyFilters(1)
}

function selectDocs(docVal: string) {
  filterDocs.value = docVal
  applyFilters(1)
}

function toggleSort(field: 'created_at' | 'fecha_aceptacion' | 'numero_despacho') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'numero_despacho' ? 'asc' : 'desc'
  }
  applyFilters(1)
}

const hasFilters = computed(() =>
  filterDespacho.value ||
  filterAceptacion.value ||
  filterCliente.value ||
  filterAgent.value ||
  filterUser.value ||
  filterDesde.value ||
  filterHasta.value ||
  filterState.value !== 'open' ||
  filterOperacion.value !== '' ||
  filterDocs.value !== '' ||
  sortBy.value !== 'created_at' ||
  sortOrder.value !== 'desc' ||
  itemsPerPage.value !== 30
)

onMounted(async () => {
  try {
    agents.value = await api.agents.list()
  } catch {
    agents.value = []
  }
  const qAgent = (route.query.agent_id || route.query.agent) as string | undefined
  if (qAgent) {
    filterAgent.value = qAgent
  }
  applyFilters(1)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function openFolder(uuid: string) {
  router.push(`/folder/${encodeURIComponent(uuid)}`)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader show-back @back="router.push('/')" />

    <main class="max-w-7xl mx-auto w-full px-4 py-8">

      <h1 class="text-xl font-bold text-gray-900 mb-6">Buscar Carpeta</h1>

      <!-- ── Filter bar ──────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

          <!-- Despacho -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Despacho</label>
            <input
              v-model="filterDespacho"
              @input="applyFilters(1)"
              type="text"
              placeholder="ej. DES-2026-001"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>

          <!-- N° Aceptación -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">N° Aceptación</label>
            <input
              v-model="filterAceptacion"
              @input="applyFilters(1)"
              type="text"
              placeholder="ej. ACE-12345"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>

          <!-- Cliente -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Cliente</label>
            <input
              v-model="filterCliente"
              @input="applyFilters(1)"
              type="text"
              placeholder="RUT o razón social"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>

          <!-- Agente Aduanero -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Agente Aduanero</label>
            <select
              v-model="filterAgent"
              @change="applyFilters(1)"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              <option value="">Todos los agentes</option>
              <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                {{ agent.name }} {{ agent.code ? `(${agent.code})` : '' }}
              </option>
            </select>
          </div>

          <!-- Usuario Creador -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Usuario Creador</label>
            <input
              v-model="filterUser"
              @input="applyFilters(1)"
              type="text"
              placeholder="Usuario o nombre"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>

          <!-- Fecha desde -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
            <input
              v-model="filterDesde"
              @change="applyFilters(1)"
              type="date"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>

          <!-- Fecha hasta -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
            <input
              v-model="filterHasta"
              @change="applyFilters(1)"
              type="date"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <!-- State, Operacion, Document & Sort filters -->
        <div class="mt-4 flex flex-wrap items-center gap-6 pt-3 border-t border-gray-100">

          <!-- Estado -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500">Estado:</span>
            <button
              v-for="opt in [{ value: '', label: 'Todos' }, { value: 'open', label: 'Abierta' }, { value: 'closed', label: 'Cerrada' }]"
              :key="opt.value"
              :class="filterState === opt.value
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
              class="rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer"
              @click="selectState(opt.value)"
            >{{ opt.label }}</button>
          </div>

          <!-- Operación -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500">Operación:</span>
            <button
              v-for="opt in [{ value: '', label: 'Todas' }, { value: 'importacion', label: 'Importación' }, { value: 'exportacion', label: 'Exportación' }]"
              :key="opt.value"
              :class="filterOperacion === opt.value
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
              class="rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer"
              @click="selectOperacion(opt.value)"
            >{{ opt.label }}</button>
          </div>

          <!-- Documentos -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500">Documentos:</span>
            <button
              v-for="opt in [{ value: '', label: 'Todos' }, { value: 'yes', label: 'Con documentos' }, { value: 'no', label: 'Sin documentos' }]"
              :key="opt.value"
              :class="filterDocs === opt.value
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
              class="rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer"
              @click="selectDocs(opt.value)"
            >{{ opt.label }}</button>
          </div>

          <!-- Orden -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500">Orden:</span>
            <select
              :value="`${sortBy}_${sortOrder}`"
              @change="(e) => {
                const [sb, ord] = (e.target as HTMLSelectElement).value.split('_') as ['created_at' | 'fecha_aceptacion' | 'numero_despacho', 'asc' | 'desc']
                sortBy = sb
                sortOrder = ord
                applyFilters(1)
              }"
              class="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="created_at_desc">Creación: Recientes primero (predeterminado)</option>
              <option value="created_at_asc">Creación: Antiguos primero</option>
              <option value="fecha_aceptacion_desc">Aceptación: Recientes primero</option>
              <option value="fecha_aceptacion_asc">Aceptación: Antiguos primero</option>
              <option value="numero_despacho_asc">Despacho: Ascendente</option>
              <option value="numero_despacho_desc">Despacho: Descendente</option>
            </select>
          </div>

        </div>

        <div class="mt-3 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            {{ store.recentFolders.length }} de {{ store.pagination.total }} carpetas
          </span>
          <button
            v-if="hasFilters"
            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition cursor-pointer"
            @click="clearFilters"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <!-- ── Table ───────────────────────────────────────────────────────────── -->
      <div v-if="store.loading" class="flex justify-center py-20">
        <svg class="animate-spin w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <p v-else-if="store.recentFolders.length === 0 && !hasFilters" class="text-sm text-gray-400 text-center py-16">
        No hay carpetas disponibles.
      </p>

      <p v-else-if="store.recentFolders.length === 0 && hasFilters" class="text-sm text-gray-400 text-center py-16">
        Ninguna carpeta coincide con los filtros aplicados.
      </p>

      <div v-else class="flex flex-col gap-4">
        <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table class="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID Carpeta</th>

                <!-- Sortable Despacho header -->
                <th
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-indigo-600 transition select-none"
                  @click="toggleSort('numero_despacho')"
                >
                  <div class="flex items-center space-x-1">
                    <span>Despacho</span>
                    <span v-if="sortBy === 'numero_despacho'" class="text-indigo-600 font-bold">
                      {{ sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </th>

                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">N° Aceptación</th>

                <!-- Sortable Fecha Aceptación header -->
                <th
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-indigo-600 transition select-none"
                  @click="toggleSort('fecha_aceptacion')"
                >
                  <div class="flex items-center space-x-1">
                    <span>F. Aceptación</span>
                    <span v-if="sortBy === 'fecha_aceptacion'" class="text-indigo-600 font-bold">
                      {{ sortOrder === 'desc' ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>

                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Operación</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">RUT</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Creado Por</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Docs</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>

                <!-- Sortable Creación header -->
                <th
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-indigo-600 transition select-none"
                  @click="toggleSort('created_at')"
                >
                  <div class="flex items-center space-x-1">
                    <span>Creación</span>
                    <span v-if="sortBy === 'created_at'" class="text-indigo-600 font-bold">
                      {{ sortOrder === 'desc' ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>

              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="f in store.recentFolders"
                :key="f.id"
                class="cursor-pointer hover:bg-indigo-50 transition"
                @click="openFolder(f.id)"
              >
                <td class="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{{ f.id }}</td>
                <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{{ f.numero_despacho }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{{ f.numero_aceptacion ?? '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{{ f.fecha_aceptacion ? formatDate(f.fecha_aceptacion) : '—' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    :class="f.operacion === 'exportacion' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'"
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                  >{{ f.operacion === 'exportacion' ? 'Exportación' : 'Importación' }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ f.client?.rut ?? '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ f.client?.razon_social ?? '—' }}</td>
                <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap font-medium">{{ f.user_name || f.user_id || '—' }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center justify-center rounded-full bg-indigo-50 text-indigo-700
                               text-xs font-semibold px-2 py-0.5 min-w-7">
                    {{ f.document_count }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    :class="f.state === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                  >{{ f.state === 'open' ? 'Abierta' : 'Cerrada' }}</span>
                </td>
                <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ formatDate(f.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Pagination bar ───────────────────────────────────────────────────── -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500 px-1">
          <div>
            Mostrando <span class="font-semibold text-gray-700">{{ store.recentFolders.length }}</span> de
            <span class="font-semibold text-gray-700">{{ store.pagination.total }}</span> carpetas
            (Página {{ store.pagination.page }} de {{ store.pagination.pages }})
          </div>

          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-gray-500">Resultados por página:</label>
              <select
                v-model="itemsPerPage"
                @change="applyFilters(1)"
                class="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
              >
                <option v-for="opt in itemsPerPageOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <button
                :disabled="store.pagination.page <= 1 || store.loading"
                @click="applyFilters(store.pagination.page - 1)"
                class="px-3 py-1.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
              >
                Anterior
              </button>
              <button
                :disabled="store.pagination.page >= store.pagination.pages || store.loading"
                @click="applyFilters(store.pagination.page + 1)"
                class="px-3 py-1.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>
