<script setup>
import { RouterView } from 'vue-router'
import ReloadPrompt from './components/ReloadPrompt.vue'
import PullToRefresh from './components/PullToRefresh.vue'
</script>

<template>
    <div class="min-h-screen bg-gray-50 text-gray-900">
        <PullToRefresh>
            <RouterView />
        </PullToRefresh>
        <ReloadPrompt />
    </div>
</template>
