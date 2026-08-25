<script setup lang="ts">
import { computed } from 'vue'
import type { ApiAgent } from '../api'

const props = defineProps<{
  folderId: string
  pendingCount: number
  agent?: ApiAgent | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirmed'): void
}>()

function isExpired(validUntil?: string | null): boolean {
  if (!validUntil) return true
  return new Date(validUntil) < new Date()
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const certStatus = computed(() => {
  if (!props.agent) {
    return {
      canSign: false,
      reason: 'no_agent',
      message: 'La carpeta no tiene un agente aduanal asignado. Asigne un agente a la carpeta antes de firmar.',
    }
  }
  if (!props.agent.certificate || !props.agent.certificate.is_active) {
    return {
      canSign: false,
      reason: 'no_certificate',
      message: `El agente asignado (${props.agent.name}) no cuenta con un certificado digital activo cargado. Por favor, cargue un certificado digital en Administración > Información Organización.`,
    }
  }
  if (isExpired(props.agent.certificate.valid_until)) {
    return {
      canSign: false,
      reason: 'expired_certificate',
      message: `El certificado digital del agente ${props.agent.name} expiró el ${formatDate(props.agent.certificate.valid_until)}. Actualice el certificado antes de continuar.`,
    }
  }
  return {
    canSign: true,
    reason: 'valid',
    message: `${props.agent.certificate.subject_cn || props.agent.name} • Vence: ${formatDate(props.agent.certificate.valid_until)}`,
  }
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800">Firmar carpeta</h2>
        <button class="text-gray-400 hover:text-gray-600 transition cursor-pointer" @click="emit('close')" aria-label="Cerrar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Certificate Validation Error / Warning -->
      <div
        v-if="!certStatus.canSign"
        class="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex gap-3 items-start"
      >
        <svg class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
        <div class="text-xs text-rose-800">
          <p class="font-bold mb-1">Certificado digital no disponible</p>
          <p class="leading-relaxed">{{ certStatus.message }}</p>
        </div>
      </div>

      <!-- Valid Certificate Info -->
      <div
        v-else
        class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex gap-3 items-center"
      >
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-xs text-emerald-800">
          <p class="font-semibold text-emerald-900">Certificado digital verificado</p>
          <p class="font-mono text-[11px] text-emerald-700 mt-0.5">{{ certStatus.message }}</p>
        </div>
      </div>

      <!-- Irreversible Warning -->
      <div class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3 items-start">
        <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div class="text-xs text-amber-800 leading-relaxed">
          <p class="font-semibold mb-1">Esta acción es irreversible</p>
          <p>Se generará el archivo <span class="font-mono font-semibold">CARPETA.xml</span> con todos los documentos firmados y <strong>la carpeta se cerrará</strong>. No se podrán agregar ni modificar más archivos.</p>
        </div>
      </div>

      <!-- Pending documents warning -->
      <div
        v-if="props.pendingCount > 0"
        class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex gap-3 items-start"
      >
        <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div class="text-xs text-red-800 leading-relaxed">
          <p class="font-semibold mb-1">Hay documentos pendientes</p>
          <p>
            {{ props.pendingCount === 1
              ? 'Un documento sigue en estado Pendiente'
              : `${props.pendingCount} documentos siguen en estado Pendiente` }}
            y no han sido revisados.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                 hover:bg-gray-50 transition cursor-pointer"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="!certStatus.canSign"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          @click="emit('confirmed')"
        >
          Firmar y cerrar carpeta
        </button>
      </div>

    </div>
  </div>
</template>
