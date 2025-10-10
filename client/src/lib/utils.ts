import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Design System: Primary Gradient
export const BUTTON_GRADIENT_PRIMARY = "bg-gradient-to-r from-primary to-accent text-black active:shadow-depth-sm active:scale-[0.98] transition-all duration-200";
