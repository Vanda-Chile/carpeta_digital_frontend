<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

defineProps<{
  /** Shows the back-chevron button (FolderView) */
  showBack?: boolean
  /** Current folder ID displayed as subtitle (FolderView) */
  subtitle?: string
  /** Secondary subtitle — e.g. client name */
  subtitle2?: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'upload'): void
}>()

const router = useRouter()
const auth = useAuthStore()

const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function goTo(path: string) {
  closeMenu()
  router.push(path)
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Backdrop – closes dropdown on outside click -->
  <Teleport to="body">
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-40"
      aria-hidden="true"
      @click="closeMenu"
    />
  </Teleport>

  <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">

      <!-- Back button -->
      <button
        v-if="showBack"
        class="shrink-0 text-gray-400 hover:text-gray-700 transition focus:outline-none"
        aria-label="Volver"
        @click="emit('back')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"
          viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Logo + App name -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </div>
        <span class="text-sm font-bold text-gray-900 hidden sm:block">Carpeta Digital</span>
      </div>

      <!-- Folder subtitle (FolderView) -->
      <div v-if="subtitle" class="flex items-center gap-1.5 flex-1 min-w-0">
        <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"
          aria-hidden="true">
          <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <div class="min-w-0">
          <h1 class="text-sm font-semibold text-gray-900 truncate" :title="subtitle">
            {{ subtitle }}
          </h1>
          <p v-if="subtitle2" class="text-xs text-gray-500 truncate" :title="subtitle2">
            {{ subtitle2 }}
          </p>
        </div>
      </div>
      <div v-else class="flex-1" />

      <!-- ── Carpetas dropdown ── -->
      <div class="relative z-50">
        <button
          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700
                 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
          :aria-expanded="menuOpen"
          aria-haspopup="true"
          @click="menuOpen = !menuOpen"
        >
          Carpetas
          <svg class="w-4 h-4 text-gray-400 transition-transform"
            :class="menuOpen ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown panel -->
        <transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100
                   py-1 origin-top-right"
            role="menu"
          >
            <!-- Buscar Carpeta -->
            <button
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                     hover:bg-gray-50 transition text-left"
              role="menuitem"
              @click="goTo('/buscar')"
            >
              <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor"
                stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              Buscar Carpeta
            </button>

            <div class="my-1 border-t border-gray-100" />

            <!-- Crear Carpeta -->
            <button
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                     hover:bg-gray-50 transition text-left"
              role="menuitem"
              @click="goTo('/nueva')"
            >
              <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor"
                stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 10v6m-3-3h6M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012
                     2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              Crear Carpeta
            </button>

            <!-- Subir Archivo -->
            <button
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                     hover:bg-gray-50 transition text-left"
              role="menuitem"
              @click="() => { closeMenu(); emit('upload') }"
            >
              <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor"
                stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0
                     0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Subir Archivo
            </button>

            <!-- Admin: Tipos de Documento -->
            <template v-if="auth.username === 'admin'">
              <div class="my-1 border-t border-gray-100" />
              <button
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                       hover:bg-gray-50 transition text-left"
                role="menuitem"
                @click="goTo('/admin/tipos')"
              >
                <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor"
                  stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0
                       00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Tipos de Documento
              </button>
            </template>
          </div>
        </transition>
      </div>

      <!-- Username -->
      <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2"
          viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>{{ auth.username }}</span>
      </div>

      <!-- Logout -->
      <button
        class="shrink-0 text-gray-400 hover:text-gray-700 transition focus:outline-none"
        aria-label="Cerrar sesión"
        @click="logout"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
          viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2
               0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
        </svg>
      </button>

    </div>
  </header>
</template>
