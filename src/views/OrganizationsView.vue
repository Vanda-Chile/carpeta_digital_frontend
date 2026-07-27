<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useAuthStore } from '../stores/authStore'
import { api, type ApiOrganization, type ApiOrganizationUser } from '../api'

const router = useRouter()
const auth = useAuthStore()

const organizations = ref<ApiOrganization[]>([])
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Create Org Modal
const showCreateModal = ref(false)
const newOrgName = ref('')
const newOrgCode = ref('')
const newOrgSystemFlag = ref(false)
const submittingOrg = ref(false)

// Manage Users Modal
const selectedOrg = ref<ApiOrganization | null>(null)
const showUsersModal = ref(false)
const newUserId = ref('')
const newUserIsAdmin = ref(false)
const submittingUser = ref(false)

const isSystemUser = computed(() => auth.systemFlag)

async function loadOrganizations() {
  if (!isSystemUser.value) {
    loading.value = false
    return
  }
  loading.value = true
  errorMsg.value = null
  try {
    organizations.value = await api.organizations.list()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al cargar organizaciones.'
  } finally {
    loading.value = false
  }
}

async function handleCreateOrganization() {
  const name = newOrgName.value.trim()
  if (!name) return

  submittingOrg.value = true
  errorMsg.value = null
  try {
    await api.organizations.create({
      name,
      code: newOrgCode.value.trim() || undefined,
      systemFlag: newOrgSystemFlag.value,
    })
    successMsg.value = `Organización "${name}" creada exitosamente.`
    newOrgName.value = ''
    newOrgCode.value = ''
    newOrgSystemFlag.value = false
    showCreateModal.value = false
    await loadOrganizations()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al crear la organización.'
  } finally {
    submittingOrg.value = false
  }
}

function openManageUsers(org: ApiOrganization) {
  selectedOrg.value = org
  newUserId.value = ''
  newUserIsAdmin.value = false
  showUsersModal.value = true
}

async function handleAddUser() {
  if (!selectedOrg.value) return
  const userIdClean = newUserId.value.trim()
  if (!userIdClean) return

  submittingUser.value = true
  errorMsg.value = null
  try {
    await api.organizations.addUser(selectedOrg.value.id, {
      user_id: userIdClean,
      is_admin: newUserIsAdmin.value,
    })
    successMsg.value = `Usuario asignado correctamente a ${selectedOrg.value.name}.`
    newUserId.value = ''
    newUserIsAdmin.value = false
    await loadOrganizations()
    // Refresh current selected org
    const updated = organizations.value.find((o) => o.id === selectedOrg.value?.id)
    if (updated) selectedOrg.value = updated
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al asignar usuario a la organización.'
  } finally {
    submittingUser.value = false
  }
}

async function handleToggleAdmin(user: ApiOrganizationUser) {
  if (!selectedOrg.value) return
  try {
    await api.organizations.updateUser(selectedOrg.value.id, user.user_id, {
      user_id: user.user_id,
      is_admin: !user.is_admin,
    })
    await loadOrganizations()
    const updated = organizations.value.find((o) => o.id === selectedOrg.value?.id)
    if (updated) selectedOrg.value = updated
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al actualizar permisos.'
  }
}

