<script setup lang="ts">
import { ref, watch } from 'vue'
import { api, type ApiAgent } from '../api'

const props = defineProps<{
  show: boolean
  agent?: ApiAgent | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void
}>()

const certFile = ref<File | null>(null)
const certPassword = ref('')
const certSubmitting = ref(false)
const certErrorMsg = ref<string | null>(null)
const certSuccessMsg = ref<string | null>(null)

watch(
  () => props.show,
  (val) => {
    if (val) {
      certFile.value = null
      certPassword.value = ''
      certErrorMsg.value = null
      certSuccessMsg.value = null
    }
  }
)

function handleCertFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    certFile.value = target.files[0]
  }
}

async function handleUploadCertificate() {
  if (!props.agent || !certFile.value || !certPassword.value) return
  certSubmitting.value = true
  certErrorMsg.value = null
  certSuccessMsg.value = null

  try {
    const cert = await api.certificates.upload(props.agent.id, certFile.value, certPassword.value)
    certSuccessMsg.value = `Certificado "${cert.subject_cn || 'OK'}" cargado exitosamente.`
    certFile.value = null
    certPassword.value = ''
    emit('updated')
  } catch (err: any) {
    certErrorMsg.value = err.message || 'Error al cargar el certificado digital.'
  } finally {
    certSubmitting.value = false
  }
}

async function handleDeleteCertificate() {
  if (!props.agent || !props.agent.certificate) return
  if (!confirm(`¿Está seguro de eliminar el certificado digital de ${props.agent.name}?`)) return

  certSubmitting.value = true
  certErrorMsg.value = null
  certSuccessMsg.value = null

  try {
    await api.certificates.delete(props.agent.id)
    certSuccessMsg.value = 'Certificado digital eliminado.'
    emit('updated')
    emit('close')
  } catch (err: any) {
    certErrorMsg.value = err.message || 'Error al eliminar el certificado digital.'
  } finally {
    certSubmitting.value = false
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
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="text-xl">📜</span>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                Certificado Digital (.pfx)
              </h3>
              <p class="text-xs text-slate-500">Agente: {{ agent?.name }}</p>
            </div>
          </div>
          <button class="text-slate-400 hover:text-slate-600 text-lg p-1" @click="emit('close')">✕</button>
        </div>

        <!-- Alert messages -->
        <div v-if="certErrorMsg" class="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <span>{{ certErrorMsg }}</span>
          <button @click="certErrorMsg = null" class="font-bold ml-2">✕</button>
        </div>

        <div v-if="certSuccessMsg" class="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center justify-between">
          <span>{{ certSuccessMsg }}</span>
          <button @click="certSuccessMsg = null" class="font-bold ml-2">✕</button>
        </div>

        <!-- Active Certificate Display -->
        <div v-if="agent?.certificate" class="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Certificado Activo</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="isExpired(agent.certificate.valid_until) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
            >
              {{ isExpired(agent.certificate.valid_until) ? 'VENCIDO' : 'ACTIVO' }}
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-slate-600">
            <div class="flex justify-between">
              <span class="text-slate-400">Titular (CN):</span>
              <span class="font-semibold text-slate-800">{{ agent.certificate.subject_cn || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Emisor:</span>
              <span class="font-mono text-slate-700 text-[11px] truncate max-w-[240px]" :title="agent.certificate.issuer || ''">{{ agent.certificate.issuer || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Válido desde:</span>
              <span>{{ formatDate(agent.certificate.valid_from) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Válido hasta:</span>
              <span :class="isExpired(agent.certificate.valid_until) ? 'text-rose-600 font-bold' : ''">{{ formatDate(agent.certificate.valid_until) }}</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
            <button
              type="button"
              class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs transition border border-rose-200"
              :disabled="certSubmitting"
              @click="handleDeleteCertificate"
            >
              Eliminar Certificado
            </button>
          </div>
        </div>

        <!-- Upload Certificate Form -->
        <form @submit.prevent="handleUploadCertificate" class="space-y-4">
          <div class="border-t border-slate-100 pt-4">
            <h4 class="text-xs font-bold text-slate-800 mb-2">
              {{ agent?.certificate ? 'Reemplazar Certificado Digital' : 'Cargar Certificado Digital' }}
            </h4>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Archivo Certificado (.pfx / .p12) *</label>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  required
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none"
                  @change="handleCertFileSelect"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Contraseña del Certificado *</label>
                <input
                  v-model="certPassword"
                  type="password"
                  required
                  placeholder="Ingrese la clave del archivo .pfx"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              @click="emit('close')"
            >
              Cerrar
            </button>
            <button
              type="submit"
              :disabled="certSubmitting || !certFile || !certPassword"
              class="px-5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {{ certSubmitting ? 'Cargando y Verificando...' : 'Subir Certificado' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
