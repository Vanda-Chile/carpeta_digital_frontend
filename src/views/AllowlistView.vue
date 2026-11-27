<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiAllowlistEntry } from '../api'

interface RuleDraft {
  key: number
  id: number | null
  cidr: string
  enabled: boolean
}

interface AllowlistGroup {
  key: string
  name: string
  entries: ApiAllowlistEntry[]
}

const router = useRouter()

const entries = ref<ApiAllowlistEntry[]>([])
const loading = ref(false)
const error = ref('')

const showModal = ref(false)
const editingName = ref<string | null>(null)
const formName = ref('')
const formRules = ref<RuleDraft[]>([])
const formError = ref('')
const saving = ref(false)
let nextRuleKey = 1

const groups = computed<AllowlistGroup[]>(() => {
  const grouped = new Map<string, ApiAllowlistEntry[]>()
  for (const entry of entries.value) {
    const name = entry.label ?? ''
    const rules = grouped.get(name)
    if (rules) rules.push(entry)
    else grouped.set(name, [entry])
  }
  return [...grouped.entries()]
    .sort((left, right) => {
      if (!left[0]) return 1
      if (!right[0]) return -1
      return left[0].localeCompare(right[0], 'es')
    })
    .map(([name, rules]) => ({
      key: name || '__sin_nombre__',
      name,
      entries: [...rules].sort((left, right) => left.cidr.localeCompare(right.cidr)),
    }))
})

function blankRule(): RuleDraft {
  nextRuleKey += 1
  return { key: nextRuleKey, id: null, cidr: '', enabled: true }
}

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
  editingName.value = null
  formName.value = ''
  formRules.value = [blankRule()]
  formError.value = ''
  showModal.value = true
}

function openEditModal(group: AllowlistGroup) {
  editingName.value = group.name
  formName.value = group.name
  formRules.value = group.entries.map((entry) => {
    nextRuleKey += 1
    return { key: nextRuleKey, id: entry.id, cidr: entry.cidr, enabled: entry.enabled }
  })
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingName.value = null
}

function addRule() {
  formRules.value.push(blankRule())
}

function removeRule(key: number) {
  if (formRules.value.length === 1) return
  formRules.value = formRules.value.filter((rule) => rule.key !== key)
}

async function handleSubmit() {
  formError.value = ''
  const name = formName.value.trim()
  if (!name) {
    formError.value = 'Ingresá un nombre para el grupo.'
    return
  }
  const rules = formRules.value.map((rule) => ({
    id: rule.id ?? undefined,
    cidr: rule.cidr.trim(),
    enabled: rule.enabled,
  }))
  if (rules.some((rule) => !rule.cidr)) {
    formError.value = 'Completá todas las direcciones o quitá las filas vacías.'
    return
  }
  if (new Set(rules.map((rule) => rule.cidr)).size !== rules.length) {
    formError.value = 'Hay direcciones repetidas en el grupo.'
    return
  }

  saving.value = true
  try {
    if (editingName.value === null) {
      await api.downloadAllowlist.createGroup({
        name,
        rules: rules.map(({ cidr, enabled }) => ({ cidr, enabled })),
      })
    } else {
      await api.downloadAllowlist.saveGroup({
        name,
        previous_name: editingName.value,
        rules,
      })
    }
    closeModal()
    await fetchEntries()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Error al guardar el grupo'
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

async function handleDeleteGroup(group: AllowlistGroup) {
  const label = group.name || 'Sin nombre'
  if (!confirm(`¿Eliminar el grupo ${label} y sus direcciones?`)) return
  try {
    await api.downloadAllowlist.deleteGroup(group.name)
    await fetchEntries()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Error al eliminar el grupo')
  }
}

function groupTitle(group: AllowlistGroup) {
  return group.name || 'Sin nombre'
}

function ruleCount(group: AllowlistGroup) {
  const count = group.entries.length
  return count === 1 ? '1 dirección' : `${count} direcciones`
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
            Grupos de redes que pueden abrir un enlace de descarga. Cada grupo puede tener varias direcciones.
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
          Nuevo grupo
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

      <div v-else-if="groups.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <p class="text-sm font-medium text-gray-600">No hay direcciones en la lista</p>
        <p class="text-xs text-gray-400 mt-1">Mientras la lista esté vacía, ningún enlace de descarga se puede abrir.</p>
      </div>

      <div v-else class="flex flex-col gap-4">
        <section
          v-for="group in groups"
          :key="group.key"
          class="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white"
        >
          <div class="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-sm font-semibold text-gray-900" :class="{ 'italic text-gray-500': !group.name }">
                {{ groupTitle(group) }}
              </h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ ruleCount(group) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                @click="openEditModal(group)"
              >
                Editar
              </button>
              <button
                class="text-xs font-semibold text-red-500 hover:text-red-700 transition cursor-pointer"
                @click="handleDeleteGroup(group)"
              >
                Eliminar grupo
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-100 text-sm">
              <tbody class="divide-y divide-gray-100">
                <tr v-for="entry in group.entries" :key="entry.id" class="hover:bg-gray-50 transition">
                  <td class="px-4 py-3 font-mono text-xs text-gray-800">{{ entry.cidr }}</td>
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
        </section>
      </div>
    </main>

    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5 max-h-[90vh]">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">
            {{ editingName === null ? 'Nuevo grupo' : 'Editar grupo' }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600 transition" aria-label="Cerrar" @click="closeModal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="flex flex-col gap-4 overflow-y-auto" @submit.prevent="handleSubmit">
          <div>
            <label for="group-name" class="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
            <input
              id="group-name"
              v-model="formName"
              type="text"
              required
              maxlength="120"
              placeholder="Oficina Aduana"
              class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          </div>
          <div class="flex flex-col gap-2">
            <span class="block text-xs font-semibold text-gray-700">Direcciones</span>
            <div v-for="(rule, index) in formRules" :key="rule.key" class="flex items-start gap-2">
              <div class="flex-1 flex flex-col gap-2">
                <label class="sr-only" :for="`cidr-${rule.key}`">Dirección {{ index + 1 }}</label>
                <input
                  :id="`cidr-${rule.key}`"
                  v-model="rule.cidr"
                  type="text"
                  placeholder="186.78.154.70 o 203.0.113.0/24"
                  class="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                />
                <label v-if="editingName !== null" class="flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="rule.enabled" type="checkbox" class="rounded border-gray-300 text-indigo-600" />
                  Habilitada
                </label>
              </div>
              <button
                type="button"
                class="mt-2 text-xs font-semibold text-red-500 hover:text-red-700 transition cursor-pointer disabled:opacity-30"
                :disabled="formRules.length === 1"
                @click="removeRule(rule.key)"
              >
                Quitar
              </button>
            </div>
            <button
              type="button"
              class="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              @click="addRule"
            >
              Agregar dirección
            </button>
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
