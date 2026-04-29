<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, type ApiDocumentType } from '../api'
import AppHeader from '../components/AppHeader.vue'

const tipos = ref<ApiDocumentType[]>([])
const loading = ref(true)
const errorMsg = ref('')

// Create form
const showCreate = ref(false)
const newNombre = ref('')
const creating = ref(false)
const createError = ref('')

// Edit state
const editingId = ref<number | null>(null)
const editNombre = ref('')
const saving = ref(false)
const saveError = ref('')

const localFilter = ref('')

const filtered = computed(() =>
  localFilter.value.trim()
    ? tipos.value.filter(t =>
        t.nombre.toLowerCase().includes(localFilter.value.toLowerCase())
      )
    : tipos.value
)

onMounted(load)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    tipos.value = await api.documentTypes.listAll()
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'No se pudo cargar.'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const nombre = newNombre.value.trim()
  if (!nombre) return
  creating.value = true
  createError.value = ''
  try {
    const created = await api.documentTypes.create(nombre)
    tipos.value = [...tipos.value, created].sort((a, b) => a.nombre.localeCompare(b.nombre))
    newNombre.value = ''
    showCreate.value = false
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'No se pudo crear.'
  } finally {
    creating.value = false
  }
}

function startEdit(dt: ApiDocumentType) {
  editingId.value = dt.id
  editNombre.value = dt.nombre
  saveError.value = ''
}

function cancelEdit() {
  editingId.value = null
  saveError.value = ''
}

async function saveEdit(dt: ApiDocumentType) {
  const nombre = editNombre.value.trim()
  if (!nombre || nombre === dt.nombre) {
    cancelEdit()
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const updated = await api.documentTypes.update(dt.id, { nombre })
    tipos.value = tipos.value
      .map(t => (t.id === updated.id ? updated : t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    cancelEdit()
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar.'
  } finally {
    saving.value = false
  }
}

async function toggleActivo(dt: ApiDocumentType) {
  try {
    const updated = await api.documentTypes.update(dt.id, { activo: !dt.activo })
    tipos.value = tipos.value.map(t => (t.id === updated.id ? updated : t))
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'No se pudo cambiar el estado.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="max-w-3xl mx-auto px-4 py-8">
      <!-- Page header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-lg font-bold text-gray-900">Tipos de Documento</h1>
          <p class="text-xs text-gray-400 mt-0.5">Administración del catálogo de tipos de documento</p>
        </div>
        <button
          class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white
                 hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @click="showCreate = !showCreate"
        >
          + Nuevo tipo
        </button>
      </div>

      <!-- Create form -->
      <div v-if="showCreate" class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <p class="text-sm font-medium text-gray-700 mb-3">Nuevo tipo de documento</p>
        <div class="flex gap-2">
          <input
            v-model="newNombre"
            type="text"
            placeholder="Nombre del tipo…"
            maxlength="120"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   focus:border-indigo-500 transition"
            @keydown.enter="handleCreate"
            @keydown.esc="showCreate = false"
          />
          <button
            :disabled="!newNombre.trim() || creating"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                   hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleCreate"
          >
            {{ creating ? 'Guardando…' : 'Guardar' }}
          </button>
          <button
            class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            @click="showCreate = false; createError = ''"
          >
            Cancelar
          </button>
        </div>
        <p v-if="createError" class="mt-2 text-xs text-red-600">{{ createError }}</p>
      </div>

      <!-- Filter -->
      <div class="mb-3">
        <input
          v-model="localFilter"
          type="text"
          placeholder="Filtrar tipos…"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                 focus:border-indigo-500 transition"
        />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-16">
        <svg class="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <!-- Error -->
      <p v-else-if="errorMsg" class="text-center py-12 text-sm text-red-500">{{ errorMsg }}</p>

      <!-- Empty -->
      <div v-else-if="tipos.length === 0" class="text-center py-16 text-gray-400 text-sm">
        No hay tipos de documento. Creá el primero.
      </div>

      <!-- Table -->
      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-gray-100 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Nombre
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="dt in filtered"
              :key="dt.id"
              :class="dt.activo ? '' : 'opacity-50'"
            >
              <!-- Nombre (editable) -->
              <td class="px-4 py-3">
                <template v-if="editingId === dt.id">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="editNombre"
                      type="text"
                      maxlength="120"
                      class="rounded-lg border border-indigo-400 px-2 py-1 text-sm text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      @keydown.enter="saveEdit(dt)"
                      @keydown.esc="cancelEdit"
                    />
                    <button
                      :disabled="saving"
                      class="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                      @click="saveEdit(dt)"
                    >
                      {{ saving ? '…' : 'Guardar' }}
                    </button>
                    <button
                      class="text-xs text-gray-400 hover:text-gray-700"
                      @click="cancelEdit"
                    >
                      Cancelar
                    </button>
                  </div>
                  <p v-if="saveError" class="text-xs text-red-600 mt-1">{{ saveError }}</p>
                </template>
                <span v-else class="text-gray-900 font-medium">{{ dt.nombre }}</span>
              </td>

              <!-- Activo badge -->
              <td class="px-4 py-3">
                <span
                  :class="dt.activo
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'"
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                >
                  {{ dt.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="editingId !== dt.id"
                    class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                    @click="startEdit(dt)"
                  >
                    Editar
                  </button>
                  <button
                    class="text-xs transition font-medium"
                    :class="dt.activo
                      ? 'text-amber-600 hover:text-amber-800'
                      : 'text-green-600 hover:text-green-800'"
                    @click="toggleActivo(dt)"
                  >
                    {{ dt.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </td>
            </tr>

            <!-- No filter results -->
            <tr v-if="filtered.length === 0 && localFilter">
              <td colspan="3" class="px-4 py-6 text-center text-sm text-gray-400">
                Sin resultados para "{{ localFilter }}"
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>
