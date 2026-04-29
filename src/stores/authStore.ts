import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const IAM_URL = (import.meta.env.VITE_IAM_URL as string | undefined) ?? ''
const PRODUCTO_ID = (import.meta.env.VITE_PRODUCTO_ID as string | undefined) ?? ''

const KEYS = {
    accessToken: 'cd_access_token',
    refreshToken: 'cd_refresh_token',
    sessionId: 'cd_session_id',
    userInfo: 'cd_user_info',
}

interface UserInfo {
    name?: string
    email?: string
    [key: string]: unknown
}

function decodeJwtPayload(token: string): UserInfo {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(base64))
    } catch {
        return {}
    }
}

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref<string | null>(sessionStorage.getItem(KEYS.accessToken))
    const refreshToken = ref<string | null>(sessionStorage.getItem(KEYS.refreshToken))
    const sessionId = ref<string | null>(sessionStorage.getItem(KEYS.sessionId))
    const userInfo = ref<UserInfo | null>(
        JSON.parse(sessionStorage.getItem(KEYS.userInfo) ?? 'null'),
    )
    const error = ref<string | null>(null)

    const isAuthenticated = computed(() => accessToken.value !== null)
    const username = computed(() => userInfo.value?.name ?? userInfo.value?.email ?? null)

    async function login(email: string, password: string): Promise<boolean> {
        error.value = null
        try {
            // Step 1: authenticate with email + password
            const loginRes = await fetch(`${IAM_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            if (!loginRes.ok) {
                const body = await loginRes.json().catch(() => ({}))
                error.value = body?.detail ?? body?.message ?? 'Usuario o contraseña incorrectos.'
                return false
            }
            const loginData = await loginRes.json()
            const initialToken: string = loginData.access_token ?? loginData.accessToken ?? ''
            refreshToken.value = loginData.refresh_token ?? loginData.refreshToken ?? null
            sessionId.value = loginData.session_id ?? loginData.sessionId ?? null

            if (refreshToken.value) sessionStorage.setItem(KEYS.refreshToken, refreshToken.value)
            if (sessionId.value) sessionStorage.setItem(KEYS.sessionId, sessionId.value)

            // Step 2: switch to the product to get the final scoped JWT
            const switchRes = await fetch(`${IAM_URL}/auth/switch-product`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${initialToken}`,
                },
                body: JSON.stringify({ productoId: PRODUCTO_ID }),
            })
            if (!switchRes.ok) {
                const body = await switchRes.json().catch(() => ({}))
                error.value = body?.detail ?? body?.message ?? 'Error al seleccionar producto.'
                return false
            }
            const switchData = await switchRes.json()
            const finalToken: string = switchData.access_token ?? switchData.accessToken ?? ''

            accessToken.value = finalToken
            userInfo.value = decodeJwtPayload(finalToken)

            sessionStorage.setItem(KEYS.accessToken, finalToken)
            sessionStorage.setItem(KEYS.userInfo, JSON.stringify(userInfo.value))
            return true
        } catch {
            error.value = 'Error de conexión con el servidor.'
            return false
        }
    }

    function logout() {
        accessToken.value = null
        refreshToken.value = null
        sessionId.value = null
        userInfo.value = null
        error.value = null
        Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k))
    }

    return { accessToken, refreshToken, sessionId, userInfo, username, isAuthenticated, error, login, logout }
})
