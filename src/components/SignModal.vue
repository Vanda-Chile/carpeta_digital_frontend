<script setup lang="ts">
const props = defineProps<{ folderId: string; pendingCount: number }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirmed'): void
}>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800">Firmar carpeta</h2>
        <button class="text-gray-400 hover:text-gray-600 transition" @click="emit('close')" aria-label="Cerrar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Warning -->
      <div class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3 items-start">
        <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div class="text-sm text-amber-800">
          <p class="font-semibold mb-1">Esta acción es irreversible</p>
          <p>Se generará el archivo <span class="font-mono font-semibold">CARPETA.xml</span> con todos los documentos y <strong>la carpeta se cerrará</strong>. No se podrán agregar más archivos.</p>
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
        <div class="text-sm text-red-800">
          <p class="font-semibold mb-1">Hay documentos pendientes</p>
          <p>
            {{ props.pendingCount === 1
              ? 'Un documento sigue en estado Pendiente'
              : `${props.pendingCount} documentos siguen en estado Pendiente` }}
            y no han sido revisados. Podés continuar de todas formas, pero quedarán incluidos sin aprobación.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <button
          class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                 hover:bg-gray-50 transition"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 transition"
          @click="emit('confirmed')"
        >
          Firmar y cerrar carpeta
        </button>
      </div>

    </div>
  </div>
</template>
