<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFolderStore } from '../stores/folderStore'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const store = useFolderStore()

onMounted(() => store.fetchFolders())

// ── Filters ──────────────────────────────────────────────────────────────────
const filterDespacho = ref('')
const filterCliente = ref('')
const filterDesde = ref('')
const filterHasta = ref('')
const filterState = ref('')

const filtered = computed(() => {
  const despacho = filterDespacho.value.trim().toLowerCase()
  const cliente = filterCliente.value.trim().toLowerCase()
  const desde = filterDesde.value ? new Date(filterDesde.value) : null
  const hasta = filterHasta.value ? new Date(filterHasta.value + 'T23:59:59') : null

  return store.recentFolders.filter(f => {
    if (despacho && !f.numero_despacho.toLowerCase().includes(despacho)) return false
    if (cliente) {
      const hayCliente =
        f.client?.razon_social.toLowerCase().includes(cliente) ||
        f.client?.rut.toLowerCase().includes(cliente)
      if (!hayCliente) return false
    }
    if (filterState.value && f.state !== filterState.value) return false
    const created = new Date(f.created_at)
    if (desde && created < desde) return false
    if (hasta && created > hasta) return false
    return true
  })
})

function clearFilters() {
  filterDespacho.value = ''
  filterCliente.value = ''
  filterDesde.value = ''
  filterHasta.value = ''
  filterState.value = ''
}

const hasFilters = computed(() =>
  filterDespacho.value || filterCliente.value || filterDesde.value || filterHasta.value || filterState.value
)

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

    <main class="max-w-5xl mx-auto w-full px-4 py-8">

      <h1 class="text-xl font-bold text-gray-900 mb-6">Buscar Carpeta</h1>

      <!-- ── Filter bar ──────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <!-- Despacho -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Despacho</label>
            <input
              v-model="filterDespacho"
              type="text"
              placeholder="ej. DES-2026-001"
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
              type="text"
              placeholder="RUT o razón social"
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
              type="date"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <!-- State filter -->
        <div class="mt-3 flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500">Estado:</span>
          <button
            v-for="opt in [{ value: '', label: 'Todos' }, { value: 'open', label: 'Abierta' }, { value: 'closed', label: 'Cerrada' }]"
            :key="opt.value"
            :class="filterState === opt.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            @click="filterState = opt.value"
          >{{ opt.label }}</button>
        </div>

        <div class="mt-3 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            {{ filtered.length }} de {{ store.recentFolders.length }} carpetas
          </span>
          <button
            v-if="hasFilters"
            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
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

      <p v-else-if="store.recentFolders.length === 0" class="text-sm text-gray-400 text-center py-16">
        No hay carpetas disponibles.
      </p>

      <p v-else-if="filtered.length === 0" class="text-sm text-gray-400 text-center py-16">
        Ninguna carpeta coincide con los filtros aplicados.
      </p>

      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table class="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">UUID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Despacho</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Operación</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">RUT</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Docs</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Creación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="f in filtered"
              :key="f.id"
              class="cursor-pointer hover:bg-indigo-50 transition"
              @click="openFolder(f.id)"
            >
              <td class="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{{ f.id }}</td>
              <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{{ f.numero_despacho }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="f.operacion === 'exportacion' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'"
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                >{{ f.operacion === 'exportacion' ? 'Exportación' : 'Importación' }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ f.client?.rut ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ f.client?.razon_social ?? '—' }}</td>
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

    </main>
  </div>
</template>

