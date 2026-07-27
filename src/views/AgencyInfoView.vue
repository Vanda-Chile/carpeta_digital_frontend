<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { api, type ApiAgencyDetails, type ApiAgent } from '../api'

const router = useRouter()
const agency = ref<ApiAgencyDetails | null>(null)
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Modal state
const showAgentModal = ref(false)
const editingAgent = ref<ApiAgent | null>(null)
const agentName = ref('')
const agentCode = ref('')
const agentRut = ref('')
const agentPin = ref(false)
const agentSlot = ref(false)
const submitting = ref(false)

async function loadAgencyInfo() {
  loading.value = true
  errorMsg.value = null
  try {
    agency.value = await api.agents.getMyAgency()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al cargar los datos de la agencia.'
  } finally {
    loading.value = false
  }
}

function openCreateAgentModal() {
  editingAgent.value = null
  agentName.value = ''
  agentCode.value = ''
  agentRut.value = ''
  agentPin.value = false
  agentSlot.value = false
  showAgentModal.value = true
}

function openEditAgentModal(agent: ApiAgent) {
  editingAgent.value = agent
  agentName.value = agent.name
  agentCode.value = agent.code || ''
  agentRut.value = agent.rut || ''
  agentPin.value = agent.pin
  agentSlot.value = agent.slot
  showAgentModal.value = true
}

async function handleSaveAgent() {
  const nameClean = agentName.value.trim()
  if (!nameClean) return

  submitting.value = true
  errorMsg.value = null
  try {
    if (editingAgent.value) {
      await api.agents.update(editingAgent.value.id, {
        name: nameClean,
        code: agentCode.value.trim() || undefined,
        rut: agentRut.value.trim() || undefined,
        pin: agentPin.value,
        slot: agentSlot.value,
      })
      successMsg.value = `Agente "${nameClean}" actualizado correctamente.`
    } else {
      await api.agents.create({
        name: nameClean,
        code: agentCode.value.trim() || undefined,
        rut: agentRut.value.trim() || undefined,
        pin: agentPin.value,
        slot: agentSlot.value,
      })
      successMsg.value = `Agente "${nameClean}" creado exitosamente.`
    }
    showAgentModal.value = false
    await loadAgencyInfo()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al guardar el agente.'
  } finally {
    submitting.value = false
  }
}

