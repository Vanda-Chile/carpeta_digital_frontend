<script setup lang="ts">
import { ref, watch } from 'vue'
import { api, type ApiAgent } from '../api'

const props = defineProps<{
  show: boolean
  agent?: ApiAgent | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const agentName = ref('')
const agentCode = ref('')
const agentRut = ref('')
const agentPin = ref(false)
const agentSlot = ref(false)
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

watch(
  () => [props.show, props.agent],
  () => {
    if (props.show) {
      errorMsg.value = null
      if (props.agent) {
        agentName.value = props.agent.name
        agentCode.value = props.agent.code || ''
        agentRut.value = props.agent.rut || ''
        agentPin.value = props.agent.pin
        agentSlot.value = props.agent.slot
      } else {
        agentName.value = ''
        agentCode.value = ''
        agentRut.value = ''
        agentPin.value = false
        agentSlot.value = false
      }
    }
  },
  { immediate: true }
)

async function handleSaveAgent() {
  const nameClean = agentName.value.trim()
  if (!nameClean) return

  submitting.value = true
  errorMsg.value = null
  try {
    if (props.agent) {
      await api.agents.update(props.agent.id, {
        name: nameClean,
        code: agentCode.value.trim() || undefined,
        rut: agentRut.value.trim() || undefined,
        pin: agentPin.value,
        slot: agentSlot.value,
      })
    } else {
      await api.agents.create({
        name: nameClean,
        code: agentCode.value.trim() || undefined,
        rut: agentRut.value.trim() || undefined,
        pin: agentPin.value,
        slot: agentSlot.value,
      })
    }
    emit('saved')
    emit('close')
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al guardar el agente.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-slate-900">
            {{ agent ? 'Editar Agente' : 'Nuevo Agente' }}
          </h3>
          <button class="text-slate-400 hover:text-slate-600 text-lg p-1" @click="emit('close')">✕</button>
        </div>

        <div v-if="errorMsg" class="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <span>{{ errorMsg }}</span>
          <button @click="errorMsg = null" class="font-bold ml-2">✕</button>
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
                placeholder="Ej: 12.345.678-9"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 space-y-2">
            <span class="block text-xs font-semibold text-slate-700 mb-1">Flags</span>

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
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submitting || !agentName.trim()"
              class="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {{ submitting ? 'Guardando...' : (agent ? 'Guardar Cambios' : 'Crear Agente') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
