import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocalStorage } from './useLocalStorage'
import './App.css'

export default function App() {
  const [tasks, setTasks] = useLocalStorage('todostack', [])
  const [input, setInput] = useState('')

  const push = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTasks([{ id: crypto.randomUUID(), text }, ...tasks])
    setInput('')
  }

  const pop = (id) => setTasks(tasks.filter((t) => t.id !== id))

  return (
    <main className="app">
      <header>
        <h1>todostack</h1>
        <p className="hint">last in, first out — top of the stack is what's next</p>
      </header>

      <form className="composer" onSubmit={push}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="push a task onto the stack…"
          aria-label="new task"
        />
        <button type="submit" disabled={!input.trim()}>push</button>
      </form>

      <section className="stack" aria-live="polite">
        <AnimatePresence initial={false}>
          {tasks.map((task, i) => (
            <motion.button
              key={task.id}
              type="button"
              className="card"
              onClick={() => pop(task.id)}
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
          <p className="empty">empty stack — add something above</p>
        )}
      </section>

      {tasks.length > 0 && (
        <footer>
          <span>{tasks.length} on stack</span>
          <button className="link" onClick={() => setTasks([])}>clear all</button>
        </footer>
      )}
    </main>
  )
}
