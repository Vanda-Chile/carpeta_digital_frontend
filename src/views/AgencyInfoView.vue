<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AgentModal from '../components/AgentModal.vue'
import CertificateModal from '../components/CertificateModal.vue'
import { api, type ApiAgencyDetails, type ApiAgent } from '../api'

const router = useRouter()
const agency = ref<ApiAgencyDetails | null>(null)
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Agent Modal state
const showAgentModal = ref(false)
const editingAgent = ref<ApiAgent | null>(null)

// Certificate Modal state
const showCertModal = ref(false)
const certAgent = ref<ApiAgent | null>(null)

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
  showAgentModal.value = true
}

function openEditAgentModal(agent: ApiAgent) {
  editingAgent.value = agent
  showAgentModal.value = true
}

function openCertModal(agent: ApiAgent) {
  certAgent.value = agent
  showCertModal.value = true
}

async function handleAgentSaved() {
  successMsg.value = editingAgent.value
    ? `Agente "${editingAgent.value.name}" actualizado correctamente.`
    : 'Agente registrado exitosamente.'
  await loadAgencyInfo()
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

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function isExpired(validUntil?: string | null): boolean {
  if (!validUntil) return false
  return new Date(validUntil).getTime() < Date.now()
}

onMounted(() => {
  loadAgencyInfo()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
    <AppHeader />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Top Bar: Title & Action -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Datos Agencia</h1>
            <span
              v-if="agency?.systemFlag"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"
            >
              ADMINISTRADOR SISTEMA
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Información de la organización y gestión de agentes aduanales asociados.
          </p>
        </div>

        <button
          v-if="agency"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          @click="openCreateAgentModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Agente
        </button>
      </div>

      <!-- Feedback Messages -->
      <div v-if="errorMsg" class="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center justify-between shadow-xs">
        <span>{{ errorMsg }}</span>
        <button @click="errorMsg = null" class="font-bold ml-2 text-rose-500 hover:text-rose-700">✕</button>
      </div>

      <div v-if="successMsg" class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex items-center justify-between shadow-xs">
        <span>{{ successMsg }}</span>
        <button @click="successMsg = null" class="font-bold ml-2 text-emerald-500 hover:text-emerald-700">✕</button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-24">
        <svg class="animate-spin w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <template v-else-if="agency">
        <!-- Organization Info Banner Card -->
        <div class="bg-white rounded-3xl p-6 mb-8 border border-slate-100 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Organización</span>
              <span class="text-base font-bold text-slate-900">{{ agency.name }}</span>
            </div>

            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Código Organización</span>
              <span class="text-sm font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                {{ agency.code || 'Sin código' }}
              </span>
            </div>

            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ID Sistema</span>
              <span class="text-xs font-mono text-slate-500 truncate block select-all" :title="agency.id">
                {{ agency.id }}
              </span>
            </div>
          </div>
        </div>

        <!-- Section: Agents -->
        <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-base font-bold text-slate-900">Agentes Aduanales</h3>
              <p class="text-xs text-slate-500">Agentes vinculados a esta organización</p>
            </div>
            <span class="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
              Total: {{ agency.agents.length }}
            </span>
          </div>

          <!-- Empty Agents State -->
          <div v-if="agency.agents.length === 0" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
                  <th class="py-3.5 px-4">Certificado Digital</th>
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
                  <td class="py-3.5 px-4">
                    <div v-if="agent.certificate" class="flex flex-col gap-0.5">
                      <div class="flex items-center gap-1.5">
                        <span
                          class="inline-block w-2 h-2 rounded-full"
                          :class="isExpired(agent.certificate.valid_until) ? 'bg-rose-500' : 'bg-emerald-500'"
                        ></span>
                        <span class="font-medium text-slate-800">
                          {{ agent.certificate.subject_cn || 'Certificado X.509' }}
                        </span>
                      </div>
                      <span
                        class="text-[10px]"
                        :class="isExpired(agent.certificate.valid_until) ? 'text-rose-600 font-semibold' : 'text-slate-400'"
                      >
                        {{ isExpired(agent.certificate.valid_until) ? '⚠️ Expirado' : `Vence: ${formatDate(agent.certificate.valid_until)}` }}
                      </span>
                    </div>
                    <span v-else class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                      Sin Certificado
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="inline-flex items-center gap-2">
                      <button
                        class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition flex items-center gap-1"
                        title="Gestionar certificado digital (.pfx)"
                        @click="openCertModal(agent)"
                      >
                        <span>📜</span>
                        <span>Certificado</span>
                      </button>
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
        <AgentModal
          :show="showAgentModal"
          :agent="editingAgent"
          @close="showAgentModal = false"
          @saved="handleAgentSaved"
        />

        <!-- ── Modal: Manage Digital Certificate ── -->
        <CertificateModal
          :show="showCertModal"
          :agent="certAgent"
          @close="showCertModal = false"
          @updated="loadAgencyInfo"
        />
      </template>
    </main>
  </div>
</template>
