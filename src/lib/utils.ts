import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function checkMicPermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });

    return true;
  } catch (error) {
    return false;
  }
}
