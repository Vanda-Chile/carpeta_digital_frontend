import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const IAM_URL = (import.meta.env.VITE_IAM_URL as string | undefined) ?? ''
const PRODUCTO_ID = (import.meta.env.VITE_PRODUCTO_ID as string | undefined) ?? ''
const BACKEND_URL = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'http://127.0.0.1:8080'
const GATEWAY_APIKEY = (import.meta.env.VITE_GATEWAY_APIKEY as string | undefined) ?? ''

const KEYS = {
    accessToken: 'cd_access_token',
    refreshToken: 'cd_refresh_token',
    sessionId: 'cd_session_id',
    userInfo: 'cd_user_info',
}

interface UserInfo {
    user_id?: string
    user_name?: string
    name?: string
    email?: string
    nombre?: string
    apellido?: string
    organization_id?: string
    organization_name?: string
    is_admin?: boolean
    isAdmin?: boolean
    system_flag?: boolean
    systemFlag?: boolean
    [key: string]: unknown
}

function decodeJwtPayload(token: string): UserInfo {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const claims = JSON.parse(atob(base64)) as Record<string, any>
        const usuario = (typeof claims.usuario === 'object' && claims.usuario ? claims.usuario : {}) as Record<string, any>

        const userId = claims.userId ?? claims.user_id ?? claims.idUsuario ?? claims.id ?? usuario.id ?? usuario.userId ?? usuario.idUsuario
        const nombre = claims.nombre ?? usuario.nombre ?? ''
        const apellido = claims.apellido ?? usuario.apellido ?? ''
        const fullName = `${nombre} ${apellido}`.trim() || claims.name || usuario.name

        return {
            ...claims,
            user_id: userId ? String(userId) : undefined,
            user_name: fullName || undefined,
        }
    } catch {
        return {}
    }
}

async function fetchOrganizationProfile(token: string) {
    try {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
        }
        if (GATEWAY_APIKEY) headers['apikey'] = GATEWAY_APIKEY

        const res = await fetch(`${BACKEND_URL}/auth/me`, { headers })
        if (res.ok) {
            return await res.json()
        } else {
            console.warn('Failed to fetch /auth/me profile:', res.status, res.statusText)
        }
    } catch (err) {
        console.warn('Error fetching /auth/me profile:', err)
    }
    return null
}

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref<string | null>(sessionStorage.getItem(KEYS.accessToken))
    const refreshToken = ref<string | null>(sessionStorage.getItem(KEYS.refreshToken))
    const sessionId = ref<string | null>(sessionStorage.getItem(KEYS.sessionId))
    const userInfo = ref<UserInfo | null>(
        JSON.parse(sessionStorage.getItem(KEYS.userInfo) ?? 'null'),
    )
    const error = ref<string | null>(null)

    // Auto-refresh profile on page load if token exists
    if (accessToken.value) {
        fetchOrganizationProfile(accessToken.value).then((profile) => {
            if (profile) {
                userInfo.value = {
                    ...(userInfo.value ?? {}),
                    ...profile,
                }
                sessionStorage.setItem(KEYS.userInfo, JSON.stringify(userInfo.value))
            }
        })
    }

    const isAuthenticated = computed(() => accessToken.value !== null)

    const username = computed(() => {
        if (!userInfo.value) return null
        const u = userInfo.value
        if (typeof u.user_name === 'string' && u.user_name.trim()) return u.user_name.trim()
        const usuario = (typeof u.usuario === 'object' && u.usuario ? u.usuario : {}) as Record<string, any>
        const nombre = (u.nombre ?? usuario.nombre ?? '') as string
        const apellido = (u.apellido ?? usuario.apellido ?? '') as string
        const fullName = `${nombre} ${apellido}`.trim()
        if (fullName) return fullName
        return (u.name ?? u.email ?? usuario.email ?? null) as string | null
    })

    const userId = computed(() => {
        if (!userInfo.value) return null
        const u = userInfo.value
        if (u.user_id) return String(u.user_id)
        const usuario = (typeof u.usuario === 'object' && u.usuario ? u.usuario : {}) as Record<string, any>
        const id = u.userId ?? u.idUsuario ?? u.id ?? usuario.id ?? usuario.userId ?? usuario.idUsuario
        return id ? String(id) : null
    })

    const organizationId = computed(() => (userInfo.value?.organization_id ?? userInfo.value?.organizationId ?? null) as string | null)
    const organizationName = computed(() => (userInfo.value?.organization_name ?? userInfo.value?.organizationName ?? null) as string | null)
    const isAdmin = computed(() => Boolean(userInfo.value?.isAdmin ?? userInfo.value?.is_admin ?? false))
    const systemFlag = computed(() => Boolean(userInfo.value?.systemFlag ?? userInfo.value?.system_flag ?? false))

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
            sessionStorage.setItem(KEYS.accessToken, finalToken)

            const jwtClaims = decodeJwtPayload(finalToken)
            const backendProfile = await fetchOrganizationProfile(finalToken)

            userInfo.value = {
                ...jwtClaims,
                ...(backendProfile ?? {}),
            }

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

    return {
        accessToken,
        refreshToken,
        sessionId,
        userInfo,
        username,
        userId,
        organizationId,
        organizationName,
        isAdmin,
        systemFlag,
        isAuthenticated,
        error,
        login,
        logout,
    }
})
