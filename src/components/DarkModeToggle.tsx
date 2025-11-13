import { useEffect, useState } from 'react'

export default function DarkModeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const pref = localStorage.getItem('theme')
      if (pref) return pref === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch { return false }
  })

  useEffect(() => {
    const el = document.documentElement
    if (dark) {
      el.classList.add('dark')
      try { localStorage.setItem('theme', 'dark') } catch {}
    } else {
      el.classList.remove('dark')
      try { localStorage.setItem('theme', 'light') } catch {}
    }
  }, [dark])

  return (
    <button
      onClick={() => setDark(d => !d)}
      style={{ position: 'fixed', top: 12, right: 12 }}
      className="z-50 rounded-full px-3 py-1 text-sm bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 shadow"
      aria-label="Theme umschalten"
      title={dark ? 'Dunkles Thema aktiv – klicken für hell' : 'Helles Thema aktiv – klicken für dunkel'}
    >
      {dark ? 'Dark' : 'Light'}
    </button>
  )
}
