<template>
  <div
    ref="container"
    class="relative overflow-hidden select-none bg-slate-100"
    :style="{ height: containerHeight + 'px' }"
    @mousedown="startDrag"
    @touchstart.passive="startDragTouch"
  >
    <!-- After (full width underneath) -->
    <img
      :src="after"
      alt="After"
      class="absolute inset-0 w-full h-full object-contain"
      @load="onImgLoad"
      draggable="false"
    />

    <!-- Before (clipped to left side) -->
    <div
      class="absolute inset-0 overflow-hidden"
      :style="{ width: sliderPos + 'px' }"
    >
      <img
        :src="before"
        alt="Before"
        class="absolute inset-0 w-full h-full object-contain"
        draggable="false"
        :style="{ width: containerWidth + 'px', maxWidth: 'none' }"
      />
    </div>

    <!-- Labels -->
    <div class="absolute top-3 left-4 px-2 py-1 bg-black/50 text-white text-xs font-semibold rounded-lg backdrop-blur-sm">
      Before
    </div>
    <div class="absolute top-3 right-4 px-2 py-1 bg-indigo-600/80 text-white text-xs font-semibold rounded-lg backdrop-blur-sm">
      After
    </div>

    <!-- Divider line -->
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]"
      :style="{ left: sliderPos + 'px' }"
    />

    <!-- Handle -->
    <div
      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-indigo-500 flex items-center justify-center cursor-ew-resize"
      :style="{ left: sliderPos + 'px' }"
    >
      <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  before: String,
  after: String,
});

const container = ref(null);
const sliderPos = ref(0);
const containerWidth = ref(0);
const containerHeight = ref(400);
const dragging = ref(false);

function init() {
  if (!container.value) return;
  containerWidth.value = container.value.offsetWidth;
  sliderPos.value = containerWidth.value / 2;
}

function onImgLoad(e) {
  const img = e.target;
  const ratio = img.naturalHeight / img.naturalWidth;
  containerHeight.value = Math.min(Math.round(containerWidth.value * ratio), 600);
  init();
}

function getX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX;
}

function onMove(e) {
  if (!dragging.value || !container.value) return;
  const rect = container.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(getX(e) - rect.left, containerWidth.value));
  sliderPos.value = x;
}

function stopDrag() {
  dragging.value = false;
}

function startDrag(e) {
  dragging.value = true;
  onMove(e);
}

function startDragTouch(e) {
  dragging.value = true;
  onMove(e);
}

onMounted(() => {
  init();
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchmove', onMove);
  window.addEventListener('touchend', stopDrag);
  window.addEventListener('resize', init);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchmove', onMove);
  window.removeEventListener('touchend', stopDrag);
  window.removeEventListener('resize', init);
});

watch(() => [props.before, props.after], init);
</script>
