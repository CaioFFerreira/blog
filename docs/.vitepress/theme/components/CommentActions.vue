<script setup lang="ts">
import ActionDropdown from './ActionDropdown.vue'
defineProps<{ commentId: string; authorName: string; disabled: boolean }>()
const emit = defineEmits<{ edit: []; delete: [] }>()
function select(action: string) { if (action === 'edit') emit('edit'); else if (action === 'delete') emit('delete') }
</script>
<template>
  <ActionDropdown class="comment-actions-menu" :menu-id="`comment-actions-${commentId}`" :label="`Opções do comentário de ${authorName}`" menu-label="Ações do comentário" :disabled="disabled" :actions="[
    { id: 'edit', label: 'Editar', ariaLabel: `Editar comentário de ${authorName}`, kind: 'open', icon: 'edit' },
    { id: 'delete', label: 'Excluir', ariaLabel: `Excluir comentário de ${authorName}`, kind: 'danger', icon: 'delete' },
  ]" @select="select" />
</template>
