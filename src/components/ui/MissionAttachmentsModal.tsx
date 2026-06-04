'use client'

import { 
  HelpCircle, Paperclip, RefreshCw, X, 
  FileText, FileSpreadsheet, Image, FileVideo, Music, FolderArchive, Link2, 
  ChevronUp, ChevronDown, Loader2 
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
interface Attachment {
  id: string
  // mission_id: string
  goal_id: string
  user_id: string
  name: string
  url: string
  file_type: string
  created_at: string
}

interface Props {
  // missionId: string
  goalId: string
  missionTitle: string
  themeColor: string
  isOpen: boolean
  attachments: Attachment[]
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>
  loading: boolean
  onClose: () => void
  onCountChange?: (count: number) => void
}

// ── Extract Google Drive File ID ───────────────────────────────────────────
function extractGoogleFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (match && match[1]) return match[1]
  
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/)
  if (idMatch && idMatch[1]) return idMatch[1]
  
  return null
}

// ── File-type detection from URL ───────────────────────────────────────────
function detectFileType(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (/\.(pdf)$/.test(lower)) return 'pdf'
  if (/\.(xlsx?|csv|ods)$/.test(lower)) return 'excel'
  if (/\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)$/.test(lower)) return 'image'
  if (/\.(docx?|odt|rtf|txt|md)$/.test(lower)) return 'doc'
  if (/\.(mp4|mov|avi|webm|mkv)$/.test(lower)) return 'video'
  if (/\.(mp3|wav|ogg|flac)$/.test(lower)) return 'audio'
  if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return 'archive'
  return 'link'
}

// ── Icon renderer per type ─────────────────────────────────────────────────
const FileIcon = React.memo(({ type, color }: { type: string; color: string }) => {
  const icons: Record<string, { icon: React.ComponentType<any>; glow: string }> = {
    pdf:     { icon: FileText,        glow: '#EF4444' }, // Red for PDF
    excel:   { icon: FileSpreadsheet, glow: '#22C55E' }, // Green for Google Sheets
    image:   { icon: Image,           glow: '#E2E8F0' },
    doc:     { icon: FileText,        glow: '#3B82F6' }, // Blue for Google Docs
    video:   { icon: FileVideo,       glow: '#F97316' },
    audio:   { icon: Music,           glow: '#A855F7' },
    archive: { icon: FolderArchive,   glow: '#EAB308' },
    link:    { icon: Link2,           glow: color },
  }
  const { icon: IconComponent, glow } = icons[type] ?? icons.link
  return (
    <IconComponent
      className="w-6 h-6 shrink-0"
      style={{ color: glow, filter: `drop-shadow(0 0 4px ${glow}44)` }}
    />
  )
})
FileIcon.displayName = 'FileIcon'

