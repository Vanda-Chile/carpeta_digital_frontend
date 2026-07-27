<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type ApiContact } from '../api'

const props = defineProps<{
  folderId: string
  despacho?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const contacts = ref<ApiContact[]>([])
const selectedContactIds = ref<number[]>([])
const validityDays = ref<number>(30) // Default 1 month (30 days)

const loadingContacts = ref(false)
const sending = ref(false)
const sent = ref(false)
const successMessage = ref('')
const error = ref('')
const searchQuery = ref('')

const filteredContacts = computed(() => {
  if (!searchQuery.value.trim()) return contacts.value
  const q = searchQuery.value.toLowerCase().trim()
  return contacts.value.filter(
    c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  )
})

const isAllSelected = computed(() => {
  if (filteredContacts.value.length === 0) return false
  return filteredContacts.value.every(c => selectedContactIds.value.includes(c.id))
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    const filteredIds = new Set(filteredContacts.value.map(c => c.id))
    selectedContactIds.value = selectedContactIds.value.filter(id => !filteredIds.has(id))
  } else {
    const currentSet = new Set(selectedContactIds.value)
    filteredContacts.value.forEach(c => currentSet.add(c.id))
    selectedContactIds.value = Array.from(currentSet)
  }
}

function toggleContact(id: number) {
  const idx = selectedContactIds.value.indexOf(id)
  if (idx > -1) {
    selectedContactIds.value.splice(idx, 1)
  } else {
    selectedContactIds.value.push(id)
  }
}

onMounted(async () => {
  loadingContacts.value = true
  try {
    contacts.value = await api.contacts.list()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar contactos de Aduana'
  } finally {
    loadingContacts.value = false
  }
})

async function handleSend() {
  error.value = ''
  if (selectedContactIds.value.length === 0) {
    error.value = 'Por favor seleccioná al menos un contacto de Aduana.'
    return
  }

  sending.value = true
  try {
    const res = await api.folders.sendAduana(props.folderId, {
      contact_ids: selectedContactIds.value,
      validity_days: validityDays.value,
    })
    successMessage.value = res.message || 'Correo enviado exitosamente a los contactos seleccionados.'
    sent.value = true
    setTimeout(() => {
      emit('close')
    }, 1800)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al enviar el correo a Aduana'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5 max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-800">Enviar a Aduana</h2>
            <p class="text-xs text-gray-500">Carpeta Despacho N° {{ props.despacho || props.folderId }}</p>
          </div>
        </div>
        <button class="text-gray-400 hover:text-gray-600 transition" @click="emit('close')" aria-label="Cerrar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Success message -->
      <div v-if="sent" class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm flex items-center gap-3">
        <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSend" class="flex flex-col gap-4 overflow-hidden">
        <!-- Validity selector -->
        <div>
          <label for="validity" class="block text-xs font-semibold text-gray-700 mb-1.5">
            Validez del enlace de descarga
          </label>
          <select
            id="validity"
            v-model="validityDays"
            class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 bg-white
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition cursor-pointer"
          >
            <option :value="7">1 semana (7 días)</option>
            <option :value="30">1 mes (30 días) — Predeterminado</option>
            <option :value="90">3 meses (90 días)</option>
            <option :value="180">6 meses (180 días)</option>
            <option :value="365">1 año (365 días)</option>
          </select>
        </div>

        <!-- Contact selector -->
        <div class="flex flex-col flex-1 min-h-0">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-gray-700">
              Seleccionar Contactos de Aduana
              <span v-if="selectedContactIds.length > 0" class="text-blue-600 font-normal ml-1">
                ({{ selectedContactIds.length }} seleccionado{{ selectedContactIds.length === 1 ? '' : 's' }})
              </span>
            </label>
            <button
              v-if="filteredContacts.length > 0"
              type="button"
              class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              @click="toggleSelectAll"
            >
              {{ isAllSelected ? 'Desmarcar todos' : 'Seleccionar todos' }}
            </button>
          </div>

          <!-- Filter input -->
          <input
            v-if="contacts.length > 5"
            v-model="searchQuery"
            type="text"
            placeholder="Buscar contacto por nombre o email..."
            class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 mb-2
                   focus:border-blue-500 focus:outline-none"
          />

          <!-- Loading state -->
          <div v-if="loadingContacts" class="py-12 flex justify-center">
            <svg class="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>

          <!-- Empty state -->
          <div v-else-if="contacts.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
            No hay contactos de Aduana registrados. Podés agregarlos en el menú <strong class="text-gray-700">Administración &gt; Contactos Aduana</strong>.
          </div>

          <!-- Contacts checklist -->
          <div v-else class="border border-gray-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-100 bg-white">
            <div
              v-for="contact in filteredContacts"
              :key="contact.id"
              class="flex items-center px-3.5 py-2.5 hover:bg-blue-50/50 transition cursor-pointer"
              @click="toggleContact(contact.id)"
            >
              <input
                type="checkbox"
                :checked="selectedContactIds.includes(contact.id)"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 cursor-pointer pointer-events-none"
                @click.stop
              />
              <div class="ml-3 min-w-0 flex-1">
                <p class="text-xs font-semibold text-gray-800 truncate">{{ contact.name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ contact.email }}</p>
              </div>
            </div>
          </div>
        </div>

        <p v-if="error" class="text-xs text-red-500 font-medium mt-1">{{ error }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                   hover:bg-gray-50 transition cursor-pointer"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="sending || selectedContactIds.length === 0"
            class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white
                   hover:bg-blue-800 disabled:opacity-40 transition flex items-center gap-2 cursor-pointer"
          >
            <svg v-if="sending" class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {{ sending ? 'Enviando…' : 'Enviar a Aduana' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
