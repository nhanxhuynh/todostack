import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocalStorage, useSessionStorage } from './useLocalStorage'
import './App.css'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const modKey = isMac ? '⌘' : 'Ctrl'
const shiftKey = isMac ? '⇧' : 'Shift'

const initialTheme = () =>
  (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) ||
  'light'

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
  </svg>
)

const randomHue = () => Math.floor(Math.random() * 360)
const newStack = (name) => ({
  id: crypto.randomUUID(),
  name: name || 'untitled',
  hue: randomHue(),
  tasks: [],
})

export default function App() {
  const [stacks, setStacks] = useLocalStorage('todostack/v2/stacks', [])
  const [focusedId, setFocusedId] = useLocalStorage('todostack/v2/focused', null)
  const [theme, setTheme] = useLocalStorage('todostack/v2/theme', initialTheme())
  const [undoLog, setUndoLog] = useSessionStorage('todostack/v2/undo', [])
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const recordUndo = (action) =>
    setUndoLog((prev) => [...prev, action].slice(-50))

  useEffect(() => {
    if (stacks.length === 0) setStacks([newStack('todo')])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const focused = stacks.find((s) => s.id === focusedId) || stacks[0]

  useEffect(() => {
    if (focused && focused.id !== focusedId) setFocusedId(focused.id)
  }, [focused, focusedId, setFocusedId])

  const updateStack = (id, patch) =>
    setStacks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const push = (e) => {
    e?.preventDefault?.()
    const text = input.trim()
    if (!text || !focused) return
    setStacks((prev) =>
      prev.map((s) =>
        s.id === focused.id
          ? { ...s, tasks: [{ id: crypto.randomUUID(), text }, ...s.tasks] }
          : s,
      ),
    )
    setInput('')
  }

  const popTop = (stackId) => {
    const id = stackId ?? focused?.id
    if (!id) return
    const stack = stacks.find((s) => s.id === id)
    if (!stack || stack.tasks.length === 0) return
    recordUndo({ type: 'pop', stackId: id, task: stack.tasks[0], index: 0 })
    setStacks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, tasks: s.tasks.slice(1) } : s)),
    )
  }

  const popCard = (stackId, taskId) => {
    const stack = stacks.find((s) => s.id === stackId)
    if (!stack) return
    const idx = stack.tasks.findIndex((t) => t.id === taskId)
    if (idx === -1) return
    recordUndo({ type: 'pop', stackId, task: stack.tasks[idx], index: idx })
    setStacks((prev) =>
      prev.map((s) =>
        s.id === stackId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
      ),
    )
  }

  const undo = () => {
    if (undoLog.length === 0) return
    const action = undoLog[undoLog.length - 1]
    setUndoLog((prev) => prev.slice(0, -1))
    if (action.type === 'pop') {
      setStacks((prev) =>
        prev.map((s) => {
          if (s.id !== action.stackId) return s
          const i = Math.min(action.index, s.tasks.length)
          return { ...s, tasks: [...s.tasks.slice(0, i), action.task, ...s.tasks.slice(i)] }
        }),
      )
    }
  }

  const addStack = () => {
    const s = newStack(`stack ${stacks.length + 1}`)
    setStacks((prev) => [...prev, s])
    setFocusedId(s.id)
  }

  const deleteStack = (id) => {
    setStacks((prev) => {
      const next = prev.filter((s) => s.id !== id)
      return next.length === 0 ? [newStack('todo')] : next
    })
  }

  const switchStack = (delta) => {
    if (stacks.length < 2 || !focused) return
    const i = stacks.findIndex((s) => s.id === focused.id)
    setFocusedId(stacks[(i + delta + stacks.length) % stacks.length].id)
  }

  useEffect(() => {
    const onKey = (e) => {
      const inOtherInput =
        e.target.tagName === 'INPUT' && e.target !== inputRef.current
      if (inOtherInput) return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        if (focused) deleteStack(focused.id)
      } else if (meta && e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        addStack()
      } else if (meta && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        popTop()
      } else if (meta && e.key === ']') {
        e.preventDefault()
        switchStack(1)
      } else if (meta && e.key === '[') {
        e.preventDefault()
        switchStack(-1)
      } else if (meta && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (stacks[i]) {
          e.preventDefault()
          setFocusedId(stacks[i].id)
        }
      } else if (e.key === 'Escape') {
        if (input) setInput('')
        else inputRef.current?.blur()
      } else if (meta && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (meta && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (e.target === inputRef.current && input.length > 0) return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, stacks, focused, undoLog]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalTasks = stacks.reduce((acc, s) => acc + s.tasks.length, 0)

  return (
    <main className="app">
      <header className="head">
        <div>
          <h1>todostack</h1>
          <p className="tagline">
            {stacks.length} stack{stacks.length === 1 ? '' : 's'} · {totalTasks} task
            {totalTasks === 1 ? '' : 's'}
          </p>
        </div>
        <div className="head-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="add-stack" onClick={addStack} title="new stack">
            + new stack
            <span className="kbd-hint">
              <kbd>{modKey}</kbd><kbd>{shiftKey}</kbd><kbd>↵</kbd>
            </span>
          </button>
        </div>
      </header>

      <section className="grid">
        {stacks.map((stack, idx) => (
          <StackCard
            key={stack.id}
            stack={stack}
            index={idx}
            focused={focused?.id === stack.id}
            onFocus={() => setFocusedId(stack.id)}
            onRename={(name) => updateStack(stack.id, { name })}
            onDelete={() => deleteStack(stack.id)}
            onPopCard={(taskId) => popCard(stack.id, taskId)}
          />
        ))}
      </section>

      <div className="dock" style={{ '--stack-hue': focused?.hue ?? 280 }}>
        <form className="composer" onSubmit={push}>
          <button
            type="button"
            className="undo-btn"
            onClick={undo}
            disabled={undoLog.length === 0}
            title={
              undoLog.length === 0
                ? 'nothing to undo'
                : `undo last pop (${undoLog.length} available)`
            }
            aria-label="undo last pop"
          >
            <UndoIcon />
            <span className="kbd-hint">
              <kbd>{modKey}</kbd><kbd>Z</kbd>
            </span>
            {undoLog.length > 0 && <span className="undo-count">{undoLog.length}</span>}
          </button>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={focused ? `push to "${focused.name}"…` : 'push…'}
            aria-label="new task"
          />
          <button type="submit" disabled={!input.trim()} title="push">
            push
            <span className="kbd-hint">
              <kbd>↵</kbd>
            </span>
          </button>
        </form>

        <ul className="shortcuts" aria-label="keyboard shortcuts">
          <li><kbd>{modKey}</kbd>+<kbd>K</kbd> pop top</li>
          <li><kbd>{modKey}</kbd>+<kbd>[</kbd>/<kbd>]</kbd> switch</li>
          <li><kbd>{modKey}</kbd>+<kbd>1</kbd>–<kbd>9</kbd> jump</li>
          <li><kbd>{modKey}</kbd>+<kbd>{shiftKey}</kbd>+<kbd>K</kbd> delete stack</li>
          <li><kbd>Esc</kbd> clear</li>
          <li><kbd>{modKey}</kbd>+<kbd>/</kbd> focus</li>
        </ul>
      </div>
    </main>
  )
}

function StackCard({ stack, index, focused, onFocus, onRename, onDelete, onPopCard }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(stack.name)

  useEffect(() => setDraft(stack.name), [stack.name])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== stack.name) onRename(trimmed)
    else setDraft(stack.name)
  }

  return (
    <div
      className="stack-card"
      data-focused={focused}
      style={{ '--stack-hue': stack.hue }}
      onClick={() => !focused && onFocus()}
    >
      <div className="stack-head">
        {editing ? (
          <input
            className="rename"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(stack.name)
                setEditing(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className="stack-name"
            onClick={(e) => {
              e.stopPropagation()
              if (focused) setEditing(true)
              else onFocus()
            }}
            title={
              focused
                ? 'click to rename'
                : `click to focus${index < 9 ? ` · ${modKey}+${index + 1}` : ''}`
            }
          >
            <span className="dot" />
            <span className="label">{stack.name}</span>
            {index < 9 && <span className="num">{index + 1}</span>}
          </button>
        )}
        <div className="stack-actions">
          <span className="count" aria-label="tasks">{stack.tasks.length}</span>
          <button
            type="button"
            className="x"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title={focused ? `delete stack · ${modKey}+${shiftKey}+K` : 'delete stack'}
            aria-label="delete stack"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="stack-body"
        style={{ '--task-count': stack.tasks.length }}
      >
        <AnimatePresence initial={false}>
          {stack.tasks.map((task, i) => (
            <motion.button
              key={task.id}
              type="button"
              className="card"
              onClick={(e) => {
                e.stopPropagation()
                onPopCard(task.id)
              }}
              data-top={i === 0}
              style={{ zIndex: stack.tasks.length - i }}
              initial={{ y: -36, opacity: 0, rotate: 0 }}
              animate={{
                y: i * 6,
                x: (i % 2 === 0 ? -1 : 1) * Math.min(i, 4) * 1.5,
                rotate: (i % 2 === 0 ? -1 : 1) * Math.min(i, 5) * 0.5,
                opacity: 1,
                scale: 1 - Math.min(i, 6) * 0.018,
              }}
              exit={{ x: 220, opacity: 0, rotate: 12, transition: { duration: 0.22 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              whileHover={{ scale: 1.01 - Math.min(i, 6) * 0.018 }}
              whileTap={{ scale: 0.96 }}
              title={i === 0 ? `click to pop · ${modKey}+K` : 'click to pop'}
            >
              <span className="text">{task.text}</span>
            </motion.button>
          ))}
        </AnimatePresence>
        {stack.tasks.length === 0 && <p className="empty">empty</p>}
      </div>
    </div>
  )
}
