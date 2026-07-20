import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getURL = () => {
  let url =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.playgrowthhub.com'

  // Make sure to include trailing `/`
  url = url.endsWith('/') ? url : `${url}/`
  return url
}
