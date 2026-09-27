import { salon } from '@/config/salon'

export const appUrl = (path = '/') => new URL(path, process.env.APP_URL ?? 'http://localhost:3000').toString()

export const manageUrl = (ref: string) => appUrl(`/booking/${ref}`)
export const rebookUrl = (token: string) => appUrl(`/r/${token}`)

/** Opens a chat with the salon's WhatsApp, text pre-filled. */
export const waLink = (text: string) => `https://wa.me/${salon.whatsapp}?text=${encodeURIComponent(text)}`
