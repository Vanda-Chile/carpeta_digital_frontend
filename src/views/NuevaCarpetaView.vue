<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiClient } from '../api'

const router = useRouter()

// ── Dispatch number ───────────────────────────────────────────────────────────
const despachoInput = ref('')
const trimmedDespacho = computed(() => despachoInput.value.trim())

// ── Operation type ────────────────────────────────────────────────────────────
const operacion = ref<'importacion' | 'exportacion'>('importacion')

// ── Client mode ───────────────────────────────────────────────────────────────
const clientMode = ref<'search' | 'manual'>('search')

// Search mode
const searchQuery = ref('')
const searchResults = ref<ApiClient[]>([])
const searching = ref(false)
const selectedClient = ref<ApiClient | null>(null)

// Manual mode
const manualRut = ref('')
const manualRazonSocial = ref('')
const rutError = ref('')

// ── Chilean RUT validation ────────────────────────────────────────────────────
function formatRut(raw: string): string {
  // Keep only digits and k/K, strip everything else
  const clean = raw.replace(/[^\dkK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

function validateRut(rut: string): boolean {
  const clean = rut.replace(/[^\dkK]/g, '').toUpperCase()
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)
  return dv === expected
}

function onRutInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  manualRut.value = formatRut(raw)
  rutError.value = manualRut.value && !validateRut(manualRut.value)
    ? 'RUT inválido'
    : ''
}

// ── Form state ────────────────────────────────────────────────────────────────
const loading = ref(false)
const error = ref('')

// ── Debounced client search ───────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchResults.value = []
  if (!q.trim()) { searching.value = false; return }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await api.clients.search(q.trim())
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

function selectClient(client: ApiClient) {
  selectedClient.value = client
  searchResults.value = []
  searchQuery.value = ''
}

function switchMode(mode: 'search' | 'manual') {
  clientMode.value = mode
  selectedClient.value = null
  searchQuery.value = ''
  searchResults.value = []
  manualRut.value = ''
  manualRazonSocial.value = ''
  rutError.value = ''
  error.value = ''
}

// ── Submit ────────────────────────────────────────────────────────────────────
const canSubmit = computed(() => {
  if (!trimmedDespacho.value) return false
  if (clientMode.value === 'search') return selectedClient.value !== null
  return manualRut.value.trim() !== '' && manualRazonSocial.value.trim() !== '' && validateRut(manualRut.value)
})

async function submit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const payload =
      clientMode.value === 'search'
        ? { numero_despacho: trimmedDespacho.value, operacion: operacion.value, client_rut: selectedClient.value!.rut }
        : {
            numero_despacho: trimmedDespacho.value,
            operacion: operacion.value,
            client_rut: manualRut.value.trim(),
            client_razon_social: manualRazonSocial.value.trim(),
          }
    const folder = await api.folders.create(payload)
    router.push(`/folder/${encodeURIComponent(folder.id)}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al crear la carpeta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader @upload="router.push('/')" />

    <div class="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">

        <p class="text-center text-gray-500 text-sm mb-6">
          Completá los datos para crear una nueva carpeta de despacho
        </p>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">

          <!-- Número de despacho -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="despacho">
              Número de despacho
            </label>
            <input
              id="despacho"
              v-model="despachoInput"
              type="text"
              placeholder="ej. DES-2026-001"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
              @keyup.enter="submit"
            />
          </div>

          <!-- Operación -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="operacion">
              Tipo de operación
            </label>
            <select
              id="operacion"
              v-model="operacion"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              <option value="importacion">Importación</option>
              <option value="exportacion">Exportación</option>
            </select>
          </div>

          <!-- Cliente -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cliente</label>

            <!-- Mode tabs -->
            <div class="flex border-b border-gray-200 mb-4">
              <button
                class="px-4 py-1.5 text-sm font-medium border-b-2 -mb-px transition"
                :class="clientMode === 'search'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'"
                @click="switchMode('search')"
              >
                Buscar
              </button>
              <button
                class="px-4 py-1.5 text-sm font-medium border-b-2 -mb-px transition"
                :class="clientMode === 'manual'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'"
                @click="switchMode('manual')"
              >
                Ingresar manualmente
              </button>
            </div>

            <!-- ── Search mode ── -->
            <div v-if="clientMode === 'search'">
              <!-- Selected client badge -->
              <div
                v-if="selectedClient"
                class="flex items-center justify-between rounded-lg bg-indigo-50
                       border border-indigo-200 px-3 py-2"
              >
                <div class="text-sm">
                  <span class="font-semibold text-indigo-800">{{ selectedClient.rut }}</span>
                  <span class="text-indigo-600 ml-2">{{ selectedClient.razon_social }}</span>
                </div>
                <button
                  class="ml-3 text-indigo-400 hover:text-indigo-700 transition text-xs"
                  title="Quitar cliente"
                  @click="selectedClient = null"
                >✕</button>
              </div>

              <!-- Search input + dropdown -->
              <div v-else class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Buscar por Rut o Razón Social…"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-indigo-500 transition"
                />
                <!-- Spinner -->
                <span
                  v-if="searching"
                  class="absolute right-2.5 top-2.5 text-gray-400 text-xs"
                >…</span>

                <!-- Results dropdown -->
                <ul
                  v-if="searchResults.length > 0"
                  class="absolute z-10 mt-1 w-full bg-white border border-gray-200
                         rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  <li v-for="c in searchResults" :key="c.rut">
                    <button
                      class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition"
                      @click="selectClient(c)"
                    >
                      <span class="font-medium text-gray-800">{{ c.rut }}</span>
                      <span class="text-gray-500 ml-2">{{ c.razon_social }}</span>
                    </button>
                  </li>
                </ul>

                <!-- No results hint -->
                <p
                  v-else-if="searchQuery.trim() && !searching"
                  class="mt-1.5 text-xs text-gray-400"
                >
                  Sin resultados. Probá ingresarlo manualmente.
                </p>
              </div>
            </div>

            <!-- ── Manual mode ── -->
            <div v-else class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1" for="manual-rut">Rut</label>
                <input
                  id="manual-rut"
                  :value="manualRut"
                  type="text"
                  placeholder="ej. 12.345.678-9"
                  class="w-full rounded-lg border px-3 py-2 text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-indigo-500 transition"
                  :class="rutError ? 'border-red-400' : 'border-gray-300'"
                  @input="onRutInput"
                />
                <p v-if="rutError" class="mt-1 text-xs text-red-500">{{ rutError }}</p>
              </div>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1" for="manual-rs">Razón Social</label>
                <input
                  id="manual-rs"
                  v-model="manualRazonSocial"
                  type="text"
                  placeholder="ej. Empresa S.A."
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-indigo-500 transition"
                  @keyup.enter="submit"
                />
              </div>
            </div>
          </div>

          <!-- Error -->
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

          <!-- Submit -->
          <button
            :disabled="!canSubmit || loading"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                   hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   disabled:opacity-40 disabled:cursor-not-allowed transition"
            @click="submit"
          >
            <span v-if="loading">Creando…</span>
            <span v-else>Crear Carpeta</span>
          </button>

        </div>
      </div>
    </div>
  </div>
</template>
