<script setup lang="ts">
import { computed } from 'vue'
import { type ApiFolder } from '../api'

const props = defineProps<{
  folder: ApiFolder
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const displayUserName = computed(() => {
  const name = props.folder.user_name || props.folder.user_id
  if (!name || name === '1' || name === 1) return 'dev'
  return String(name)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    @click.self="emit('close')"
  >
    <!-- Modal Card -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div>
          <h2 class="text-base font-bold text-gray-900">
            Carpeta N° {{ props.folder.numero_despacho }}
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">Detalles generales de la carpeta digital</p>
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
      <div class="p-6 space-y-4 text-xs">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <!-- ID Carpeta -->
          <div class="sm:col-span-2 rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <div class="flex items-center justify-between text-gray-500 mb-1 font-medium">
              <span>ID (UUID):</span>
              <button
                @click="copyToClipboard(props.folder.id)"
                class="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer text-[11px]"
                title="Copiar ID"
              >
                Copiar
              </button>
            </div>
            <p class="font-mono text-gray-900 select-all break-all">{{ props.folder.id }}</p>
          </div>

          <!-- Usuario creador -->
          <div class="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Usuario creador</span>
            <span class="font-semibold text-gray-900 capitalize">{{ displayUserName }}</span>
          </div>

          <!-- Estado actual -->
          <div class="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Estado actual</span>
            <span
              :class="props.folder.state === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'"
              class="inline-block rounded-full px-2.5 py-0.5 font-semibold text-[11px]"
            >
              {{ props.folder.state === 'open' ? 'Abierta' : 'Cerrada' }}
            </span>
          </div>

          <!-- Fecha de creación -->
          <div class="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Fecha de creación</span>
            <span class="font-semibold text-gray-900">{{ formatDateTime(props.folder.created_at) }}</span>
          </div>

          <!-- Operación -->
          <div class="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Operación</span>
            <span
              :class="props.folder.operacion === 'exportacion' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'"
              class="inline-block rounded-full px-2.5 py-0.5 font-semibold capitalize text-[11px]"
            >
              {{ props.folder.operacion === 'exportacion' ? 'Exportación' : 'Importación' }}
            </span>
          </div>

          <!-- Número de Aceptación -->
          <div class="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Número de Aceptación</span>
            <span class="font-semibold font-mono text-gray-900">{{ props.folder.numero_aceptacion ?? '—' }}</span>
          </div>

          <!-- Fecha de Aceptación -->
          <div class="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Fecha de Aceptación</span>
            <span class="font-semibold text-gray-900">
              {{ props.folder.fecha_aceptacion ? formatDate(props.folder.fecha_aceptacion) : '—' }}
            </span>
          </div>

          <!-- Cliente -->
          <div class="sm:col-span-2 rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Cliente</span>
            <span class="font-semibold text-gray-900">
              {{ props.folder.client ? `${props.folder.client.rut} — ${props.folder.client.razon_social}` : '—' }}
            </span>
          </div>

          <!-- Agente Aduanal -->
          <div class="sm:col-span-2 rounded-xl bg-gray-50 border border-gray-200/80 p-3">
            <span class="block text-gray-500 font-medium mb-1">Agente Aduanal</span>
            <span class="font-semibold text-gray-900">
              {{ props.folder.agent ? `${props.folder.agent.name} ${props.folder.agent.code ? `(${props.folder.agent.code})` : ''}` : '—' }}
            </span>
          </div>

        </div>

      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          type="button"
          @click="emit('close')"
          class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer shadow-sm"
        >
          Cerrar
        </button>
      </div>

    </div>
  </div>
</template>
