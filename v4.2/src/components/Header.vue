<template>
  <div class="relative z-50">
    <nav :class="[
      'fixed w-full top-0 z-50 transition-all duration-500',
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
        : 'bg-transparent'
    ]">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo -->
          <router-link to="/" class="flex items-center group">
            <div class="relative h-8 w-8 mr-3">
              <div class="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300"></div>
              <div class="absolute inset-0.5 rounded-full bg-white flex items-center justify-center">
                <Anchor class="h-4 w-4 text-blue-500 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span class="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Sovereign<span class="text-blue-500">Seas</span>
            </span>
          </router-link>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-1">
            <router-link
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              :class="[
                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group',
                $route.path === item.href 
                  ? 'bg-blue-50 text-blue-600' 
                  : isScrolled 
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                    : 'text-white/90 hover:text-white hover:bg-white/10'
              ]"
            >
              <component :is="item.icon" class="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
              {{ item.name }}
            </router-link>

            <!-- Create Dropdown -->
            <div class="relative">
              <button
                @click="showCreateDropdown = !showCreateDropdown"
                :class="[
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group',
                  showCreateDropdown 
                    ? 'bg-blue-50 text-blue-600' 
                    : isScrolled 
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                ]"
              >
                <PlusCircle class="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Create
                <ChevronDown :class="['ml-1 h-3 w-3 transition-transform duration-200', showCreateDropdown ? 'rotate-180' : '']" />
              </button>

              <Transition
                enter="transition ease-out duration-200"
                enter-from="transform opacity-0 scale-95 translate-y-1"
                enter-to="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leave-from="transform opacity-100 scale-100 translate-y-0"
                leave-to="transform opacity-0 scale-95 translate-y-1"
              >
                <div 
                  v-if="showCreateDropdown"
                  class="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                  @mouseleave="showCreateDropdown = false"
                >
                  <button
                    v-for="option in createOptions"
                    :key="option.name"
                    @click="navigateToCreate(option.href)"
                    class="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                  >
                    <div class="bg-blue-100 p-2 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                      <component :is="option.icon" class="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div class="font-medium text-sm">{{ option.name }}</div>
                      <div class="text-xs text-gray-500">{{ option.description }}</div>
                    </div>
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Right Side Actions -->
          <div class="flex items-center space-x-3">
            <!-- Authenticated User Actions -->
            <template v-if="isAuthenticated">
              <!-- Notifications -->
              <button :class="[
                'p-2 rounded-lg transition-all duration-200',
                isScrolled 
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              ]">
                <Bell class="h-5 w-5" />
              </button>

              <!-- Wallet Button -->
              <button
                @click="openWalletModal"
                :class="[
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isScrolled 
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                ]"
              >
                <Wallet class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">
                  {{ address ? abbreviateAddress(address) : 'Wallet' }}
                </span>
              </button>

              <!-- Profile Button -->
              <router-link
                to="/app/me"
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  isScrolled 
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                ]"
              >
                <User class="h-5 w-5" />
              </router-link>

              <!-- Dashboard Dropdown -->
              <div class="relative hidden sm:block">
                <button
                  @click="showDropdown = !showDropdown"
                  :class="[
                    'p-2 rounded-lg transition-all duration-200',
                    showDropdown 
                      ? 'bg-blue-50 text-blue-600' 
                      : isScrolled 
                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                  ]"
                >
                  <Settings class="h-5 w-5" />
                </button>

                <Transition
                  enter="transition ease-out duration-200"
                  enter-from="transform opacity-0 scale-95 translate-y-1"
                  enter-to="transform opacity-100 scale-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leave-from="transform opacity-100 scale-100 translate-y-0"
                  leave-to="transform opacity-0 scale-95 translate-y-1"
                >
                  <div 
                    v-if="showDropdown"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                    @mouseleave="showDropdown = false"
                  >
                    <router-link
                      to="/campaign/mycampaigns"
                      class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      @click="showDropdown = false"
                    >
                      <Globe class="mr-3 h-4 w-4 text-gray-400" />
                      My Campaigns
                    </router-link>
                    <router-link
                      to="/votes"
                      class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      @click="showDropdown = false"
                    >
                      <Award class="mr-3 h-4 w-4 text-gray-400" />
                      My Votes
                    </router-link>
                    <router-link
                      to="/myprojects"
                      class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      @click="showDropdown = false"
                    >
                      <FileCode class="mr-3 h-4 w-4 text-gray-400" />
                      My Projects
                    </router-link>
                    <hr class="my-2 border-gray-100" />
                    <button
                      @click="handleLogout"
                      class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <Settings class="mr-3 h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </Transition>
              </div>
            </template>

            <!-- Connect Wallet Button -->
            <button 
              v-if="!hideConnectBtn && !isAuthenticated"
              @click="handleLogin"
              :disabled="!isReady"
              class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect Wallet
            </button>

            <!-- Mobile Menu Button -->
            <button 
              class="md:hidden p-2 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              @click="isMobileMenuOpen = !isMobileMenuOpen"
            >
              <span class="sr-only">Open main menu</span>
              <component :is="isMobileMenuOpen ? X : Menu" class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div v-if="isMobileMenuOpen" class="md:hidden bg-white border-t border-gray-100">
        <div class="px-4 py-3 space-y-1">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            @click="isMobileMenuOpen = false"
            :class="[
              'flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200',
              $route.path === item.href 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-700 hover:bg-gray-50'
            ]"
          >
            <component :is="item.icon" class="h-4 w-4 mr-3" />
            {{ item.name }}
          </router-link>

          <!-- Create Options in Mobile -->
          <div class="pt-3 border-t border-gray-100">
            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Create New
            </div>
            <router-link
              v-for="option in createOptions"
              :key="option.name"
              :to="option.href"
              @click="isMobileMenuOpen = false"
              class="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              <component :is="option.icon" class="h-4 w-4 mr-3 text-gray-400" />
              {{ option.name }}
            </router-link>
          </div>

          <!-- Mobile User Menu -->
          <template v-if="isAuthenticated">
            <div class="pt-3 border-t border-gray-100">
              <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Account
              </div>
              <router-link
                to="/app/me"
                @click="isMobileMenuOpen = false"
                class="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <User class="h-4 w-4 mr-3 text-gray-400" />
                Profile
              </router-link>
              <router-link
                to="/campaign/mycampaigns"
                @click="isMobileMenuOpen = false"
                class="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <Globe class="h-4 w-4 mr-3 text-gray-400" />
                My Campaigns
              </router-link>
              <router-link
                to="/votes"
                @click="isMobileMenuOpen = false"
                class="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <Award class="h-4 w-4 mr-3 text-gray-400" />
                My Votes
              </router-link>
              <router-link
                to="/myprojects"
                @click="isMobileMenuOpen = false"
                class="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <FileCode class="h-4 w-4 mr-3 text-gray-400" />
                My Projects
              </router-link>
              <button
                @click="openWalletModal"
                class="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <Wallet class="h-4 w-4 mr-3 text-gray-400" />
                My Wallet
              </button>
              <button
                @click="handleLogout"
                class="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                <Settings class="h-4 w-4 mr-3" />
                Logout
              </button>
            </div>
          </template>
        </div>
      </div>
    </nav>

    <!-- Wallet Modal -->
    <WalletModal 
      :is-open="walletModalOpen" 
      @close="closeWalletModal" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWallet } from '@/composables/useWallet'
