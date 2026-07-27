<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type ApiStats } from '../api'
import AppHeader from '../components/AppHeader.vue'

type PeriodKey = 'week' | 'month' | 'year' | 'total'

interface PeriodOption {
  key: PeriodKey
  label: string
}

const periods: PeriodOption[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
  { key: 'total', label: 'Total' },
]

const selectedPeriod = ref<PeriodKey>('month')
const stats = ref<ApiStats | null>(null)
const statsError = ref(false)
const isLoading = ref(false)

const periodLabel = computed(() => {
  switch (selectedPeriod.value) {
    case 'week': return 'semana'
    case 'month': return 'mes'
    case 'year': return 'año'
    case 'total': return 'total'
    default: return 'mes'
  }
})

async function fetchStats(period: PeriodKey = selectedPeriod.value) {
  isLoading.value = true
  statsError.value = false
  try {
    stats.value = await api.stats.get(period)
  } catch {
    statsError.value = true
  } finally {
    isLoading.value = false
  }
}

function selectPeriod(period: PeriodKey) {
  if (selectedPeriod.value === period && stats.value) return
  selectedPeriod.value = period
  fetchStats(period)
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader />

    <main class="max-w-7xl mx-auto w-full px-4 py-10">

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p class="text-sm text-gray-400">{{ stats?.period_label ?? stats?.month ?? '…' }}</p>
        </div>

        <!-- Period Switch / Segmented Control -->
        <div class="inline-flex p-1 bg-gray-200/80 rounded-xl space-x-1 self-start sm:self-auto shadow-inner">
          <button
            v-for="p in periods"
            :key="p.key"
            @click="selectPeriod(p.key)"
            :disabled="isLoading"
            :class="[
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 focus:outline-none cursor-pointer',
              selectedPeriod === p.key
                ? 'bg-white text-indigo-600 shadow-sm font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            ]"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="!stats && !statsError" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n"
          class="h-28 bg-white rounded-2xl border border-gray-200 animate-pulse" />
      </div>

      <p v-else-if="statsError" class="text-sm text-red-500">
        No se pudieron cargar las estadísticas.
      </p>

      <div
        v-else
        class="grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-200"
        :class="{ 'opacity-50 pointer-events-none': isLoading }"
      >
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-1">
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Carpetas ({{ periodLabel }})</span>
          <span class="text-4xl font-bold text-indigo-600">{{ stats!.folders_this_month }}</span>
          <span class="text-xs text-gray-400">de {{ stats!.total_folders }} total</span>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-1">
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Documentos ({{ periodLabel }})</span>
          <span class="text-4xl font-bold text-emerald-600">{{ stats!.documents_this_month }}</span>
          <span class="text-xs text-gray-400">de {{ stats!.total_documents }} total</span>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-1">
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Carpetas totales</span>
          <span class="text-4xl font-bold text-gray-700">{{ stats!.total_folders }}</span>
          <span class="text-xs text-gray-400">accesibles</span>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-1">
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Clientes</span>
          <span class="text-4xl font-bold text-violet-600">{{ stats!.total_clients }}</span>
          <span class="text-xs text-gray-400">con carpetas</span>
        </div>
      </div>

    </main>
  </div>
</template>