// ── Preview Modal Component ─────────────────────────────────────────────────
const PreviewModal = React.memo(({ 
  attachment, 
  onClose, 
  themeColor,
  isRTL 
}: { 
  attachment: Attachment
  onClose: () => void
  themeColor: string
  isRTL: boolean
}) => {
  const fileId = extractGoogleFileId(attachment.url)
  const isImage = attachment.file_type === 'image'
  const isVideo = attachment.file_type === 'video'

  // Construct standard embedded high-performance iframe URL for Google Drive documents
  let iframeUrl = ''
  if (fileId) {
    if (attachment.file_type === 'excel') {
      iframeUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview`
    } else if (attachment.file_type === 'doc') {
      iframeUrl = `https://docs.google.com/document/d/${fileId}/preview`
    } else {
      iframeUrl = `https://drive.google.com/file/d/${fileId}/preview`
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 dark:bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white/95 dark:bg-black/80 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-4 w-[90vw] h-[85vh] fixed inset-0 z-[9999] m-auto flex flex-col shadow-2xl"
        style={{ borderColor: `${themeColor}33`, boxShadow: `0 0 50px ${themeColor}15` }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10 mb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon type={attachment.file_type} color={themeColor} />
            <p className="font-space font-black uppercase text-xs truncate max-w-[50vw] text-zinc-900 dark:text-white" style={{ textShadow: `0 0 10px ${themeColor}44` }}>
              {attachment.name}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 font-space font-black uppercase text-[10px] tracking-widest text-zinc-600 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 rounded-lg transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            {/* {isRTL ? '[ إغلاق المعاينة // Close Preview ]' : '[ Close Preview ]'} */}
            {isRTL ? '[ إغلاق المعاينة - Close Preview ]' : '[ Close Preview ]'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 w-full h-full relative rounded-lg overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center">
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              className="w-full h-full border-none rounded-lg bg-white dark:bg-[#0e0e0e]"
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          ) : isVideo ? (
            <video src={attachment.url} controls className="max-w-full max-h-full rounded-lg shadow-lg" />
          ) : (
            <div className="flex flex-col items-center gap-6 text-center">
              <FileIcon type={attachment.file_type} color={themeColor} />
              <p className="font-space text-zinc-500 dark:text-white/40 text-xs uppercase tracking-widest">
                Preview not available for this file type
              </p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 font-space font-black uppercase tracking-widest text-xs text-black transition-all hover:scale-105"
                style={{ backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}44` }}
              >
                Open in Browser
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
PreviewModal.displayName = 'PreviewModal'

// ── Main Modal ─────────────────────────────────────────────────────────────
// const MissionAttachmentsModal = ({
//   missionId,
//   missionTitle,
//   themeColor,
//   isOpen,
//   attachments,
//   setAttachments,
//   loading,
//   onClose,
//   onCountChange,
// }: Props) => {
const MissionAttachmentsModal = ({
  goalId,
  missionTitle,
  themeColor,
  isOpen,
  attachments,
  setAttachments,
  loading,
  onClose,
  onCountChange,
}: Props) => {
  const supabase = createClient()
  // const { isRTL } = useGrowth()
  const { isRTL, profile, refreshProfile } = useGrowth()
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [previewItem, setPreviewItem] = useState<Attachment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [isDriveConnected, setIsDriveConnected] = useState(false)

  // ── Shared Drive Token Cache (same keys as TaskDrawer) ────────────────────
  const DRIVE_TOKEN_KEY = 'gd_access_token'
  const DRIVE_EXPIRY_KEY = 'gd_expires_at'

  const getCachedToken = (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(DRIVE_TOKEN_KEY)
    const expiry = parseInt(localStorage.getItem(DRIVE_EXPIRY_KEY) || '0', 10)
    if (token && Date.now() < expiry) return token
    return null
  }

  const cacheToken = (token: string) => {
    localStorage.setItem(DRIVE_TOKEN_KEY, token)
    localStorage.setItem(DRIVE_EXPIRY_KEY, String(Date.now() + 3600 * 1000))
    setIsDriveConnected(true)
  }

  // // Check for a valid cached token on mount
  // useEffect(() => {
  //   if (getCachedToken()) setIsDriveConnected(true)
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = getCachedToken()
    if (token) {
      setIsDriveConnected(true)
    } else if (profile?.drive_connected && profile.id !== 'guest') {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      const google = (window as any).google
      if (clientId && google?.accounts?.oauth2) {
        try {
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response: any) => {
              if (response.error !== undefined) {
                console.error("Silent OAuth failed:", response.error)
                const supabaseClient = createClient()
                supabaseClient.from('profiles').update({ drive_connected: false }).eq('id', profile.id).then(() => {
                  refreshProfile()
                })
                return
              }
              cacheToken(response.access_token)
            },
            error_callback: () => {
              const supabaseClient = createClient()
              supabaseClient.from('profiles').update({ drive_connected: false }).eq('id', profile.id).then(() => {
                refreshProfile()
              })
            }
          })
          tokenClient.requestAccessToken({ prompt: 'none' })
        } catch (e) {
          console.error("Silent OAuth initialization error:", e)
        }
      }
    }
  }, [profile?.drive_connected, profile?.id])

  // ── Load Google API Scripts Client-Side ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Google Identity Services (GIS)
    if (!document.getElementById('google-gis-sdk')) {
      const script = document.createElement('script')
      script.id = 'google-gis-sdk'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    // 2. Google API Core / Picker Loader
    if (!document.getElementById('google-gapi-sdk')) {
      const script = document.createElement('script')
      script.id = 'google-gapi-sdk'
      script.src = 'https://apis.google.com/js/api.js'
      script.async = true
      script.defer = true
      script.onload = () => {
        const gapi = (window as any).gapi
        if (gapi) {
          gapi.load('picker')
        }
      }
      document.body.appendChild(script)
    } else {
      const gapi = (window as any).gapi
      if (gapi && !gapi.picker) {
        gapi.load('picker')
      }
    }
  }, [])

  // ── Connect Google Drive & Launch Picker ─────────────────────────────────
  const handleConnectGoogleDrive = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

    if (!clientId || !apiKey) {
      alert('Missing Google credentials in configuration. Please check NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY.')
      return
    }

    const google = (window as any).google
    const gapi = (window as any).gapi

    if (!google || !gapi) {
      alert('Google API scripts are still loading. Please try again in a moment.')
      return
    }

    // ── 1. Try cached token first ──────────────────────────────────────────
    const cached = getCachedToken()
    if (cached) {
      launchGooglePicker(cached)
      return
    }

    // ── 2. Silent renewal first, interactive as fallback ──────────────────
    /*
    const tryAuth = (prompt: string, fallback?: () => void) => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error !== undefined) {
              if (fallback) { fallback(); return }
              console.error('GIS authentication error:', response)
              return
            }
            cacheToken(response.access_token)
            launchGooglePicker(response.access_token)
          },
          error_callback: (err: any) => {
            if (fallback) { fallback(); return }
            console.error('Silent OAuth failed:', err)
          }
        })
        tokenClient.requestAccessToken({ prompt })
      } catch (err) {
        if (fallback) { fallback(); return }
        console.error('Error connecting Google Drive:', err)
      }
    }

    tryAuth('none', () => tryAuth('select_account'))
    */
    const tryAuth = (prompt: string, fallback?: () => void) => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error !== undefined) {
              if (fallback) { fallback(); return }
              console.error('GIS authentication error:', response)
              return
            }
            cacheToken(response.access_token)
            if (profile && profile.id !== 'guest') {
              const supabaseClient = createClient()
              supabaseClient.from('profiles').update({ drive_connected: true }).eq('id', profile.id).then(() => {
                refreshProfile()
              })
            }
            launchGooglePicker(response.access_token)
          },
          error_callback: (err: any) => {
            if (fallback) { fallback(); return }
            console.error('Silent OAuth failed:', err)
          }
        })
        tokenClient.requestAccessToken({ prompt })
      } catch (err) {
        if (fallback) { fallback(); return }
        console.error('Error connecting Google Drive:', err)
      }
    }

    if (profile?.drive_connected) {
      tryAuth('none', () => tryAuth('consent'))
    } else {
      tryAuth('consent')
    }
  }

  // ── Launch Google Picker ─────────────────────────────────────────────────
  const launchGooglePicker = (accessToken: string) => {
    try {
      const google = (window as any).google
      const gapi = (window as any).gapi
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

      if (!gapi || !gapi.picker) {
        console.error('GAPI Picker component not fully loaded.')
        return
      }

      // Configure a clean DocsView that supports PDFs, Sheets, and Docs
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      docsView.setMimeTypes('application/pdf,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet')
      docsView.setSelectFolderEnabled(false)

      const picker = new google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const document = data.docs[0]
            const fileId = document.id
            const fileName = document.name
            const mimeType = document.mimeType
            const webViewLink = document.url

            // Identify type accurately for color chip matches
            let fileType = 'link'
            if (mimeType === 'application/pdf') {
              fileType = 'pdf'
            } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
              fileType = 'excel'
            } else if (mimeType === 'application/vnd.google-apps.document') {
              fileType = 'doc'
            }

            await handleAddMetadata(fileName, webViewLink, fileType)
          }
        })
        .build()

      picker.setVisible(true)
    } catch (err) {
      console.error('Error opening Google Drive Picker:', err)
    }
  }

  // ── Save Google Selected File / Metadata ──────────────────────────────────
  const handleAddMetadata = async (name: string, url: string, fileType: string) => {
    try {
      setAdding(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAdding(false)
        return
      }

      // const { data, error } = await supabase
      //   .from('goal_attachments')
      //   .insert({
      //     mission_id: missionId,
      //     user_id: user.id,
      //     name,
      //     url,
      //     file_type: fileType
      //   })
      //   .select()
      //   .single()
      const { data, error } = await supabase
        .from('goal_attachments')
        .insert({
          goal_id: goalId,
          user_id: user.id,
          name,
          url,
          file_type: fileType
        })
        .select()
        .single()

      if (!error && data) {
        const updated = [data, ...attachments]
        setAttachments(updated)
        onCountChange?.(updated.length)
      } else {
        console.error('Supabase save error:', error)
      }
    } catch (err) {
      console.error('Error saving attachment metadata:', err)
    } finally {
      setAdding(false)
    }
  }

  // ── Manual Paste Handlers ─────────────────────────────────────────────────
  const handleAddManual = async () => {
    const trimName = newName.trim()
    const trimUrl = newUrl.trim()
    if (!trimName || !trimUrl) return
    
    setAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAdding(false)
        return
      }
      
      const file_type = detectFileType(trimUrl)
      // const { data, error } = await supabase
      //   .from('goal_attachments')
      //   .insert({
      //     mission_id: missionId,
      //     user_id: user.id,
      //     name: trimName,
      //     url: trimUrl,
      //     file_type
      //   })
      //   .select()
      //   .single()
      const { data, error } = await supabase
        .from('goal_attachments')
        .insert({
          goal_id: goalId,
          user_id: user.id,
          name: trimName,
          url: trimUrl,
          file_type
        })
        .select()
        .single()

      if (!error && data) {
        const updated = [data, ...attachments]
        setAttachments(updated)
        onCountChange?.(updated.length)
        setNewName('')
        setNewUrl('')
        setShowManual(false)
      }
    } catch (err) {
      console.error('Error adding manual attachment:', err)
    } finally {
      setAdding(false)
    }
  }

  // ── Delete Handler ────────────────────────────────────────────────────────
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering card preview modal click
    setDeletingId(id)
    try {
      await supabase.from('goal_attachments').delete().eq('id', id)
      const updated = attachments.filter(a => a.id !== id)
      setAttachments(updated)
      onCountChange?.(updated.length)
    } catch (err) {
      console.error('Error deleting attachment:', err)
    } finally {
      setDeletingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/60 dark:bg-black/90 backdrop-blur-md p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-[95vw] md:max-w-xl flex flex-col bg-white/95 dark:bg-[#080808] border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] my-auto p-4 md:p-6"
          style={{
            borderColor: `${themeColor}33`,
            boxShadow: `0 0 60px ${themeColor}18`,
          }}
        >
          {/* ── Modal Header ─────────────────────────────────────── */}
          <div className="flex items-center justify-between pb-4 border-b shrink-0 border-zinc-200 dark:border-white/10" style={{ borderColor: `${themeColor}22` }}>
            <div className="flex items-center gap-3">
              <Paperclip className="text-xl w-5 h-5" style={{ color: themeColor, filter: `drop-shadow(0 0 4px ${themeColor})` }} />
              <div>
                <p className="font-space font-black uppercase tracking-widest text-[10px] text-zinc-500 dark:text-white/30">
                  {isRTL ? 'المرفقات المزامنة' : 'Synced Attachments'}
                </p>
                <p className="font-space font-black uppercase text-sm truncate max-w-[260px]" style={{ color: themeColor }}>{missionTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-space font-black text-xs px-2 py-1 rounded-xl" style={{ color: themeColor, backgroundColor: `${themeColor}18`, border: `1px solid ${themeColor}33` }}>
                {attachments.length}
              </span>
              <button onClick={onClose} className="text-zinc-400 dark:text-white/30 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Main Actions Panel ───────────────────────────────── */}
          <div className="py-4 border-b shrink-0 bg-black/[0.01] dark:bg-white/[0.01] border-zinc-200 dark:border-white/10" style={{ borderColor: `${themeColor}15` }}>
            {/* Google Drive Primary Button with signature dark glass style */}
            <button
              onClick={handleConnectGoogleDrive}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 font-space font-black text-xs uppercase tracking-widest text-zinc-900 dark:text-white/90 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all duration-300 rounded-xl shadow-lg mb-2 cursor-pointer"
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
                el.style.borderColor = 'rgba(128, 128, 128, 0.3)';
                el.style.boxShadow = `0 0 20px ${themeColor}22`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.backgroundColor = '';
                el.style.borderColor = '';
                el.style.boxShadow = 'none';
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Google_Drive_icon_(2020).svg" alt="Google Drive" className="w-5 h-5 shrink-0" />
              <span>
                {/* {isRTL
                  ? `[ ${isRTL ? 'فتح جوجل درايف' : 'OPEN GOOGLE DRIVE'} ]`
                  : `[ ${isRTL ? 'ربط جوجل درايف' : 'CONNECT GOOGLE DRIVE'} ]`
                } */}
                {isDriveConnected
                  ? `[ ${isRTL ? 'فتح جوجل درايف' : 'Open Google Drive'} ]`
                  : `[ ${isRTL ? 'ربط جوجل درايف' : 'Connect Google Drive'} ]`
                }
              </span>
            </button>

            {/* Collapsed Manual Option Toggle */}
            <div className="mt-4">
              <button 
                onClick={() => setShowManual(!showManual)}
                className="w-full flex items-center justify-between py-2 text-[10px] font-space font-black uppercase tracking-widest text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white/80 transition-colors cursor-pointer"
              >
                <span>{isRTL ? 'ربط يدوي بالرابط' : 'Connect Manual Link'}</span>
                {showManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showManual && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-3 pt-3 overflow-hidden"
                  >
                    <input
                      type="text"
                      // placeholder={isRTL ? 'اسم المرفق...' : 'ATTACHMENT_NAME...'}
                      placeholder={isRTL ? 'اسم المرفق...' : 'Attachment Name...'}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                      className="w-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/8 py-2.5 px-4 font-space text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest outline-none placeholder:text-zinc-400 dark:placeholder:text-white/20 transition-all rounded-xl"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="HTTPS://..."
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                        className="flex-1 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/8 py-2.5 px-4 font-space text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest outline-none placeholder:text-zinc-400 dark:placeholder:text-white/20 transition-all rounded-xl"
                      />
                      <button
                        onClick={handleAddManual}
                        disabled={adding || !newName.trim() || !newUrl.trim()}
                        className="py-2.5 px-4 font-space font-black uppercase tracking-widest text-[10px] text-black transition-all rounded-xl shrink-0 cursor-pointer"
                        style={{ backgroundColor: themeColor, boxShadow: `0 0 16px ${themeColor}44` }}
                      >
                        // {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'إضافة' : 'ADD')}
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'إضافة' : 'Add')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Attachment Grid / Cards ────────────────────────────── */}
          <div className="flex-1 px-2 py-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
                <p className="font-space font-black tracking-[0.2em] text-[9px] text-zinc-400 dark:text-white/20">Fetching Data...</p>
              </div>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <RefreshCw className="text-4xl opacity-20 w-10 h-10 animate-spin-slow" style={{ color: themeColor }} />
                <p className="font-space font-black uppercase tracking-[0.4em] text-[9px] text-zinc-400 dark:text-white/20">
                  {isRTL ? 'لا توجد مرفقات مضافة بعد' : 'No attachments synced'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachments.map(att => {
                  return (
                    <div
                      key={att.id}
                      onClick={() => setPreviewItem(att)}
                      className="group relative flex flex-col p-4 border rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl overflow-hidden"
                    >
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon type={att.file_type} color={themeColor} />
                          <div className="min-w-0">
                            <p className="font-space font-black text-xs text-zinc-900 dark:text-white uppercase truncate tracking-wide max-w-[140px] group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                              {att.name}
                            </p>
                            <p className="font-space text-[8px] uppercase tracking-widest text-zinc-500 dark:text-white/25 mt-0.5">
                              {/* {att.file_type.toUpperCase()} // {new Date(att.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} */}
                              {att.file_type.toUpperCase()} - {new Date(att.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleDelete(att.id, e)}
                            disabled={deletingId === att.id}
                            className="w-7 h-7 flex items-center justify-center border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-white/25 hover:border-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-lg cursor-pointer"
                          >
                            {deletingId === att.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="text-xs w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Hover subtle indicators */}
                      <div 
                        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-300"
                        style={{ backgroundColor: themeColor }}
                      />
                    </div>
                  )
                })}
               </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="py-4 border-t shrink-0 flex items-center justify-between border-zinc-200 dark:border-white/10" style={{ borderColor: `${themeColor}15` }}>
            {/* <p className="font-space text-[8px] uppercase tracking-[0.4em] text-zinc-400 dark:text-white/15">
              {isRTL ? 'مزامنة جوجل درايف // Google Drive Sync' : 'Google Drive Sync // Web Integration'}
            </p>
            <button onClick={onClose} className="font-space font-black uppercase tracking-widest text-[9px] text-zinc-500 dark:text-white/25 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
              {isRTL ? 'إغلاق' : 'CLOSE'}
            </button> */}
            <p className="font-space text-[8px] tracking-[0.4em] text-zinc-400 dark:text-white/15">
              {isRTL ? 'مزامنة جوجل درايف - Google Drive Sync' : 'Google Drive Sync - Web Integration'}
            </p>
            <button onClick={onClose} className="font-space font-black tracking-widest text-[9px] text-zinc-500 dark:text-white/25 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Glassmorphic Live Preview Panel */}
      <AnimatePresence>
        {previewItem && (
          <PreviewModal
            attachment={previewItem}
            onClose={() => setPreviewItem(null)}
            themeColor={themeColor}
            isRTL={isRTL}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default React.memo(MissionAttachmentsModal)
