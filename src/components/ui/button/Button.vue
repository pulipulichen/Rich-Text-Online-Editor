<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const styles = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-teal-600 text-white hover:bg-teal-700',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
        ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)
type Variant = VariantProps<typeof styles>['variant']
type Size = VariantProps<typeof styles>['size']
const props = withDefaults(defineProps<{ variant?: Variant; size?: Size; disabled?: boolean }>(), {
  variant: 'default', size: 'default', disabled: false
})
const classes = computed(() => cn(styles({ variant: props.variant, size: props.size })))
</script>
<template>
  <button type="button" :class="classes" :disabled="disabled"><slot /></button>
</template>
