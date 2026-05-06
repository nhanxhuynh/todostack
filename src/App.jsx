import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocalStorage } from './useLocalStorage'
import './App.css'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const modKey = isMac ? '⌘' : 'Ctrl'

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
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (stacks.length === 0) setStacks([newStack('todo')])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setStacks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, tasks: s.tasks.slice(1) } : s)),
    )
  }

  const popCard = (stackId, taskId) =>
    setStacks((prev) =>
      prev.map((s) =>
        s.id === stackId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
      ),
    )

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
      if (meta && e.key === 'Backspace') {
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, stacks, focused]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <button className="add-stack" onClick={addStack} title="new stack">
          + new stack
        </button>
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
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={focused ? `push to "${focused.name}"…` : 'push…'}
            aria-label="new task"
          />
          <button type="submit" disabled={!input.trim()}>
            push
          </button>
        </form>

        <ul className="shortcuts" aria-label="keyboard shortcuts">
          <li><kbd>Enter</kbd> push</li>
          <li><kbd>{modKey}</kbd>+<kbd>⌫</kbd> pop top</li>
          <li><kbd>{modKey}</kbd>+<kbd>[</kbd>/<kbd>]</kbd> switch</li>
          <li><kbd>{modKey}</kbd>+<kbd>1</kbd>–<kbd>9</kbd> jump</li>
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
            title={focused ? 'click to rename' : 'click to focus'}
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
            title="delete stack"
            aria-label="delete stack"
          >
            ×
          </button>
        </div>
      </div>

      <div className="stack-body">
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
              title="click to pop"
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
