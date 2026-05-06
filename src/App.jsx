import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocalStorage } from './useLocalStorage'
import './App.css'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const modKey = isMac ? '⌘' : 'Ctrl'

export default function App() {
  const [tasks, setTasks] = useLocalStorage('todostack', [])
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const push = (e) => {
    e?.preventDefault?.()
    const text = input.trim()
    if (!text) return
    setTasks((prev) => [{ id: crypto.randomUUID(), text }, ...prev])
    setInput('')
  }

  const popTop = () => setTasks((prev) => prev.slice(1))
  const popById = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault()
        popTop()
      } else if (e.key === 'Escape') {
        if (input) {
          setInput('')
        } else {
          inputRef.current?.blur()
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input])

  return (
    <main className="app">
      <header>
        <h1>todostack</h1>
        <p className="tagline">last in, first out — top of the stack is what's next</p>
      </header>

      <section className="stack" aria-live="polite">
        <AnimatePresence initial={false}>
          {tasks.map((task, i) => (
            <motion.button
              key={task.id}
              type="button"
              className="card"
              onClick={() => popById(task.id)}
              data-top={i === 0}
              style={{ zIndex: tasks.length - i }}
              initial={{ y: -60, opacity: 0, rotate: 0 }}
              animate={{
                y: i * 8,
                x: (i % 2 === 0 ? -1 : 1) * Math.min(i, 4) * 2,
                rotate: (i % 2 === 0 ? -1 : 1) * Math.min(i, 5) * 0.6,
                opacity: 1,
                scale: 1 - Math.min(i, 6) * 0.02,
              }}
              exit={{ x: 320, opacity: 0, rotate: 12, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              whileHover={{ scale: 1.02 - Math.min(i, 6) * 0.02 }}
              whileTap={{ scale: 0.97 }}
              title="click to pop"
            >
              <span className="text">{task.text}</span>
              {i === 0 && <span className="badge">top · click to pop</span>}
            </motion.button>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <p className="empty">empty stack — push a task below</p>
        )}
      </section>

      <div className="dock">
        {tasks.length > 0 && (
          <div className="meta">
            <span>{tasks.length} on stack</span>
            <button className="link" onClick={() => setTasks([])}>clear all</button>
          </div>
        )}

        <form className="composer" onSubmit={push}>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="push a task onto the stack…"
            aria-label="new task"
          />
          <button type="submit" disabled={!input.trim()}>push</button>
        </form>

        <ul className="shortcuts" aria-label="keyboard shortcuts">
          <li><kbd>Enter</kbd> push</li>
          <li><kbd>{modKey}</kbd>+<kbd>⌫</kbd> pop top</li>
          <li><kbd>Esc</kbd> clear input</li>
          <li><kbd>{modKey}</kbd>+<kbd>/</kbd> focus input</li>
        </ul>
      </div>
    </main>
  )
}
