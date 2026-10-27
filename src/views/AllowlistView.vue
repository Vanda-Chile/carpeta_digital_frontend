<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiAllowlistEntry } from '../api'

const router = useRouter()

const entries = ref<ApiAllowlistEntry[]>([])
const loading = ref(false)
const error = ref('')

const showModal = ref(false)
const editing = ref<ApiAllowlistEntry | null>(null)
const formCidr = ref('')
const formLabel = ref('')
const formEnabled = ref(true)
const formError = ref('')
const saving = ref(false)

async function fetchEntries() {
  loading.value = true
  error.value = ''
  try {
    entries.value = await api.downloadAllowlist.list()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar las direcciones'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEntries()
})

function openCreateModal() {
  editing.value = null
  formCidr.value = ''
  formLabel.value = ''
  formEnabled.value = true
  formError.value = ''
  showModal.value = true
}

function openEditModal(entry: ApiAllowlistEntry) {
  editing.value = entry
  formCidr.value = entry.cidr
  formLabel.value = entry.label ?? ''
  formEnabled.value = entry.enabled
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function handleSubmit() {
  formError.value = ''
  const cidr = formCidr.value.trim()
  if (!cidr) {
    formError.value = 'Ingresá una dirección IP o un rango CIDR.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      await api.downloadAllowlist.update(editing.value.id, {
        cidr,
        label: formLabel.value.trim(),
        enabled: formEnabled.value,
      })
    } else {
      await api.downloadAllowlist.create({ cidr, label: formLabel.value.trim() })
    }
    closeModal()
    await fetchEntries()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Error al guardar la dirección'
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(entry: ApiAllowlistEntry) {
  try {
    await api.downloadAllowlist.update(entry.id, { enabled: !entry.enabled })
    await fetchEntries()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Error al actualizar la dirección')
  }
}

async function handleDelete(entry: ApiAllowlistEntry) {
  if (!confirm(`¿Eliminar ${entry.cidr} de la lista?`)) return
  try {
    await api.downloadAllowlist.delete(entry.id)
    await fetchEntries()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Error al eliminar la dirección')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader show-back @back="router.push('/')" />

    <main class="max-w-7xl mx-auto w-full px-4 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Direcciones permitidas</h1>
          <p class="text-xs text-gray-500 mt-1">
            Redes que pueden abrir un enlace de descarga. El resto recibe un error de no autorizado.
          </p>
        </div>
        <button
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          @click="openCreateModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva dirección
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <div v-else-if="error" class="text-center py-12 text-sm text-red-500 font-medium">
        {{ error }}
      </div>

      <div v-else-if="entries.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <p class="text-sm font-medium text-gray-600">No hay direcciones en la lista</p>
        <p class="text-xs text-gray-400 mt-1">Mientras la lista esté vacía, ningún enlace de descarga se puede abrir.</p>
      </div>

      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Dirección</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Descripción</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="entry in entries" :key="entry.id" class="hover:bg-gray-50 transition">
              <td class="px-4 py-3 font-mono text-xs text-gray-800">{{ entry.cidr }}</td>
              <td class="px-4 py-3 text-gray-600">{{ entry.label || '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="entry.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ entry.enabled ? 'Habilitada' : 'Deshabilitada' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                <button
                  class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  @click="openEditModal(entry)"
                >
                  Editar
                </button>
                <button
                  class="text-xs font-semibold text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  @click="toggleEnabled(entry)"
                >
                  {{ entry.enabled ? 'Deshabilitar' : 'Habilitar' }}
                </button>
                <button
                  class="text-xs font-semibold text-red-500 hover:text-red-700 transition cursor-pointer"
                  @click="handleDelete(entry)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">
            {{ editing ? 'Editar dirección' : 'Nueva dirección' }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600 transition" aria-label="Cerrar" @click="closeModal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <div>
            <label for="cidr" class="block text-xs font-semibold text-gray-700 mb-1">IP o CIDR</label>
            <input
              id="cidr"
              v-model="formCidr"
              type="text"
              required
              placeholder="186.78.154.70 o 203.0.113.0/24"
              class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          </div>
          <div>
            <label for="label" class="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
            <input
              id="label"
              v-model="formLabel"
              type="text"
              placeholder="Oficina Aduana"
              class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          </div>
          <label v-if="editing" class="flex items-center gap-2 text-sm text-gray-700">
            <input v-model="formEnabled" type="checkbox" class="rounded border-gray-300 text-indigo-600" />
            Habilitada
          </label>
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
                     hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
            >
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