import { useAuth } from '@/composables/useAuth'
import {
  Menu,
  X,
  ChevronDown,
  Globe,
  Award,
  Settings,
  PlusCircle,
  FileCode,
  Anchor,
  Wallet,
  Compass,
  Ship,
  BookOpen,
  User,
  Bell
} from 'lucide-vue-next'
import WalletModal from '@/components/WalletModal.vue'

const router = useRouter()
const route = useRoute()
const { connect, isConnected, address } = useWallet()
const { isAuthenticated, logout, isReady } = useAuth()

const navigation = [
  { name: 'Explorer', href: '/explorer', icon: Compass },
  { name: 'Campaigns', href: '/campaigns', icon: Globe },
  { name: 'Projects', href: '/projects', icon: Ship },
  { name: 'Docs', href: '/docs', icon: BookOpen },
]

const createOptions = [
  {
    name: 'Launch Campaign',
    href: '/app/campaign/start',
    icon: Ship,
    description: 'Start a new governance campaign',
  },
  {
    name: 'Create Project',
    href: '/app/project/start',
    icon: Compass,
    description: 'Begin a new project',
  }
]

// State
const hideConnectBtn = ref(false)
const showDropdown = ref(false)
const showCreateDropdown = ref(false)
const walletModalOpen = ref(false)
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

// Methods
const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const handleLogin = () => {
  if (window.ethereum?.isMiniPay) {
    connect({ connector: 'metaMask' })
  } else {
    // Implement your login logic here
    console.log('Login with email/wallet/google')
  }
}

const openWalletModal = () => {
  walletModalOpen.value = true
  showDropdown.value = false
}

const closeWalletModal = () => {
  walletModalOpen.value = false
}

const abbreviateAddress = (address) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

const navigateToCreate = (href) => {
  router.push(href)
  showCreateDropdown.value = false
}

const handleLogout = () => {
  logout()
  showDropdown.value = false
  isMobileMenuOpen.value = false
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  if (window.ethereum?.isMiniPay) {
    hideConnectBtn.value = true
    connect({ connector: 'metaMask' })
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Watch route changes
watch(() => route.path, () => {
  showDropdown.value = false
  showCreateDropdown.value = false
  isMobileMenuOpen.value = false
})
</script> 