async function handleRemoveUser(userId: string) {
  if (!selectedOrg.value) return
  if (!confirm(`¿Está seguro de remover el usuario de ${selectedOrg.value.name}?`)) return

  try {
    await api.organizations.removeUser(selectedOrg.value.id, userId)
    successMsg.value = 'Usuario removido de la organización.'
    await loadOrganizations()
    const updated = organizations.value.find((o) => o.id === selectedOrg.value?.id)
    if (updated) selectedOrg.value = updated
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al remover el usuario.'
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  successMsg.value = 'ID copiado al portapapeles'
  setTimeout(() => (successMsg.value = null), 3000)
}

onMounted(() => {
  loadOrganizations()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <AppHeader />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
      <!-- ── Restricted Access Banner ── -->
      <div v-if="!isSystemUser" class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 mb-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
        <p class="text-sm text-gray-600 mb-6">
          Esta vista de administración está disponible únicamente para usuarios del sistema (<code class="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-xs">systemFlag: true</code>).
        </p>
        <button
          class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          @click="router.push('/')"
        >
          Volver al Inicio
        </button>
      </div>

      <template v-else>
        <!-- Top Title & Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Administración de Organizaciones</h1>
            <p class="text-sm text-slate-500 mt-1">
              Cree organizaciones, configure flags del sistema y gestione accesos de usuarios.
            </p>
          </div>
          <button
            class="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition active:scale-95"
            @click="showCreateModal = true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Organización
          </button>
        </div>

        <!-- Alert messages -->
        <div v-if="successMsg" class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{{ successMsg }}</span>
          <button class="text-emerald-600 hover:text-emerald-900 font-bold" @click="successMsg = null">✕</button>
        </div>
        <div v-if="errorMsg" class="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center justify-between">
          <span>{{ errorMsg }}</span>
          <button class="text-rose-600 hover:text-rose-900 font-bold" @click="errorMsg = null">✕</button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="organizations.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 inline-flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">No hay organizaciones registradas</h3>
          <p class="text-sm text-slate-500 mb-6">Comience creando la primera organización en el sistema.</p>
          <button
            class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            @click="showCreateModal = true"
          >
            Crear Organización
          </button>
        </div>

        <!-- Organizations Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="org in organizations"
            :key="org.id"
            class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between gap-3 mb-3">
                <h3 class="text-lg font-bold text-slate-900 truncate" :title="org.name">{{ org.name }}</h3>
                <span
                  v-if="org.systemFlag"
                  class="shrink-0 inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold px-2.5 py-1 rounded-full"
                >
                  <svg class="w-3 h-3 text-indigo-500 fill-current" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  Sistema
                </span>
                <span
                  v-else
                  class="shrink-0 inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  Estándar
                </span>
              </div>

              <!-- Organization Code Badge -->
              <div v-if="org.code" class="mb-2">
                <span class="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                  Código: {{ org.code }}
                </span>
              </div>

              <!-- ID UUID -->
              <div class="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs font-mono text-slate-500">
                <span class="truncate flex-1" :title="org.id">ID: {{ org.id }}</span>
                <button
                  class="text-slate-400 hover:text-indigo-600 p-1"
                  title="Copiar ID"
                  @click="copyToClipboard(org.id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              <!-- User count badge -->
              <div class="flex items-center gap-2 text-xs text-slate-500 mb-6">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span><strong>{{ org.user_count }}</strong> usuarios asignados</span>
              </div>
            </div>

            <button
              class="w-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold text-xs py-2.5 rounded-xl border border-slate-200 hover:border-indigo-200 transition flex items-center justify-center gap-2"
              @click="openManageUsers(org)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Gestionar Usuarios
            </button>
          </div>
        </div>

        <!-- ── Modal: Create Organization ── -->
        <Teleport to="body">
          <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all">
              <div class="flex items-center justify-between mb-5">
                <h3 class="text-lg font-bold text-slate-900">Nueva Organización</h3>
                <button class="text-slate-400 hover:text-slate-600 text-lg p-1" @click="showCreateModal = false">✕</button>
              </div>

              <form @submit.prevent="handleCreateOrganization" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Organización</label>
                  <input
                    v-model="newOrgName"
                    type="text"
                    required
                    placeholder="Ej: Agencia VANDA"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Código (Alfanumérico, máx 50 caracteres)</label>
                  <input
                    v-model="newOrgCode"
                    type="text"
                    maxlength="50"
                    placeholder="Ej: ORG-VANDA-01"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <input
                    id="systemFlagCheck"
                    v-model="newOrgSystemFlag"
                    type="checkbox"
                    class="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label for="systemFlagCheck" class="text-xs text-slate-700 cursor-pointer select-none">
                    <strong class="block text-slate-900">Organización del Sistema (systemFlag)</strong>
                    Otorga acceso completo a la gestión del sistema y carpetas globales.
                  </label>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                    @click="showCreateModal = false"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    :disabled="submittingOrg || !newOrgName.trim()"
                    class="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {{ submittingOrg ? 'Guardando...' : 'Crear Organización' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Teleport>

        <!-- ── Modal: Manage Users of Organization ── -->
        <Teleport to="body">
          <div v-if="showUsersModal && selectedOrg" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
              <!-- Modal Header -->
              <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 class="text-lg font-bold text-slate-900">Usuarios de {{ selectedOrg.name }}</h3>
                  <p class="text-xs text-slate-500">Asigne usuarios pegando su ID y defina sus permisos de administración (<code class="bg-slate-100 px-1 rounded text-slate-700 font-mono">isAdmin</code>).</p>
                </div>
                <button class="text-slate-400 hover:text-slate-600 text-lg p-1" @click="showUsersModal = false">✕</button>
              </div>

              <!-- Add User Form -->
              <form @submit.prevent="handleAddUser" class="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-end gap-3">
                <div class="flex-1 w-full">
                  <label class="block text-xs font-semibold text-slate-700 mb-1">ID de Usuario (UUID / External ID)</label>
                  <input
                    v-model="newUserId"
                    type="text"
                    required
                    placeholder="Pegue aquí el ID del usuario"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div class="flex items-center gap-2 pb-2.5">
                  <input
                    id="isAdminCheck"
                    v-model="newUserIsAdmin"
                    type="checkbox"
                    class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label for="isAdminCheck" class="text-xs font-semibold text-slate-700 cursor-pointer select-none whitespace-nowrap">
                    isAdmin
                  </label>
                </div>

                <button
                  type="submit"
                  :disabled="submittingUser || !newUserId.trim()"
                  class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shrink-0"
                >
                  {{ submittingUser ? 'Asignando...' : 'Asignar Usuario' }}
                </button>
              </form>

              <!-- Assigned Users List -->
              <div class="flex-1 overflow-y-auto min-h-[200px]">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Usuarios Asignados ({{ selectedOrg.users.length }})</h4>
                <div v-if="selectedOrg.users.length === 0" class="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No hay usuarios asignados a esta organización.
                </div>
                <div v-else class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    v-for="user in selectedOrg.users"
                    :key="user.id"
                    class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-xs font-bold">
                        {{ user.user_id.slice(0, 2).toUpperCase() }}
                      </div>
                      <div>
                        <div class="text-xs font-mono font-semibold text-slate-800">{{ user.user_id }}</div>
                        <div class="text-[11px] text-slate-400">Asignación ID: {{ user.id }}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-3">
                      <button
                        class="px-2.5 py-1 rounded-full text-xs font-semibold transition border"
                        :class="user.is_admin ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'"
                        :title="user.is_admin ? 'Quitar privilegios isAdmin' : 'Otorgar privilegios isAdmin'"
                        @click="handleToggleAdmin(user)"
                      >
                        {{ user.is_admin ? 'isAdmin: Si' : 'isAdmin: No' }}
                      </button>

                      <button
                        class="text-rose-500 hover:text-rose-700 p-1 transition"
                        title="Remover usuario"
                        @click="handleRemoveUser(user.user_id)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  @click="showUsersModal = false"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </template>
    </main>
  </div>
</template>
