import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createWorker } from 'tesseract.js'
import {
  ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown,
  Clock3, Compass, FileText, Filter, Flag, Globe2, GraduationCap, Heart, ImagePlus,
  LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal, Newspaper, Plus,
  Search, Send, Settings2, Share2, Shield, Sparkles, TrendingUp, Upload, Users,
  Video, X, Zap, Bell, Eye, type LucideIcon,
} from 'lucide-react'
import { articles, campusStories, categories, initialHighlights, photos } from './data'
import type { Article, Highlight } from './data'
import { translateText } from './translation'

type Role = 'guest' | 'student' | 'editor' | 'admin' | 'super-admin'
type Page = 'home' | 'daily' | 'kiet' | 'highlights' | 'generator' | 'search' | 'notifications' | 'profile' | 'admin' | 'article'
type CampusDraft = { title: string; summary: string; category: string; image: string }

const roleLabels: Record<Role, string> = { guest: 'Guest', student: 'Student', editor: 'Editor', admin: 'Admin', 'super-admin': 'Super Admin' }
const demoRoleEntries = Object.entries(roleLabels).filter(([value]) => value !== 'super-admin')
const languages = ['English', 'తెలుగు', 'हिन्दी', 'தமிழ்', 'ಕನ್ನಡ', 'മലയാളം', 'मराठी', 'বাংলা']

const pageTitles: Record<Page, string> = {
  home: 'Good morning, Rakesh', daily: 'Daily News', kiet: 'KIET News', highlights: 'KIET Highlights',
  generator: 'AI News Generator', search: 'Search the hub', notifications: 'Notifications',
  profile: 'Your profile', admin: 'Admin workspace', article: 'Story',
}

const navGroups: { label: string; items: { page: Page; label: string; icon: LucideIcon }[] }[] = [
  { label: 'DISCOVER', items: [{ page: 'home', label: 'Home', icon: LayoutDashboard }, { page: 'daily', label: 'Daily News', icon: Newspaper }, { page: 'kiet', label: 'KIET News', icon: GraduationCap }, { page: 'highlights', label: 'Highlights', icon: Compass }] },
  { label: 'CREATE', items: [{ page: 'generator', label: 'AI Generator', icon: Sparkles }] },
]

