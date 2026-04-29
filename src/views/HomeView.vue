<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type ApiStats } from '../api'
import AppHeader from '../components/AppHeader.vue'

const stats = ref<ApiStats | null>(null)
const statsError = ref(false)

onMounted(async () => {
  try {
    stats.value = await api.stats.get()
  } catch {
    statsError.value = true
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader />

    <main class="max-w-5xl mx-auto w-full px-4 py-10">

      <h1 class="text-xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p class="text-sm text-gray-400 mb-8">{{ stats?.month ?? '…' }}</p>

      <!-- Skeleton -->
      <div v-if="!stats && !statsError" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n"
          class="h-28 bg-white rounded-2xl border border-gray-200 animate-pulse" />
      </div>

      <p v-else-if="statsError" class="text-sm text-red-500">
        No se pudieron cargar las estadísticas.
      </p>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-1">
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Carpetas (mes)</span>
          <span class="text-4xl font-bold text-indigo-600">{{ stats!.folders_this_month }}</span>
          <span class="text-xs text-gray-400">de {{ stats!.total_folders }} total</span>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-1">
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Documentos (mes)</span>
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