async function handleDeleteAgent(agent: ApiAgent) {
  if (!confirm(`¿Está seguro de eliminar al agente "${agent.name}"?`)) return

  try {
    await api.agents.delete(agent.id)
    successMsg.value = `Agente "${agent.name}" eliminado.`
    await loadAgencyInfo()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al eliminar el agente.'
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  successMsg.value = 'Texto copiado al portapapeles'
  setTimeout(() => (successMsg.value = null), 3000)
}

onMounted(() => {
  loadAgencyInfo()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <AppHeader />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
      <!-- Top Title Bar -->
      <div class="mb-8">
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Datos de la Agencia</h1>
        <p class="text-sm text-slate-500 mt-1">
          Consulte la información organizacional y administre la nómina de agentes asociados.
        </p>
      </div>

      <!-- Alerts -->
      <div v-if="successMsg" class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
        <span>{{ successMsg }}</span>
        <button class="text-emerald-600 hover:text-emerald-900 font-bold" @click="successMsg = null">✕</button>
      </div>
      <div v-if="errorMsg" class="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
        <span>{{ errorMsg }}</span>
        <button class="text-rose-600 hover:text-rose-900 font-bold" @click="errorMsg = null">✕</button>
      </div>

      <!-- Loading Spinner -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>

      <template v-else-if="agency">
        <!-- ── Agency Information Header Card ── -->
        <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Organización</span>
              <h2 class="text-2xl font-black text-slate-900 mt-0.5">{{ agency.name }}</h2>
            </div>
            <span
              v-if="agency.systemFlag"
              class="self-start sm:self-auto inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold px-3 py-1 rounded-full"
            >
              <svg class="w-2.5 h-2.5 text-indigo-600 fill-current" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Organización del Sistema
            </span>
            <span
              v-else
              class="self-start sm:self-auto inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium px-3 py-1 rounded-full"
            >
              Organización Estándar
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            <!-- Code -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Código de Agencia</span>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-sm font-bold text-slate-800">{{ agency.code || 'Sin código asignado' }}</span>
                <button
                  v-if="agency.code"
                  class="text-slate-400 hover:text-indigo-600 p-1"
                  title="Copiar código"
                  @click="copyToClipboard(agency.code!)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- ID -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ID Organizacional</span>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-xs text-slate-600 truncate" :title="agency.id">{{ agency.id }}</span>
                <button
                  class="text-slate-400 hover:text-indigo-600 p-1 shrink-0"
                  title="Copiar ID"
                  @click="copyToClipboard(agency.id)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Total Agents -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Agentes Registrados</span>
              <span class="text-xl font-black text-indigo-600">{{ agency.agents.length }}</span>
            </div>
          </div>
        </div>

        <!-- ── Agents Section ── -->
        <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Agentes Asociados</h3>
              <p class="text-xs text-slate-500">Listado de agentes aduanales vinculados a esta organización con sus flags de PIN y Slot.</p>
            </div>
            <button
              class="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 self-start sm:self-auto"
              @click="openCreateAgentModal"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Agente
            </button>
          </div>

          <!-- Empty State -->
          <div v-if="agency.agents.length === 0" class="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 inline-flex items-center justify-center mb-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 class="text-sm font-bold text-slate-700 mb-1">No hay agentes asociados</h4>
            <p class="text-xs text-slate-400 mb-4">Agregue agentes aduanales a la organización usando el botón superior.</p>
            <button
              class="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
              @click="openCreateAgentModal"
            >
              Crear Primer Agente
            </button>
          </div>

          <!-- Agents Table -->
          <div v-else class="overflow-x-auto border border-slate-100 rounded-2xl">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th class="py-3.5 px-4">Nombre</th>
                  <th class="py-3.5 px-4">Código</th>
                  <th class="py-3.5 px-4">RUT</th>
                  <th class="py-3.5 px-4">Flags</th>
                  <th class="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                <tr v-for="agent in agency.agents" :key="agent.id" class="hover:bg-slate-50/80 transition">
                  <td class="py-3.5 px-4 font-semibold text-slate-900">
                    {{ agent.name }}
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-600">
                    {{ agent.code || '-' }}
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-600">
                    {{ agent.rut || '-' }}
                  </td>
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                      <span
                        class="px-2 py-0.5 rounded text-[11px] font-semibold"
                        :class="agent.pin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        PIN: {{ agent.pin ? 'Sí' : 'No' }}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded text-[11px] font-semibold"
                        :class="agent.slot ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                      >
                        SLOT: {{ agent.slot ? 'Sí' : 'No' }}
                      </span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="inline-flex items-center gap-2">
                      <button
                        class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                        title="Ver carpetas asociadas a este agente"
                        @click="router.push(`/buscar?agent_id=${agent.id}`)"
                      >
                        Ver Carpetas
                      </button>
                      <button
                        class="text-indigo-600 hover:text-indigo-900 font-semibold p-1"
                        title="Editar agente"
                        @click="openEditAgentModal(agent)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        class="text-rose-500 hover:text-rose-700 p-1"
                        title="Eliminar agente"
                        @click="handleDeleteAgent(agent)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Modal: Create / Edit Agent ── -->
        <Teleport to="body">
          <div v-if="showAgentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div class="flex items-center justify-between mb-5">
                <h3 class="text-lg font-bold text-slate-900">
                  {{ editingAgent ? 'Editar Agente' : 'Nuevo Agente' }}
                </h3>
                <button class="text-slate-400 hover:text-slate-600 text-lg p-1" @click="showAgentModal = false">✕</button>
              </div>

              <form @submit.prevent="handleSaveAgent" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre del Agente *</label>
                  <input
                    v-model="agentName"
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Código</label>
                    <input
                      v-model="agentCode"
                      type="text"
                      placeholder="Ej: AGT-01"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">RUT</label>
                    <input
                      v-model="agentRut"
                      type="text"
                      placeholder="Ej: 12345678-9"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <label for="pinCheck" class="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Flag PIN
                    </label>
                    <input
                      id="pinCheck"
                      v-model="agentPin"
                      type="checkbox"
                      class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </div>

                  <div class="flex items-center justify-between border-t border-slate-200/60 pt-3">
                    <label for="slotCheck" class="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Flag Slot
                    </label>
                    <input
                      id="slotCheck"
                      v-model="agentSlot"
                      type="checkbox"
                      class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                    @click="showAgentModal = false"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    :disabled="submitting || !agentName.trim()"
                    class="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {{ submitting ? 'Guardando...' : (editingAgent ? 'Guardar Cambios' : 'Crear Agente') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Teleport>
      </template>
    </main>
  </div>
</template>
