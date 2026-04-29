<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type ApiBitacoraEntry } from '../api'

const props = defineProps<{ folderId: string }>()
const emit = defineEmits<{ close: [] }>()

const entries = ref<ApiBitacoraEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const EVENT_LABELS: Record<string, (e: ApiBitacoraEntry) => string> = {
  folder_created: (e) => `El usuario ${e.user_name ?? 'desconocido'} creó esta carpeta.`,
  document_added: (e) =>
    `${e.user_name ?? 'Desconocido'} agregó documento${e.document_tipo ? ` "${e.document_tipo}"` : ''}.`,
  document_modified: (e) =>
    `${e.user_name ?? 'Desconocido'} modificó documento${e.document_tipo ? ` "${e.document_tipo}"` : ''}.`,
  folder_closed: () => 'Carpeta cerrada.',
  folder_signed: (e) => `${e.user_name ?? 'Desconocido'} firmó la carpeta.`,
}

function eventLabel(entry: ApiBitacoraEntry): string {
  const fn = EVENT_LABELS[entry.event_type]
  return fn ? fn(entry) : entry.event_type
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(async () => {
  try {
    entries.value = await api.folders.audit(props.folderId)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar la bitácora.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Bitácora</h2>
        <button
          class="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-10">
          <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>

        <!-- Error -->
        <p v-else-if="error" class="text-sm text-red-500 py-6 text-center">{{ error }}</p>

        <!-- Empty -->
        <p v-else-if="entries.length === 0" class="text-sm text-gray-400 py-6 text-center">
          Sin eventos registrados.
        </p>

        <!-- Table -->
        <table v-else class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 pr-4 whitespace-nowrap">
                Fecha
              </th>
              <th class="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 pr-4 whitespace-nowrap">
                Usuario
              </th>
              <th class="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                Evento
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="entry in entries" :key="entry.id" class="align-top">
              <td class="py-2.5 pr-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                {{ formatDate(entry.timestamp) }}
              </td>
              <td class="py-2.5 pr-4 text-gray-600 whitespace-nowrap">
                {{ entry.user_name ?? '—' }}
              </td>
              <td class="py-2.5 text-gray-700">
                {{ eventLabel(entry) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
