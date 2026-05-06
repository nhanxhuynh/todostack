import { useEffect, useState } from 'react'

function useStorage(storage, key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = storage.getItem(key)
      return raw ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    storage.setItem(key, JSON.stringify(value))
  }, [storage, key, value])

  return [value, setValue]
}

export function useLocalStorage(key, initialValue) {
  return useStorage(localStorage, key, initialValue)
}

export function useSessionStorage(key, initialValue) {
  return useStorage(sessionStorage, key, initialValue)
}