function App() {
  const [page, setPage] = useState<Page>('home')
  const [previousPage, setPreviousPage] = useState<Page>('home')
  const [role, setRole] = useState<Role>('student')
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem('kiet_access_token') ?? '')
  const [authMode, setAuthMode] = useState<'register' | 'login' | null>(null)
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [language, setLanguage] = useState('English')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [dailyArticles, setDailyArticles] = useState(articles)
  const [officialCampusStories, setOfficialCampusStories] = useState(campusStories)
  const [campusPending, setCampusPending] = useState<Article[]>([])
  const [localizedArticles, setLocalizedArticles] = useState<Article[]>([...articles, ...campusStories])
  const [translationStatus, setTranslationStatus] = useState('')
  const [activeArticle, setActiveArticle] = useState<Article>(articles[0])
  const [highlights, setHighlights] = useState(initialHighlights)
  const [liked, setLiked] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [followed, setFollowed] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [comments, setComments] = useState<Record<string, string[]>>({
    p1: ['The light on campus looks unreal here.', 'That courtyard is my favourite study break spot.'],
    p2: ['Congratulations to the whole team!', 'Would love to see the project demo.'],
    p3: ['Adding this to my next library day.'],
    p4: ['See you all at the next run!'],
  })
  const [commentTarget, setCommentTarget] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [generatorInput, setGeneratorInput] = useState('')
  const [generatorPhoto, setGeneratorPhoto] = useState<File | null>(null)
  const [photoOcrStatus, setPhotoOcrStatus] = useState('')
  const [generated, setGenerated] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftCategory, setDraftCategory] = useState('Education')
  const [adminTab, setAdminTab] = useState('Overview')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/highlights', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((records: { id: number; author: string; caption: string; mediaUrl: string; mediaType: string; createdAt: string }[]) => {
        if (!records.length) return
        const published: Highlight[] = records.map((record) => ({
          id: String(record.id),
          name: record.author,
          handle: `@${record.author.toLowerCase().replace(/[^a-z0-9]+/g, '.')}`,
          caption: record.caption,
          image: record.mediaType.startsWith('video/') ? photos.event : record.mediaUrl,
          mediaUrl: record.mediaUrl,
          publishedMediaUrl: record.mediaUrl,
          likes: 0,
          time: new Date(record.createdAt).toLocaleDateString(),
          type: record.mediaType.startsWith('video/') ? 'video' : 'photo',
          status: 'published',
        }))
        setHighlights((current) => [...published, ...current.filter((post) => !/^\d+$/.test(post.id))])
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!authToken || !['editor', 'admin', 'super-admin'].includes(role)) return
    const controller = new AbortController()
    fetch('/api/admin/kiet-news/pending', { headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((records: { id: string; title: string; summary: string; category: string; source: string; image: string; publishedAt: string }[]) => {
        const pending = records.map((record) => ({
          id: record.id, title: record.title, summary: record.summary, category: record.category,
          source: record.source, image: record.image || photos.campus, time: 'Pending editorial review', read: 'Pending review',
        }))
        setCampusPending((current) => [...pending, ...current.filter((item) => !/^k-user-\d+$/.test(item.id))])
      })
      .catch(() => {})
    return () => controller.abort()
  }, [authToken, role])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/news', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((records: { id: string; title: string; summary: string; category: string; source: string; image: string; publishedAt: string }[]) => {
        if (!records.length) return
        setDailyArticles((current) => {
          const byId = new Map(current.map((article) => [article.id, article]))
          for (const record of records) {
            byId.set(record.id, {
              ...(byId.get(record.id) ?? { read: '4 min read' }),
              ...record,
              time: new Date(record.publishedAt).toLocaleString(),
            })
          }
          const fetchedIds = new Set(records.map((record) => record.id))
          return [...records.map((record) => byId.get(record.id)!).filter(Boolean), ...current.filter((article) => !fetchedIds.has(article.id))]
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/kiet-news', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((records: { id: string; title: string; summary: string; category: string; source: string; image: string; publishedAt: string }[]) => {
        if (!records.length) return
        setOfficialCampusStories((current) => {
          const currentById = new Map(current.map((story) => [story.id, story]))
          for (const record of records) {
            currentById.set(record.id, {
              ...(currentById.get(record.id) ?? { read: '3 min read' }),
              ...record,
              time: new Date(record.publishedAt).toLocaleString(),
            })
          }
          const fetchedIds = new Set(records.map((record) => record.id))
          return [...records.map((record) => currentById.get(record.id)!).filter(Boolean), ...current.filter((story) => !fetchedIds.has(story.id))]
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const originalStories = [...dailyArticles, ...officialCampusStories]
    if (language === 'English') {
      setLocalizedArticles(originalStories)
      setTranslationStatus('')
      return () => controller.abort()
    }
    setLocalizedArticles(originalStories)
    setTranslationStatus(`Translating news to ${language}…`)
    const translated = [...originalStories]
    let nextIndex = 0
    let translationFailures = 0
    const translateWorker = async () => {
      while (nextIndex < originalStories.length && !controller.signal.aborted) {
        const index = nextIndex++
        const story = originalStories[index]
        try {
          const [title, summary] = await Promise.all([
            translateText(story.title, language),
            translateText(story.summary, language),
          ])
          translated[index] = { ...story, title, summary }
        } catch {
          translationFailures += 1
          translated[index] = story
        }
      }
    }
    void Promise.all([translateWorker(), translateWorker(), translateWorker()]).then(() => {
      if (controller.signal.aborted) return
      setLocalizedArticles(translated)
      setTranslationStatus(translationFailures ? `Some stories remain in English because translation was unavailable.` : `News shown in ${language}.`)
    })
    return () => controller.abort()
  }, [dailyArticles, officialCampusStories, language])

  const canPost = role !== 'guest'
  const isAdmin = ['admin', 'super-admin'].includes(role)
  const pendingPosts = highlights.filter((post) => post.status === 'pending')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  const navigate = (next: Page) => {
    if (next === 'admin' && !isAdmin) {
      notify('Admin access is restricted to administrators.')
      return
    }
    setMobileNav(false)
    setPreviousPage(page === 'article' ? previousPage : page)
    setPage(next)
    if (next === 'search') setTimeout(() => document.getElementById('global-search')?.focus(), 20)
  }

  const back = () => setPage(page === 'article' ? previousPage : 'home')

  const requireAccount = () => {
    if (canPost) return true
    notify('Sign in as a student to join the conversation.')
    return false
  }

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!authMode) return
    setAuthBusy(true)
    setAuthError('')
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authMode === 'register'
          ? { email: authEmail, displayName: authName, password: authPassword }
          : { email: authEmail, password: authPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? result.detail ?? 'Could not complete sign in.')
      const token = result.accessToken as string
      const nextRole = String(result.role).toLowerCase().replace('_', '-') as Role
      window.localStorage.setItem('kiet_access_token', token)
      setAuthToken(token)
      setRole(nextRole)
      setAuthMode(null)
      setAuthPassword('')
      notify(authMode === 'register' ? 'Your student account is ready.' : 'Welcome back to KIET News Hub.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'The API is unavailable. Continue in demo mode instead.')
    } finally {
      setAuthBusy(false)
    }
  }

  const continueAsDemoStudent = () => {
    setRole('student')
    setAuthMode(null)
    setAuthError('')
    notify('Demo account activated as a student.')
  }

  const signOut = () => {
    window.localStorage.removeItem('kiet_access_token')
    setAuthToken('')
    setRole('guest')
    notify('You are now browsing as a guest.')
  }

  const toggleLike = (id: string) => {
    if (!requireAccount()) return
    setLiked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const toggleSave = (id: string) => {
    if (!requireAccount()) return
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    notify(saved.includes(id) ? 'Removed from your reading list.' : 'Saved to your reading list.')
  }

  const share = async (title: string) => {
    try {
      if (navigator.share) await navigator.share({ title, url: window.location.href })
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${title} · KIET News Hub`)
      notify('Story link ready to share.')
    } catch {
      notify('Sharing was cancelled.')
    }
  }

  const openArticle = (article: Article) => {
    setActiveArticle(article)
    navigate('article')
  }

  const handleUploadPick = (file?: File) => {
    setUploadError('')
    setUploadFile(null)
    if (!file) return
    const imageOk = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    const videoOk = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
    if (!imageOk && !videoOk) return setUploadError('Choose a JPG, PNG, WebP, MP4, WebM or MOV file.')
    if (videoOk && file.size > 300 * 1024 * 1024) return setUploadError('Videos must be 300 MB or smaller.')
    setUploadFile(file)
  }

  const submitHighlight = (event: FormEvent) => {
    event.preventDefault()
    if (!requireAccount()) return
    if (!uploadFile) return setUploadError('Add a photo or video before submitting.')
    if (!newCaption.trim()) return setUploadError('Add a caption for your post.')
    const file = uploadFile
    const caption = newCaption.trim()
    const finishUpload = (id: string, mediaUrl?: string) => {
      const isVideo = file.type.startsWith('video/')
      const localMediaUrl = URL.createObjectURL(file)
        setHighlights((current) => [{
        id, name: 'Rakesh Kunibilli', handle: '@rakesh.k', caption,
        image: isVideo ? photos.event : localMediaUrl, likes: 0,
        mediaUrl: isVideo ? localMediaUrl : undefined,
        publishedMediaUrl: mediaUrl,
        time: 'Just now', type: isVideo ? 'video' : 'photo', status: 'published',
      }, ...current])
      setNewCaption('')
      setUploadFile(null)
      setUploadProgress(0)
      notify('Published to KIET Highlights.')
    }
    if (authToken) {
      const request = new XMLHttpRequest()
      request.open('POST', '/api/highlights')
      request.setRequestHeader('Authorization', `Bearer ${authToken}`)
      request.upload.onprogress = (progressEvent) => {
        if (progressEvent.lengthComputable) setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
      }
      request.onload = () => {
        const result = JSON.parse(request.responseText || '{}')
        if (request.status < 200 || request.status >= 300) {
          setUploadError(result.message ?? result.detail ?? 'Upload failed. Please try again.')
          setUploadProgress(0)
          return
        }
        finishUpload(String(result.id), result.mediaUrl)
      }
      request.onerror = () => {
        setUploadError('The API could not save your upload. Please try again.')
        setUploadProgress(0)
      }
      const formData = new FormData()
      formData.append('media', file)
      formData.append('caption', caption)
      request.send(formData)
      return
    }
    let progress = 12
    setUploadProgress(progress)
    const timer = window.setInterval(() => {
      progress = Math.min(progress + 22, 100)
      setUploadProgress(progress)
      if (progress >= 100) {
        window.clearInterval(timer)
        finishUpload(`p${Date.now()}`)
      }
    }, 160)
  }

  const submitComment = (event: FormEvent, id: string) => {
    event.preventDefault()
    if (!requireAccount() || !commentDraft.trim()) return
    setComments((current) => ({ ...current, [id]: [...(current[id] ?? []), commentDraft.trim()] }))
    setCommentDraft('')
    notify('Comment added.')
  }

  const submitCampusDraft = async (draft: CampusDraft) => {
    if (!requireAccount()) throw new Error('Sign in with a student account before submitting campus news.')
    const submission = { ...draft, image: draft.image.trim() || photos.campus }
    let publishedArticle: Article
    if (authToken) {
      const response = await fetch('/api/kiet-news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? result.detail ?? 'Could not submit campus news.')
      publishedArticle = { ...submission, id: result.id, source: result.source, time: 'Just now', read: '3 min read' }
    } else {
      publishedArticle = { ...submission, id: `k-user-${Date.now()}`, source: 'Rakesh Kunibilli', time: 'Just now', read: '3 min read' }
    }
    setOfficialCampusStories((current) => [publishedArticle, ...current])
    notify(`Published to KIET News · ${publishedArticle.category}.`)
  }

  const handleGeneratorPhoto = async (file?: File) => {
    setGeneratorPhoto(file ?? null)
    setPhotoOcrStatus('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoOcrStatus('Choose an image file such as JPG, PNG or WebP.')
      return
    }
    setPhotoOcrStatus('Reading text from image…')
    let worker: Awaited<ReturnType<typeof createWorker>> | undefined
    try {
      worker = await createWorker('eng')
      const result = await worker.recognize(file)
      const extractedText = result.data.text.trim()
      if (!extractedText) {
        setPhotoOcrStatus('No readable text found. You can still add source text below.')
        return
      }
      setGeneratorInput((current) => [current.trim(), extractedText].filter(Boolean).join('\n\n'))
      setPhotoOcrStatus(`Extracted ${extractedText.length} characters. Review the text before generating.`)
    } catch {
      setPhotoOcrStatus('Could not read this image. Try a clear image or paste its text below.')
    } finally {
      await worker?.terminate()
    }
  }

  const moderate = async (id: string, status: Highlight['status']) => {
    if (authToken && /^\d+$/.test(id)) {
      try {
        const response = await fetch(`/api/admin/highlights/${id}/decision`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: status === 'published' }),
        })
        if (!response.ok) throw new Error('The server could not review this submission.')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Moderation failed.')
        return
      }
    }
    setHighlights((current) => current.map((post) => post.id === id ? {
      ...post,
      image: status === 'published' ? post.publishedMediaUrl ?? post.image : post.image,
      mediaUrl: status === 'published' ? post.publishedMediaUrl ?? post.mediaUrl : post.mediaUrl,
      status,
    } : post))
    notify(status === 'published' ? 'Submission approved and published.' : 'Submission rejected.')
  }

  const moderateCampusNews = async (article: Article, approved: boolean) => {
    const match = article.id.match(/^k-user-(\d+)$/)
    if (authToken && match) {
      try {
        const response = await fetch(`/api/admin/kiet-news/${match[1]}/decision`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved }),
        })
        if (!response.ok) throw new Error('The server could not review this campus story.')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Campus news review failed.')
        return
      }
    }
    setCampusPending((current) => current.filter((item) => item.id !== article.id))
    if (approved) setOfficialCampusStories((current) => [{ ...article, time: 'Just now', read: '3 min read' }, ...current])
    notify(approved ? 'KIET story approved and published.' : 'KIET story rejected.')
  }

  const generateDraft = (event: FormEvent) => {
    event.preventDefault()
    if (!requireAccount()) return
    const source = generatorInput.trim()
    if (source.length < 20) return notify('Add a little more source material to get a useful draft.')
    const lead = source.match(/[^.!?]+[.!?]?/)?.[0].trim() ?? source
    const normalizedSource = source.toLowerCase()
    const categoryRules: [string, string[]][] = [
      ['AI', ['artificial intelligence', 'machine learning', ' ai ']],
      ['Technology', ['technology', 'software', 'robot', 'computer']],
      ['Jobs', ['job', 'hiring', 'placement', 'career']],
      ['Sports', ['sports', 'match', 'tournament', 'cricket', 'football']],
      ['Business', ['business', 'market', 'startup', 'company']],
      ['Science', ['science', 'research', 'laboratory', 'experiment']],
      ['Hyderabad', ['hyderabad']], ['Telangana', ['telangana']],
      ['Education', ['student', 'college', 'university', 'campus']],
      ['Entertainment', ['film', 'music', 'movie', 'entertainment']],
      ['World', ['international', 'global', 'world']],
    ]
    const suggestedCategory = categoryRules.find(([, terms]) => terms.some((term) => normalizedSource.includes(term)))?.[0] ?? 'India'
    setDraftCategory(suggestedCategory)
    const stopWords = new Set(['about', 'after', 'again', 'also', 'among', 'and', 'are', 'because', 'before', 'being', 'between', 'but', 'for', 'from', 'have', 'into', 'its', 'not', 'our', 'over', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'was', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'will', 'with', 'would', 'you', 'your'])
    const counts = new Map<string, number>()
    for (const word of source.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]{2,}/gu) ?? []) {
      if (!stopWords.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1)
    }
    const keywords = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6).map(([word]) => word)
    const hashtags = keywords.slice(0, 4).map((word) => `#${word.replace(/[^\p{L}\p{N}]/gu, '')}`)
    setDraftTitle(lead.length > 100 ? `${lead.slice(0, 97).trimEnd()}...` : lead)
    setDraftBody(`${source}\n\nSUMMARY\n${lead}\n\nKEYWORDS\n${keywords.join(', ') || 'No keywords extracted'}\n\nHASHTAGS\n${hashtags.join(' ') || 'No hashtags extracted'}\n\nSOCIAL CAPTION\n${lead}\n\nCATEGORY\n${suggestedCategory}`)
    setGenerated(true)
    notify(`Source-only draft ready for ${suggestedCategory}. Review it, then publish directly.`)
  }

  const publishGeneratedDraft = async () => {
    if (!requireAccount()) return
    if (!generated || !draftTitle.trim()) return notify('Generate and check the source before publishing.')
    const sourceSummary = generatorInput.trim().match(/[^.!?]+[.!?]?/)?.[0].trim() ?? generatorInput.trim()
    const generatedImage = generatorPhoto ? URL.createObjectURL(generatorPhoto) : photos.campus
    const payload = { title: draftTitle.trim(), summary: sourceSummary.slice(0, 1000), body: draftBody, source: 'Rakesh Kunibilli', image: generatedImage, category: draftCategory }
    try {
      let id = `n-user-${Date.now()}`
      let publishedImage = generatedImage
      if (authToken) {
        const formData = new FormData()
        formData.append('title', payload.title)
        formData.append('summary', payload.summary)
        formData.append('body', payload.body)
        formData.append('source', payload.source)
        formData.append('category', payload.category)
        formData.append('coverUrl', photos.campus)
        if (generatorPhoto) formData.append('photo', generatorPhoto)
        const response = await fetch('/api/news', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message ?? result.detail ?? 'Could not publish this draft.')
        id = result.id
        publishedImage = result.image
      }
      const story: Article = { ...payload, id, image: publishedImage, time: 'Just now', read: '4 min read' }
      setDailyArticles((current) => [story, ...current])
      setPage('daily')
      notify(`Published to Daily News · ${draftCategory}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not publish this draft.')
    }
  }

  const allArticles = localizedArticles
  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return allArticles.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.title} ${item.summary} ${item.category} ${item.source}`.toLowerCase().includes(normalizedQuery)
      const matchesCategory = category === 'All' || item.category.toLowerCase() === category.toLowerCase()
      return matchesQuery && matchesCategory
    })
  }, [query, category])

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <button className="brand-lockup" onClick={() => navigate('home')} aria-label="KIET News Hub home">
          <span className="brand-mark"><Newspaper size={20} strokeWidth={2.1} /></span>
          <span className="brand-copy"><strong>KIET <em>NEWS HUB</em></strong><small>THE CAMPUS EDITION</small></span>
        </button>
        <div className="sidebar-scroll">
          {navGroups.map((group) => <div className="nav-group" key={group.label}>
            <span className="nav-label">{group.label}</span>
            {group.items.map(({ page: itemPage, label, icon: Icon }) => <NavButton key={itemPage} label={label} icon={Icon} active={page === itemPage} onClick={() => navigate(itemPage)} />)}
          </div>)}
          <div className="nav-group">
            <span className="nav-label">YOUR SPACE</span>
            <NavButton label="Search" icon={Search} active={page === 'search'} onClick={() => navigate('search')} />
            <NavButton label="Notifications" icon={Bell} active={page === 'notifications'} badge="3" onClick={() => navigate('notifications')} />
            <NavButton label="My profile" icon={Users} active={page === 'profile'} onClick={() => navigate('profile')} />
          </div>
          {isAdmin && <div className="nav-group">
            <span className="nav-label">MANAGEMENT</span>
            <NavButton label="Admin workspace" icon={Shield} active={page === 'admin'} badge={pendingPosts.length ? String(pendingPosts.length) : undefined} onClick={() => navigate('admin')} />
          </div>}
        </div>
        <div className="sidebar-bottom">
          <div className="campus-status"><span className="status-dot" /><span><strong>Campus is live</strong><small>KIET Group of Institutions</small></span><MoreHorizontal size={17} /></div>
          <button className="user-switcher" onClick={() => navigate('profile')}>
            <span className="avatar avatar-small">RK</span><span className="user-switcher-copy"><strong>Rakesh Kunibilli</strong><small>{roleLabels[role]}</small></span><ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>KIET NEWS HUB</span><span className="crumb-slash">/</span><strong>{page === 'home' ? 'OVERVIEW' : pageTitles[page].toUpperCase()}</strong></div>
          <div className="topbar-tools">
            <button className="top-search" onClick={() => navigate('search')}><Search size={16} /><span>Search stories</span><kbd>⌘ K</kbd></button>
            <label className="language-picker" aria-label="Choose language" title={translationStatus || 'Choose a language to translate news'}><Globe2 size={16} /><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate('notifications')}><Bell size={18} /><i /></button>
            {authToken ? <button className="session-label" onClick={() => navigate('profile')}><Shield size={14} />{roleLabels[role]}</button> : <div className="role-picker-wrap" title="Preview role-based demo views"><Shield size={14} /><select aria-label="Demo role" value={role} onChange={(event) => setRole(event.target.value as Role)}>{demoRoleEntries.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>}
          </div>
        </header>

        <div className="page-wrap">
          {page !== 'home' && <div className="page-heading"><button className="back-link" onClick={back}><ArrowLeft size={16} /> Back</button><div className="page-heading-title"><h1>{pageTitles[page]}</h1><span className="heading-rule" /></div></div>}
          {page === 'home' && <HomeView items={localizedArticles.filter((item) => item.id.startsWith('n'))} onNavigate={navigate} onOpenArticle={openArticle} onLike={toggleLike} onSave={toggleSave} onShare={share} liked={liked} saved={saved} />}
          {page === 'daily' && <NewsView title="The stories shaping your day" subtitle="A considered briefing from India and around the world." items={localizedArticles.filter((item) => item.id.startsWith('n'))} onOpen={openArticle} onLike={toggleLike} onSave={toggleSave} onShare={share} liked={liked} saved={saved} />}
          {page === 'kiet' && <NewsView title="Life at KIET, as it happens" subtitle="Official updates, student stories and ideas from across campus." items={localizedArticles.filter((item) => item.id.startsWith('k'))} onOpen={openArticle} onLike={toggleLike} onSave={toggleSave} onShare={share} liked={liked} saved={saved} campus canSubmit={canPost} pendingSubmissions={campusPending} onJoin={() => { setAuthMode('register'); setAuthError('') }} onCampusSubmit={submitCampusDraft} />}
          {page === 'highlights' && <HighlightsView posts={highlights.filter((post) => post.status === 'published' || (post.status === 'pending' && post.name === 'Rakesh Kunibilli'))} canPost={canPost} onLike={toggleLike} onSave={toggleSave} onShare={share} onReport={() => notify(canPost ? 'Report sent to the moderation team.' : 'Sign in to report content.')} onFollow={(id) => { if (requireAccount()) setFollowed((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }} liked={liked} followed={followed} uploadFile={uploadFile} onPick={handleUploadPick} caption={newCaption} setCaption={setNewCaption} onSubmit={submitHighlight} progress={uploadProgress} error={uploadError} comments={comments} commentTarget={commentTarget} setCommentTarget={setCommentTarget} commentDraft={commentDraft} setCommentDraft={setCommentDraft} onComment={submitComment} onJoin={() => { setAuthMode('register'); setAuthError('') }} />}
          {page === 'generator' && <div className="generator-page"><PhotoSourceInput fileName={generatorPhoto?.name ?? ''} status={photoOcrStatus} onPick={handleGeneratorPhoto} /><DraftCategorySelector category={draftCategory} setCategory={setDraftCategory} generated={generated} /><GeneratorView input={generatorInput} setInput={setGeneratorInput} generated={generated} title={draftTitle} setTitle={setDraftTitle} body={draftBody} setBody={setDraftBody} onGenerate={generateDraft} onSave={() => notify('Draft saved to your workspace.')} onPublish={publishGeneratedDraft} /></div>}
          {page === 'search' && <SearchView query={query} setQuery={setQuery} category={category} setCategory={setCategory} results={searchResults} onOpen={openArticle} />}
          {page === 'notifications' && <NotificationsView onOpen={() => navigate('highlights')} />}
          {page === 'profile' && <ProfileView role={role} authenticated={Boolean(authToken)} onRoleChange={setRole} onSignOut={signOut} savedCount={saved.length} postCount={highlights.filter((post) => post.name === 'Rakesh Kunibilli').length} onNavigate={navigate} />}
          {page === 'admin' && isAdmin && <><AdminView role={role} activeTab={adminTab} setActiveTab={setAdminTab} pending={pendingPosts} onModerate={moderate} /><CampusReviewPanel posts={campusPending} onReview={moderateCampusNews} /></>}
          {page === 'article' && <ArticleView article={activeArticle} onLike={toggleLike} onSave={toggleSave} onShare={share} liked={liked.includes(activeArticle.id)} saved={saved.includes(activeArticle.id)} comments={comments[activeArticle.id] ?? []} draft={commentDraft} setDraft={setCommentDraft} onComment={(event) => submitComment(event, activeArticle.id)} canPost={canPost} />}
        </div>
        <footer className="footer"><span>KIET NEWS HUB</span><span>Independent voices. One campus.</span><span>Demo mode · 2026</span></footer>
      </main>
      {authMode && <AuthDialog mode={authMode} setMode={setAuthMode} name={authName} setName={setAuthName} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} error={authError} busy={authBusy} onSubmit={submitAuth} onClose={() => setAuthMode(null)} onDemo={continueAsDemoStudent} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function AuthDialog({ mode, setMode, name, setName, email, setEmail, password, setPassword, error, busy, onSubmit, onClose, onDemo }: { mode: 'register' | 'login'; setMode: (mode: 'register' | 'login') => void; name: string; setName: (value: string) => void; email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; error: string; busy: boolean; onSubmit: (event: FormEvent) => void; onClose: () => void; onDemo: () => void }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="icon-button auth-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button><span className="auth-brand"><GraduationCap size={17} /> KIET NEWS HUB</span><h2 id="auth-title">{mode === 'register' ? 'Find your people.' : 'Welcome back.'}</h2><p>{mode === 'register' ? 'Create a student account to post, follow and join the campus conversation.' : 'Sign in to continue to your KIET community.'}</p><form onSubmit={onSubmit}>{mode === 'register' && <label className="form-label">Your name<input required minLength={2} maxLength={90} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aanya Sharma" /></label>}<label className="form-label">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@kiet.edu" /></label><label className="form-label">Password<input required type="password" minLength={mode === 'register' ? 12 : 1} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'At least 12 characters' : 'Your password'} /></label>{error && <p className="auth-error">{error}</p>}<button className="button-dark full-button" disabled={busy}>{busy ? 'Connecting…' : mode === 'register' ? 'Create student account' : 'Sign in'}<ArrowRight size={15} /></button></form><div className="auth-switch">{mode === 'register' ? 'Already a member?' : 'New to the community?'} <button onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Sign in' : 'Create account'}</button></div><div className="auth-demo"><span>Just exploring?</span><button onClick={onDemo}>Continue with demo student</button></div><small className="auth-privacy">Accounts use protected authentication. Demo mode does not save changes after refresh.</small></section></div>
}

function NavButton({ label, icon: Icon, active, onClick, badge }: { label: string; icon: LucideIcon; active: boolean; onClick: () => void; badge?: string }) {
  return <button className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={onClick}><Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span>{badge && <small>{badge}</small>}</button>
}

function PageIntro({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="section-intro"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</div>{action}</div>
}

function HomeView({ items, onNavigate, onOpenArticle, onLike, onSave, onShare, liked, saved }: { items: Article[]; onNavigate: (page: Page) => void; onOpenArticle: (article: Article) => void; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (title: string) => void; liked: string[]; saved: string[] }) {
  const lead = items[0]
  return <>
    <div className="welcome-row"><div><span className="eyebrow">MONDAY, SEPTEMBER 29, 2026 <span className="live-dot" /> LIVE BRIEFING</span><h1>Good morning, Rakesh<span className="greeting-period">.</span></h1><p>Here’s what’s moving across the world and your campus.</p></div><button className="date-chip"><Clock3 size={15} /> Your 5-minute read</button></div>
    <section className="lead-story">
      <button className="lead-image" onClick={() => onOpenArticle(lead)} style={{ backgroundImage: `url(${lead.image})` }} aria-label={`Read ${lead.title}`}><span className="image-credit">PHOTO · KIET MEDIA DESK</span><span className="image-index">01 <i /> 06</span></button>
      <div className="lead-copy"><div className="story-meta"><span className="pill pill-orange">EDITOR’S PICK</span><span>TECHNOLOGY</span><span>·</span><span>4 MIN READ</span></div><button className="headline-button" onClick={() => onOpenArticle(lead)}><h2>{lead.title}</h2></button><p>{lead.summary}</p><div className="byline"><span className="avatar avatar-author">DB</span><span><strong>The Daily Brief</strong><small>News desk · 12 min ago</small></span></div><div className="lead-actions"><button className="button-dark" onClick={() => onOpenArticle(lead)}>Read full story <ArrowRight size={16} /></button><ActionButton icon={Heart} label="Like story" active={liked.includes(lead.id)} onClick={() => onLike(lead.id)} /><ActionButton icon={Bookmark} label="Save story" active={saved.includes(lead.id)} onClick={() => onSave(lead.id)} /><ActionButton icon={Share2} label="Share story" onClick={() => onShare(lead.title)} /></div></div>
    </section>
    <div className="briefing-strip"><div><TrendingUp size={17} /><strong>THE CAMPUS PULSE</strong><span>What students are talking about today</span></div><button onClick={() => onNavigate('highlights')}>Explore highlights <ArrowRight size={15} /></button></div>
    <section className="home-lower">
      <div className="home-latest"><SectionHeader title="The latest" action="All daily news" onAction={() => onNavigate('daily')} /><div className="latest-list">{items.slice(1, 4).map((item, index) => <CompactStory key={item.id} item={item} index={index + 2} onOpen={onOpenArticle} />)}</div></div>
      <div className="campus-brief"><SectionHeader title="From KIET" action="Campus news" onAction={() => onNavigate('kiet')} /><button className="campus-brief-image" onClick={() => onNavigate('kiet')} style={{ backgroundImage: `url(${campusStories[0].image})` }}><span>ON CAMPUS</span></button><button className="campus-brief-title" onClick={() => onNavigate('kiet')}>{campusStories[0].title}</button><p>Campus Desk <span>·</span> Today</p></div>
    </section>
    <section className="home-highlights"><SectionHeader title="Campus, unfiltered" action="See all" onAction={() => onNavigate('highlights')} /><div className="highlight-strip">{initialHighlights.slice(0, 3).map((post) => <button key={post.id} className="highlight-teaser" onClick={() => onNavigate('highlights')} style={{ backgroundImage: `linear-gradient(0deg, rgba(15,31,24,.75), transparent 65%), url(${post.image})` }}><span>{post.name}</span><small>{post.caption}</small></button>)}</div></section>
  </>
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="section-header"><h3>{title}</h3><button onClick={onAction}>{action}<ArrowRight size={14} /></button></div>
}

function CompactStory({ item, index, onOpen }: { item: Article; index: number; onOpen: (article: Article) => void }) {
  return <button className="compact-story" onClick={() => onOpen(item)}><span className="compact-number">0{index}</span><span className="compact-copy"><span className="compact-category">{item.category.toUpperCase()} <i>·</i> {item.time}</span><strong>{item.title}</strong><small>{item.source} <i>·</i> {item.read}</small></span><img src={item.image} alt="" /></button>
}

function ActionButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void }) {
  return <button className={`icon-button story-action ${active ? 'action-active' : ''}`} aria-label={label} title={label} onClick={onClick}><Icon size={17} fill={active ? 'currentColor' : 'none'} /></button>
}

function NewsView({ title, subtitle, items, onOpen, onLike, onSave, onShare, liked, saved, campus = false, canSubmit = false, pendingSubmissions = [], onJoin, onCampusSubmit }: { title: string; subtitle: string; items: Article[]; onOpen: (article: Article) => void; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (title: string) => void; liked: string[]; saved: string[]; campus?: boolean; canSubmit?: boolean; pendingSubmissions?: Article[]; onJoin?: () => void; onCampusSubmit?: (draft: CampusDraft) => Promise<void> }) {
  const [filter, setFilter] = useState('All stories')
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [submissionTitle, setSubmissionTitle] = useState('')
  const [submissionSummary, setSubmissionSummary] = useState('')
  const [submissionCategory, setSubmissionCategory] = useState('Events')
  const [submissionImage, setSubmissionImage] = useState('')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const localCategories = campus ? ['All stories', 'Events', 'Placements', 'Achievements', 'Faculty', 'Workshops', 'Hackathons', 'Sports', 'Clubs', 'Departments', 'Announcements'] : ['All stories', ...categories.slice(1)]
  const filtered = items.filter((item) => filter === 'All stories' || item.category.toLowerCase() === filter.toLowerCase())
  const submitCampusForm = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      onJoin?.()
      return
    }
    try {
      await onCampusSubmit?.({ title: submissionTitle, summary: submissionSummary, category: submissionCategory, image: submissionImage })
      setSubmissionTitle('')
      setSubmissionSummary('')
      setSubmissionImage('')
      setSubmissionMessage('Published now in the selected KIET News category.')
    } catch (error) {
      setSubmissionMessage(error instanceof Error ? error.message : 'Could not submit this story.')
    }
  }
  return <>
    <PageIntro eyebrow={campus ? 'THE CAMPUS EDITION' : 'THE WORLD, IN CONTEXT'} title={title}>{subtitle}</PageIntro>
    {campus && <div className="official-note"><GraduationCap size={17} /><span><strong>Official campus desk</strong> · Verified updates from KIET departments and student bodies.</span><span className="verified-mark"><Check size={12} /></span></div>}
    {campus && <section className="campus-contribute"><div><span className="eyebrow">STUDENT CONTRIBUTIONS</span><strong>Have a KIET story?</strong><small>Publish it directly to the selected campus category.</small></div><button className="button-dark" onClick={() => canSubmit ? setSubmissionOpen((open) => !open) : onJoin?.()}><Plus size={15} />{canSubmit ? 'Write a story' : 'Sign in to post'}</button></section>}
    {campus && submissionOpen && <form className="campus-submission-form" onSubmit={submitCampusForm}><div className="submission-fields"><label className="form-label">Headline<input required maxLength={180} value={submissionTitle} onChange={(event) => setSubmissionTitle(event.target.value)} placeholder="What happened on campus?" /></label><label className="form-label">Category<select value={submissionCategory} onChange={(event) => setSubmissionCategory(event.target.value)}>{localCategories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-label submission-summary-field">Story summary<textarea required maxLength={1200} rows={3} value={submissionSummary} onChange={(event) => setSubmissionSummary(event.target.value)} placeholder="Share the verified details and why they matter." /></label><label className="form-label submission-image-field">Photo URL (optional)<input type="url" value={submissionImage} onChange={(event) => setSubmissionImage(event.target.value)} placeholder="https://example.com/campus-photo.jpg" /></label></div>{submissionMessage && <p className="submission-message" role="status">{submissionMessage}</p>}<div className="submission-actions"><span>Your story will appear immediately in this category.</span><button className="button-dark"><Send size={14} /> Publish news</button></div></form>}
    {campus && pendingSubmissions.length > 0 && <div className="my-campus-submissions">{pendingSubmissions.map((item) => <div key={item.id}><FileText size={15} /><span><strong>{item.title}</strong><small>{item.category} · Pending editorial review</small></span></div>)}</div>}
    <div className="filter-row"><div className="category-tabs">{localCategories.map((item) => <button key={item} className={filter === item ? 'category-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="filter-button"><Filter size={15} /> Latest <ChevronDown size={14} /></button></div>
    <div className="news-grid">{filtered.map((item) => <NewsCard key={item.id} item={item} onOpen={onOpen} onLike={onLike} onSave={onSave} onShare={onShare} liked={liked.includes(item.id)} saved={saved.includes(item.id)} />)}</div>
    {filtered.length === 0 && <EmptyState icon={FileText} title="No stories in this section yet" body="Check back soon for verified updates." />}
  </>
}

function NewsCard({ item, onOpen, onLike, onSave, onShare, liked, saved }: { item: Article; onOpen: (article: Article) => void; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (title: string) => void; liked: boolean; saved: boolean }) {
  return <article className="news-card"><button className="news-card-image" style={{ backgroundImage: `url(${item.image})` }} onClick={() => onOpen(item)} aria-label={`Read ${item.title}`}><span>{item.category.toUpperCase()}</span></button><div className="news-card-content"><div className="news-card-meta"><span>{item.source}</span><span>·</span><span>{item.time}</span></div><button className="news-card-title" onClick={() => onOpen(item)}><h3>{item.title}</h3></button><p>{item.summary}</p><div className="news-card-bottom"><span>{item.read}</span><div><ActionButton icon={Heart} label="Like story" active={liked} onClick={() => onLike(item.id)} /><ActionButton icon={MessageCircle} label="Comment" onClick={() => onOpen(item)} /><ActionButton icon={Share2} label="Share story" onClick={() => onShare(item.title)} /><ActionButton icon={Bookmark} label="Save story" active={saved} onClick={() => onSave(item.id)} /></div></div></div></article>
}

function VideoHighlightCard({ post, liked, followed, comments, commentTarget, commentDraft, onLike, onFollow, onSave, onShare, onReport, onComment, setCommentTarget, setCommentDraft }: { post: Highlight; liked: boolean; followed: boolean; comments: string[]; commentTarget: boolean; commentDraft: string; onLike: () => void; onFollow: () => void; onSave: () => void; onShare: () => void; onReport: () => void; onComment: (event: FormEvent) => void; setCommentTarget: () => void; setCommentDraft: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  return <article className="video-highlight-card"><div className="video-viewport"><video ref={videoRef} controls playsInline preload="metadata" poster={post.image} src={post.mediaUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}><track kind="captions" /></video>{!playing && <button className="video-play-overlay" aria-label={`Play video: ${post.caption}`} onClick={() => { void videoRef.current?.play().catch(() => {}) }}><span><Video size={19} fill="currentColor" /></span><strong>Play video</strong></button>}</div><div className="video-highlight-copy"><div className="social-user"><span className="avatar avatar-user">{post.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{post.name}</strong><small>{post.handle} · {post.time}</small></span><button className={`follow-button ${followed ? 'is-following' : ''}`} onClick={onFollow}>{followed ? 'Following' : 'Follow'}</button></div><p className="social-caption">{post.caption}</p><div className="social-actions"><button className={liked ? 'action-active' : ''} onClick={onLike}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /><span>{post.likes + (liked ? 1 : 0)}</span></button><button onClick={setCommentTarget}><MessageCircle size={18} /><span>{comments.length + 12}</span></button><button aria-label="Share video" onClick={onShare}><Share2 size={17} /></button><button className="save-post" aria-label="Save video" onClick={onSave}><Bookmark size={17} /></button><button aria-label="Report video" onClick={onReport}><Flag size={15} /></button></div>{commentTarget && <div className="comment-area"><div className="comment-list">{comments.slice(-2).map((text, index) => <p key={`${post.id}-${index}`}><strong>You</strong> {text}</p>)}</div><form onSubmit={onComment}><input aria-label="Write a comment on video" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a thoughtful comment..." /><button aria-label="Send comment"><Send size={16} /></button></form></div>}</div></article>
}

function HighlightsView(props: Parameters<typeof HighlightsViewLegacy>[0]) {
  const videos = props.posts.filter((post) => post.type === 'video')
  const photosOnly = props.posts.filter((post) => post.type !== 'video')
  return <>
    {videos.length > 0 && <section className="video-highlights"><div className="section-header"><h3>Watch campus highlights</h3><span>Public videos</span></div><div className="video-highlights-grid">{videos.map((post) => <VideoHighlightCard key={post.id} post={post} liked={props.liked.includes(post.id)} followed={props.followed.includes(post.id)} comments={props.comments[post.id] ?? []} commentTarget={props.commentTarget === post.id} commentDraft={props.commentDraft} onLike={() => props.onLike(post.id)} onFollow={() => props.onFollow(post.id)} onSave={() => props.onSave(post.id)} onShare={() => props.onShare(post.caption)} onReport={props.onReport} onComment={(event) => props.onComment(event, post.id)} setCommentTarget={() => props.setCommentTarget(props.commentTarget === post.id ? '' : post.id)} setCommentDraft={props.setCommentDraft} />)}</div></section>}
    <HighlightsViewLegacy {...props} posts={photosOnly} />
  </>
}

function HighlightsViewLegacy({ posts, canPost, onLike, onSave, onShare, onReport, onFollow, liked, followed, uploadFile, onPick, caption, setCaption, onSubmit, progress, error, comments, commentTarget, setCommentTarget, commentDraft, setCommentDraft, onComment, onJoin }: { posts: Highlight[]; canPost: boolean; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (title: string) => void; onReport: () => void; onFollow: (id: string) => void; liked: string[]; followed: string[]; uploadFile: File | null; onPick: (file?: File) => void; caption: string; setCaption: (text: string) => void; onSubmit: (event: FormEvent) => void; progress: number; error: string; comments: Record<string, string[]>; commentTarget: string; setCommentTarget: (id: string) => void; commentDraft: string; setCommentDraft: (text: string) => void; onComment: (event: FormEvent, id: string) => void; onJoin: () => void }) {
  return <>
    <PageIntro eyebrow="STUDENT LIFE, IN FRAME" title="The campus, through your eyes">Moments, milestones and everyday magic from the KIET community.</PageIntro>
    <div className="highlight-toolbar"><div className="stories-avatars"><span className="avatar avatar-story">AS</span><span className="avatar avatar-story">AM</span><span className="avatar avatar-story">MN</span><span className="avatar avatar-story">KS</span><div><strong>Good things happen here.</strong><small>Join 2,400+ campus voices</small></div></div>{canPost ? <button className="button-dark" onClick={() => document.getElementById('post-caption')?.focus()}><Plus size={16} /> Create a highlight</button> : <button className="button-dark" onClick={onJoin}>Join the community <ArrowRight size={15} /></button>}</div>
    <div className="highlights-layout"><div className="social-grid">{posts.map((post) => <article className="social-card" key={post.id}><div className="social-card-image" style={{ backgroundImage: `url(${post.image})` }}><span className="social-media-type">{post.type === 'video' ? <Video size={15} /> : <ImagePlus size={15} />}{post.status === 'pending' ? 'PENDING REVIEW' : post.type === 'video' ? 'VIDEO' : 'PHOTO'}</span>{post.type === 'video' && <span className="play-button">▶</span>}<button className="social-more" aria-label="Report post" onClick={onReport}><Flag size={16} /></button></div><div className="social-card-body"><div className="social-user"><span className="avatar avatar-user">{post.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{post.name}</strong><small>{post.handle} · {post.time}</small></span><button className={`follow-button ${followed.includes(post.id) ? 'is-following' : ''}`} onClick={() => onFollow(post.id)}>{followed.includes(post.id) ? 'Following' : 'Follow'}</button></div><p className="social-caption">{post.caption}</p><div className="social-actions"><button className={liked.includes(post.id) ? 'action-active' : ''} onClick={() => onLike(post.id)}><Heart size={18} fill={liked.includes(post.id) ? 'currentColor' : 'none'} /><span>{post.likes + (liked.includes(post.id) ? 1 : 0)}</span></button><button onClick={() => setCommentTarget(commentTarget === post.id ? '' : post.id)}><MessageCircle size={18} /><span>{(comments[post.id]?.length ?? 0) + 12}</span></button><button aria-label="Share post" onClick={() => onShare(post.caption)}><Share2 size={17} /></button><button className="save-post" aria-label="Save post" onClick={() => onSave(post.id)}><Bookmark size={17} /></button></div>{commentTarget === post.id && <div className="comment-area"><div className="comment-list">{(comments[post.id] ?? []).slice(-2).map((text, index) => <p key={`${post.id}-${index}`}><strong>You</strong> {text} <button onClick={() => setCommentDraft(`@reply `)}>Reply</button></p>)}</div><form onSubmit={(event) => onComment(event, post.id)}><input aria-label="Write a comment" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a thoughtful comment..." /><button aria-label="Send comment"><Send size={16} /></button></form></div>}</div></article>)}</div>
      <aside className="create-post-panel"><div className="panel-title"><div><span className="eyebrow">YOUR MOMENT</span><h3>Create a highlight</h3></div><span className="panel-icon"><Plus size={17} /></span></div>{canPost ? <form onSubmit={onSubmit}><label className="upload-zone"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => onPick(event.target.files?.[0])} /><Upload size={20} /><strong>{uploadFile?.name ?? 'Add a photo or video'}</strong><span>JPG, PNG, WebP, MP4, WebM or MOV · video max 300 MB</span></label><label className="form-label" htmlFor="post-caption">Caption</label><textarea id="post-caption" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What’s happening on campus? #KIET" rows={4} /><div className="caption-count">{caption.length}/500</div>{error && <p className="form-error">{error}</p>}{progress > 0 && <div className="upload-progress"><span style={{ width: `${progress}%` }} /></div>}<button className="button-dark full-button" disabled={progress > 0}><Send size={15} /> Submit for review</button></form> : <div className="guest-prompt"><Users size={25} /><strong>Your campus story starts here.</strong><p>Sign in to share a moment, follow classmates and join the conversation.</p><button className="button-dark full-button" onClick={onJoin}>Continue as student</button></div>}<div className="community-note"><Shield size={15} /><span>Every post is reviewed against our community guidelines before it goes live.</span></div></aside>
    </div>
  </>
}

function PhotoSourceInput({ fileName, status, onPick }: { fileName: string; status: string; onPick: (file?: File) => void }) {
  return <div className="photo-source-picker"><label className="generator-photo-upload"><ImagePlus size={17} /><span>{fileName || 'Choose a photo to extract source text'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onPick(event.target.files?.[0])} /></label>{status && <span className="photo-ocr-status" role="status">{status}</span>}</div>
}

function DraftCategorySelector({ generated, category, setCategory }: { generated: boolean; category: string; setCategory: (category: string) => void }) {
  if (!generated) return null
  return <label className="draft-category-picker">Publish in category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
}

function GeneratorView({ input, setInput, generated, title, setTitle, body, setBody, onGenerate, onSave, onPublish }: { input: string; setInput: (text: string) => void; generated: boolean; title: string; setTitle: (text: string) => void; body: string; setBody: (text: string) => void; onGenerate: (event: FormEvent) => void; onSave: () => void; onPublish: () => void }) {
  const [mode, setMode] = useState('Text + data')
  return <>
    <PageIntro eyebrow="AI-ASSISTED EDITING · HUMAN-VERIFIED" title="From source to first draft">Turn your notes into a structured story. Every claim stays yours to verify.</PageIntro>
    <div className="generator-workspace"><section className="generator-source"><div className="generator-section-head"><div><span className="step-number">01</span><h3>Source material</h3></div><span className="secure-note"><Shield size={13} /> Private workspace</span></div><div className="mode-tabs">{['Text + data', 'Photo', 'Photo + text'].map((item) => <button key={item} className={mode === item ? 'mode-active' : ''} onClick={() => setMode(item)}>{item === 'Photo' || item === 'Photo + text' ? <ImagePlus size={14} /> : <FileText size={14} />}{item}</button>)}</div>{mode !== 'Text + data' && <label className="generator-photo"><ImagePlus size={21} /><span>Choose a reference image</span><input type="file" accept="image/*" /></label>}<label className="form-label" htmlFor="source-material">Paste a source, notes or verified facts</label><textarea id="source-material" className="source-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Add source material, event notes or verified facts. The AI uses only what you provide." /><div className="source-foot"><span>{input.length} characters</span><span>English <ChevronDown size={13} /></span></div><button className="button-dark generate-button" onClick={(event) => onGenerate(event as unknown as FormEvent)}><Sparkles size={16} /> Generate first draft <ArrowRight size={15} /></button></section>
      <section className="generator-output"><div className="generator-section-head"><div><span className="step-number">02</span><h3>Editorial draft</h3></div><span className={`draft-status ${generated ? 'draft-ready' : ''}`}><i />{generated ? 'READY TO PUBLISH' : 'WAITING FOR SOURCE'}</span></div>{generated ? <><label className="form-label" htmlFor="draft-title">Headline</label><input id="draft-title" className="draft-title-input" value={title} onChange={(event) => setTitle(event.target.value)} /><label className="form-label" htmlFor="draft-body">Article draft</label><textarea id="draft-body" className="draft-body-input" value={body} onChange={(event) => setBody(event.target.value)} /><div className="human-review"><Shield size={17} /><p><strong>Source check</strong><br />Verify names, dates and every factual claim before publishing.</p></div><div className="draft-actions"><button className="button-outline" onClick={onSave}><Bookmark size={15} /> Save draft</button><button className="button-dark" aria-label="Publish now" onClick={onPublish}><Send size={15} /> Publish now</button></div></> : <div className="empty-draft"><div className="empty-draft-icon"><Sparkles size={22} /></div><strong>Your story takes shape here.</strong><p>Provide source material and the assistant will organize it into a headline, article and summary.</p><div className="draft-preview-lines"><i /><i /><i /><i /><i /></div></div>}</section></div>
    <div className="generator-footnote"><Zap size={15} /><span>Demo mode uses extractive drafting only. It does not call a generative model or add facts; category selection and human verification are required.</span></div>
  </>
}

function SearchView({ query, setQuery, category, setCategory, results, onOpen }: { query: string; setQuery: (value: string) => void; category: string; setCategory: (value: string) => void; results: Article[]; onOpen: (article: Article) => void }) {
  return <><PageIntro eyebrow="FIND YOUR NEXT READ" title="Stories worth your time">Search across daily coverage, KIET updates and campus categories.</PageIntro><div className="search-workspace"><label className="search-field"><Search size={19} /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ‘placements’, ‘Hyderabad’ or ‘AI’" /><kbd>ESC</kbd>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button>}</label><div className="search-filter-head"><span><strong>{results.length}</strong> stories found</span><label><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label></div><div className="search-results">{results.map((item, index) => <CompactStory key={item.id} item={item} index={index + 1} onOpen={onOpen} />)}{results.length === 0 && <EmptyState icon={Search} title="No stories found" body="Try a broader search or clear your filters." />}</div></div></>
}

function NotificationsView({ onOpen }: { onOpen: () => void }) {
  const items = [
    { icon: Heart, title: 'Your story got some love', body: 'Meera Nair and 18 others liked your campus highlight.', time: '12 min ago', fresh: true },
    { icon: MessageCircle, title: 'A new reply on your post', body: 'Arjun: “This is such a good idea, count me in.”', time: '1 hr ago', fresh: true },
    { icon: Check, title: 'Welcome to the KIET community', body: 'Your student profile is ready. Follow a few classmates to get started.', time: 'Yesterday', fresh: false },
    { icon: GraduationCap, title: 'Campus briefing is here', body: 'Three new stories from KIET were published this morning.', time: 'Yesterday', fresh: false },
  ]
  return <><PageIntro eyebrow="YOUR INBOX" title="All caught up, almost">Updates from stories and people you follow.</PageIntro><div className="notification-list">{items.map(({ icon: Icon, title, body, time, fresh }) => <button className={`notification-row ${fresh ? 'notification-fresh' : ''}`} key={title} onClick={onOpen}><span className="notification-icon"><Icon size={18} /></span><span className="notification-copy"><strong>{title}</strong><small>{body}</small></span><time>{time}</time>{fresh && <i />}</button>)}</div></>
}

function ProfileView({ role, authenticated, onRoleChange, onSignOut, savedCount, postCount, onNavigate }: { role: Role; authenticated: boolean; onRoleChange: (role: Role) => void; onSignOut: () => void; savedCount: number; postCount: number; onNavigate: (page: Page) => void }) {
  if (authenticated) return <><div className="profile-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(20,48,36,.92), rgba(20,48,36,.12)), url(${photos.campus})` }}><span>PLATFORM CREATOR</span><h2>Stories from the KIET community.</h2></div><section className="profile-main"><div className="profile-id"><span className="avatar avatar-profile">RK</span><div><h2>Rakesh Kunibilli <span className="verified-mark"><Check size={12} /></span></h2><p>KIET News Hub creator · Account holder</p><span className="profile-role">{roleLabels[role]}</span></div><button className="button-outline profile-edit" onClick={onSignOut}><LogOut size={15} /> Sign out</button></div><p className="profile-bio">Creator and account holder for KIET News Hub.</p><div className="profile-stats"><div><strong>{postCount}</strong><span>Highlights</span></div><div><strong>{savedCount}</strong><span>Saved stories</span></div></div></section><div className="profile-settings"><button className="profile-link-row" onClick={() => onNavigate('highlights')}><span><Compass size={18} /><strong>Campus highlights</strong></span><ArrowRight size={16} /></button><button className="profile-link-row" onClick={() => onNavigate('search')}><span><Bookmark size={18} /><strong>Saved stories</strong></span><ArrowRight size={16} /></button></div></>
  if (!authenticated) return <><div className="profile-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(20,48,36,.92), rgba(20,48,36,.12)), url(${photos.campus})` }}><span>PLATFORM CREATOR</span><h2>Stories from the KIET community.</h2></div><section className="profile-main"><div className="profile-id"><span className="avatar avatar-profile">RK</span><div><h2>Rakesh Kunibilli <span className="verified-mark"><Check size={12} /></span></h2><p>KIET News Hub creator · Account holder</p><span className="profile-role">Demo · {roleLabels[role]}</span></div></div><p className="profile-bio">Creator and account holder for KIET News Hub.</p><div className="profile-stats"><div><strong>{postCount}</strong><span>Highlights</span></div><div><strong>{savedCount}</strong><span>Saved stories</span></div></div></section><div className="profile-settings"><section><span className="eyebrow">DEMO ACCOUNT</span><h3>Explore demo permissions</h3><p>Super Admin access is reserved for the configured platform owner.</p><div className="role-cards">{demoRoleEntries.map(([value, label]) => <button key={value} className={role === value ? 'role-card selected-role' : 'role-card'} onClick={() => onRoleChange(value as Role)}><span>{value === 'guest' ? <Eye size={17} /> : value === 'student' ? <Users size={17} /> : value === 'editor' ? <FileText size={17} /> : <Shield size={17} />}</span><strong>{label}</strong>{role === value && <Check size={15} />}</button>)}</div></section><button className="profile-link-row" onClick={() => onNavigate('highlights')}><span><Compass size={18} /><strong>Campus highlights</strong></span><ArrowRight size={16} /></button><button className="profile-link-row" onClick={() => onNavigate('search')}><span><Bookmark size={18} /><strong>Saved stories</strong></span><ArrowRight size={16} /></button></div></>
}

function AdminView({ role, activeTab, setActiveTab, pending, onModerate }: { role: Role; activeTab: string; setActiveTab: (tab: string) => void; pending: Highlight[]; onModerate: (id: string, status: Highlight['status']) => void }) {
  const tabs = ['Overview', 'Submissions', 'Users', 'Content', 'Reports', 'Audit log']
  return <><PageIntro eyebrow={`${roleLabels[role].toUpperCase()} ACCESS`} title="Good work starts behind the scenes.">A single workspace for keeping the hub thoughtful, accurate and safe.</PageIntro><div className="admin-tabs">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'admin-tab-active' : ''} onClick={() => setActiveTab(tab)}>{tab}{tab === 'Submissions' && pending.length > 0 && <i>{pending.length}</i>}</button>)}</div>{activeTab === 'Overview' && <><div className="admin-metrics"><Metric icon={Eye} label="Story views" value="18.4k" change="+12.8% this week" /><Metric icon={Users} label="Active members" value="2,406" change="+84 this month" /><Metric icon={FileText} label="In review" value={String(pending.length + 4).padStart(2, '0')} change="Needs attention" accent /><Metric icon={Flag} label="Open reports" value="03" change="2 high priority" accent /></div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="section-header"><h3>Content activity</h3><button>Last 7 days <ChevronDown size={13} /></button></div><div className="chart-area"><div className="chart-y"><span>400</span><span>300</span><span>200</span><span>100</span><span>0</span></div><div className="chart-bars">{[40, 55, 47, 68, 58, 79, 64, 91, 74, 96, 68, 84].map((height, index) => <div key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></section><section className="admin-panel"><div className="section-header"><h3>Needs your attention</h3><button onClick={() => setActiveTab('Submissions')}>Review queue <ArrowRight size={14} /></button></div><div className="attention-row"><span className="attention-icon attention-orange"><FileText size={17} /></span><span><strong>{pending.length + 4} submissions</strong><small>Student content waiting for review</small></span><button onClick={() => setActiveTab('Submissions')}><ArrowRight size={16} /></button></div><div className="attention-row"><span className="attention-icon attention-red"><Flag size={17} /></span><span><strong>3 reports need action</strong><small>2 marked as high priority</small></span><button onClick={() => setActiveTab('Reports')}><ArrowRight size={16} /></button></div><div className="attention-row"><span className="attention-icon attention-green"><Sparkles size={17} /></span><span><strong>2 AI drafts to review</strong><small>Submitted by the editorial desk</small></span><button onClick={() => setActiveTab('Content')}><ArrowRight size={16} /></button></div></section></div><div className="admin-audit"><span><Clock3 size={15} /><strong>Recent activity</strong></span><small>Last action: Maya Verma featured “Innovation showcase” · 18 min ago</small><button onClick={() => setActiveTab('Audit log')}>View audit log <ArrowRight size={13} /></button></div></>}{activeTab === 'Submissions' && <div className="submission-list"><div className="submission-heading"><h3>Review submissions</h3><span>{pending.length} pending</span></div>{pending.length ? pending.map((post) => <div className="submission-row" key={post.id}><img src={post.image} alt="" /><div><span className="eyebrow">HIGHLIGHT · {post.time}</span><strong>{post.caption}</strong><small>Submitted by {post.name} · {post.handle}</small></div><button className="button-outline" onClick={() => onModerate(post.id, 'rejected')}><X size={15} /> Reject</button><button className="button-dark" onClick={() => onModerate(post.id, 'published')}><Check size={15} /> Approve</button></div>) : <EmptyState icon={Check} title="Review queue is clear" body="New student submissions will appear here." />}</div>}{!['Overview', 'Submissions'].includes(activeTab) && <div className="admin-placeholder"><span className="panel-icon"><Settings2 size={18} /></span><h3>{activeTab}</h3><p>This management view is seeded for demo mode. Protected actions are available to admins through the backend API.</p><button className="button-outline" onClick={() => setActiveTab('Overview')}><ArrowLeft size={15} /> Back to overview</button></div>}</>
}

function Metric({ icon: Icon, label, value, change, accent = false }: { icon: LucideIcon; label: string; value: string; change: string; accent?: boolean }) {
  return <div className={`metric-card ${accent ? 'metric-attention' : ''}`}><span className="metric-icon"><Icon size={17} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{change}</small></div>
}

function CampusReviewPanel({ posts, onReview }: { posts: Article[]; onReview: (article: Article, approved: boolean) => void }) {
  if (!posts.length) return null
  return <section className="submission-list campus-review-panel"><div className="submission-heading"><h3>KIET News awaiting review</h3><span>{posts.length} pending</span></div>{posts.map((post) => <div className="submission-row" key={post.id}><img src={post.image} alt="" /><div><span className="eyebrow">{post.category.toUpperCase()} · {post.source}</span><strong>{post.title}</strong><small>{post.summary}</small></div><button className="button-outline" onClick={() => onReview(post, false)}><X size={15} /> Reject</button><button className="button-dark" onClick={() => onReview(post, true)}><Check size={15} /> Approve</button></div>)}</section>
}

function ArticleView({ article, onLike, onSave, onShare, liked, saved, comments, draft, setDraft, onComment, canPost }: { article: Article; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (title: string) => void; liked: boolean; saved: boolean; comments: string[]; draft: string; setDraft: (text: string) => void; onComment: (event: FormEvent) => void; canPost: boolean }) {
  return <article className="article-detail"><div className="article-meta"><span>{article.category.toUpperCase()}</span><i>·</i><span>{article.source}</span><i>·</i><span>{article.time}</span></div><h1>{article.title}</h1><p className="article-deck">{article.summary}</p><div className="article-byline"><span className="avatar avatar-author">{article.source.slice(0, 2).toUpperCase()}</span><span><strong>{article.source}</strong><small>News desk · KIET News Hub</small></span><div className="article-actions"><ActionButton icon={Heart} label="Like story" active={liked} onClick={() => onLike(article.id)} /><ActionButton icon={Bookmark} label="Save story" active={saved} onClick={() => onSave(article.id)} /><ActionButton icon={Share2} label="Share story" onClick={() => onShare(article.title)} /></div></div><img className="article-cover" src={article.image} alt="" /><div className="article-body"><p className="article-opening">{article.summary}</p><p>Across the region, the pace of change is creating new opportunities for students, local organisations and the people building what comes next. The story is less about one big moment and more about the thoughtful work happening every day.</p><p>For the community involved, the next step is turning early momentum into something lasting. More details will follow as organisers and participants share their plans.</p><div className="fact-check-note"><Shield size={17} /><span><strong>Editorial note</strong><br />This is sample demo coverage created for the KIET News Hub preview.</span></div><div className="article-tags"><span>{article.category}</span><span>KIET News Hub</span><span>Community</span></div><div className="article-comments"><div className="section-header"><h3>Join the conversation</h3><span>{comments.length} comments</span></div>{comments.map((comment, index) => <p className="article-comment" key={index}><span className="avatar avatar-small">AS</span><span><strong>Aanya Sharma</strong><br />{comment}<small>Just now · Reply</small></span></p>)}<form className="article-comment-form" onSubmit={onComment}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={canPost ? 'Add a thoughtful comment...' : 'Sign in to comment'} /><button className="button-dark" disabled={!canPost}><Send size={15} /> Comment</button></form></div></div></article>
}

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="empty-state"><span><Icon size={21} /></span><strong>{title}</strong><p>{body}</p></div>
}

export default App