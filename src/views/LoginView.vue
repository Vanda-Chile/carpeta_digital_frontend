<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)

async function handleLogin() {
  if (!email.value.trim() || !password.value) return
  isLoading.value = true
  const ok = await auth.login(email.value.trim(), password.value)
  isLoading.value = false
  if (ok) router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">

      <!-- Logo / brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Carpeta Digital</h1>
        <p class="mt-1 text-sm text-gray-500">Iniciá sesión para continuar</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <form class="space-y-4" @submit.prevent="handleLogin">

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="login-email">
              Email
            </label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="tu@email.com"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-indigo-500 transition"
            />
          </div>

          <!-- Contraseña -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="login-pass">
              Contraseña
            </label>
            <div class="relative">
              <input
                id="login-pass"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-indigo-500 transition"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400
                       hover:text-gray-600 focus:outline-none"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <!-- Eye open -->
                <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor"
                  stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943
                       9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <!-- Eye closed -->
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor"
                  stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7
                       a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477
                       0 8.268 2.943 9.542 7a9.965 9.965 0 01-1.357 2.674M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Error -->
          <p v-if="auth.error" role="alert"
            class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {{ auth.error }}
          </p>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!email.trim() || !password || isLoading"
            class="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white
                   hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center
                   justify-center gap-2"
          >
            <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"
              aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            {{ isLoading ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>
      </div>

    </div>
  </div>
</template>
