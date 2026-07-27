import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FolderView from '../views/FolderView.vue'
import DocumentView from '../views/DocumentView.vue'
import LoginView from '../views/LoginView.vue'
import SearchView from '../views/SearchView.vue'
import NuevaCarpetaView from '../views/NuevaCarpetaView.vue'
import ContactsView from '../views/ContactsView.vue'
import RevisionsView from '../views/RevisionsView.vue'
import OrganizationsView from '../views/OrganizationsView.vue'
import AgencyInfoView from '../views/AgencyInfoView.vue'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/login', component: LoginView, meta: { public: true } },
        { path: '/', component: HomeView },
        { path: '/folder/:id', component: FolderView },
        { path: '/folder/:id/document/:docId', component: DocumentView },
        { path: '/buscar', component: SearchView },
        { path: '/buscar-revisiones', component: RevisionsView },
        { path: '/nueva', component: NuevaCarpetaView },
        { path: '/contacts', component: ContactsView },
        { path: '/info-organizacional', component: AgencyInfoView },
        { path: '/organizaciones', component: OrganizationsView, meta: { requiresSystemFlag: true } },
    ],
})

router.beforeEach((to) => {
    const auth = useAuthStore()
    if (!to.meta.public && !auth.isAuthenticated) {
        return '/login'
    }
    if (to.path === '/login' && auth.isAuthenticated) {
        return '/'
    }
    if (to.meta.requiresSystemFlag && !auth.systemFlag) {
        return '/'
    }
})

export default router
