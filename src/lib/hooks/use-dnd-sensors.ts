"use client";

import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface UseDndSensorsOptions {
  distance?: number;
}

export function useDndSensors({ distance = 5 }: UseDndSensorsOptions = {}) {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}
