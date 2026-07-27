<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../api'

const props = defineProps<{
  folderId: string
  folderName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const email = ref('')
const message = ref('')
const sending = ref(false)
const sent = ref(false)
const error = ref('')

async function handleSend() {
  error.value = ''
  const val = email.value.trim()
  if (!val) {
    error.value = 'Ingresá una dirección de correo electrónico.'
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(val)) {
    error.value = 'Ingresá un correo electrónico válido.'
    return
  }

  sending.value = true
  try {
    await api.folders.sendEmail(props.folderId, {
      to_email: val,
      message: message.value.trim() || undefined,
    })
    sent.value = true
    setTimeout(() => {
      emit('close')
    }, 1500)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al enviar el correo'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-800">Enviar por Mail</h2>
            <p class="text-xs text-gray-500">{{ props.folderName || props.folderId }}</p>
          </div>
        </div>
        <button class="text-gray-400 hover:text-gray-600 transition" @click="emit('close')" aria-label="Cerrar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Success feedback -->
      <div v-if="sent" class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm flex items-center gap-3">
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>¡Correo enviado con éxito a <strong>{{ email }}</strong>!</span>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSend" class="flex flex-col gap-4">
        <div>
          <label for="email" class="block text-xs font-semibold text-gray-700 mb-1.5">
            Dirección de correo electrónico
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="ejemplo@correo.com"
            class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                   focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
          />
        </div>

        <div>
          <label for="message" class="block text-xs font-semibold text-gray-700 mb-1.5">
            Mensaje (opcional)
          </label>
          <textarea
            id="message"
            v-model="message"
            rows="2"
            placeholder="Escribí una nota para el destinatario..."
            class="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400
                   focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition resize-none"
          />
          <p v-if="error" class="text-xs text-red-500 mt-1 font-medium">{{ error }}</p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                   hover:bg-gray-50 transition"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="sending"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                   hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
          >
            <svg v-if="sending" class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {{ sending ? 'Enviando…' : 'Enviar Correo' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
