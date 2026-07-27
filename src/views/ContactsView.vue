<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiContact } from '../api'

const router = useRouter()

const contacts = ref<ApiContact[]>([])
const loading = ref(false)
const error = ref('')

// Modal state
const showModal = ref(false)
const editingContact = ref<ApiContact | null>(null)
const formName = ref('')
const formEmail = ref('')
const formError = ref('')
const saving = ref(false)

async function fetchContacts() {
  loading.value = true
  error.value = ''
  try {
    contacts.value = await api.contacts.list()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar contactos'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchContacts()
})

function openCreateModal() {
  editingContact.value = null
  formName.value = ''
  formEmail.value = ''
  formError.value = ''
  showModal.value = true
}

function openEditModal(contact: ApiContact) {
  editingContact.value = contact
  formName.value = contact.name
  formEmail.value = contact.email
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingContact.value = null
}

async function handleSubmit() {
  formError.value = ''
  const name = formName.value.trim()
  const email = formEmail.value.trim()

  if (!name) {
    formError.value = 'Por favor ingresá un nombre.'
    return
  }
  if (!email) {
    formError.value = 'Por favor ingresá un correo electrónico.'
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    formError.value = 'Por favor ingresá un correo electrónico válido.'
    return
  }

  saving.value = true
  try {
    if (editingContact.value) {
      await api.contacts.update(editingContact.value.id, { name, email })
    } else {
      await api.contacts.create({ name, email })
    }
    closeModal()
    await fetchContacts()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Error al guardar el contacto'
  } finally {
    saving.value = false
  }
}

async function handleDelete(contact: ApiContact) {
  if (!confirm(`¿Estás seguro de eliminar el contacto "${contact.name}"?`)) return

  try {
    await api.contacts.delete(contact.id)
    await fetchContacts()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Error al eliminar el contacto')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader show-back @back="router.push('/')" />

    <main class="max-w-7xl mx-auto w-full px-4 py-8">
      <!-- Title & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Contactos Aduana</h1>
          <p class="text-xs text-gray-500 mt-1">Gestión de contactos institucionales de aduana</p>
        </div>
        <button
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          @click="openCreateModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Contacto
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-20">
        <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12 text-sm text-red-500 font-medium">
        {{ error }}
      </div>

      <!-- Empty State -->
      <div v-else-if="contacts.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-500">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-600">No hay contactos registrados</p>
        <p class="text-xs text-gray-400 mt-1">Hacé clic en "+ Nuevo Contacto" para agregar uno</p>
      </div>

      <!-- Contacts Table -->
      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-16">ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Correo Electrónico</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="contact in contacts" :key="contact.id" class="hover:bg-gray-50 transition">
              <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ contact.id }}</td>
              <td class="px-4 py-3 font-semibold text-gray-800">{{ contact.name }}</td>
              <td class="px-4 py-3 text-gray-600">
                <a :href="`mailto:${contact.email}`" class="text-indigo-600 hover:underline">
                  {{ contact.email }}
                </a>
              </td>
              <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                <button
                  class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  @click="openEditModal(contact)"
                >
                  Editar
                </button>
                <button
                  class="text-xs font-semibold text-red-500 hover:text-red-700 transition cursor-pointer"
                  @click="handleDelete(contact)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Create / Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">
            {{ editingContact ? 'Editar Contacto' : 'Nuevo Contacto' }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600 transition" @click="closeModal" aria-label="Cerrar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <div>
            <label for="name" class="block text-xs font-semibold text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="name"
              v-model="formName"
              type="text"
              required
              placeholder="Ej. Juan Pérez"
              class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          </div>

          <div>
            <label for="email" class="block text-xs font-semibold text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              v-model="formEmail"
              type="email"
              required
              placeholder="juan.perez@aduana.cl"
              class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          </div>

          <p v-if="formError" class="text-xs text-red-500 font-medium">{{ formError }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600
                     hover:bg-gray-50 transition cursor-pointer"
              @click="closeModal"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
            >
              <svg v-if="saving" class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
