<template>
  <div class="field-wrapper">
    <slot></slot>
    <div class="field-controls">
      <v-icon 
        name="edit" 
        clickable 
        class="edit-icon"
        @click="$emit('edit')" 
      />
      <v-icon 
        name="delete" 
        clickable 
        class="delete-icon"
        @click="$emit('delete')" 
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.field-wrapper {
  position: relative;
  margin-bottom: 20px;

  &:hover .field-controls {
    opacity: 1;
  }

  .field-controls {
    position: absolute;
    top: 8px;
    right: -40px;
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity var(--fast) var(--transition);
  }

  .edit-icon {
    --v-icon-color: var(--theme--primary);
  }

  .delete-icon {
    --v-icon-color: var(--theme--danger);
  }
}
</style> 