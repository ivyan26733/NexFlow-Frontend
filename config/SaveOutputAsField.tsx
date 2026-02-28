'use client'

import { useState, useEffect } from 'react'
import { Field } from '../NodeConfigPanel'

const VALID_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/

interface Props {
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

export default function SaveOutputAsField({ config, onChange }: Props) {
  const currentSaveAs = (config.saveOutputAs as string) ?? ''
  const [inputValue, setInputValue] = useState(currentSaveAs)
  const [lastValid, setLastValid] = useState(currentSaveAs)

  useEffect(() => {
    setInputValue(currentSaveAs)
    setLastValid(currentSaveAs)
  }, [currentSaveAs])

  const trimmed = inputValue.trim()
  const isValid = trimmed === '' || VALID_KEY.test(trimmed)
  const displayError = trimmed.length > 0 && !VALID_KEY.test(trimmed)

  const handleChange = (value: string) => {
    setInputValue(value)
    const t = value.trim()
    if (t === '') {
      setLastValid('')
      onChange({ ...config, saveOutputAs: '' })
      return
    }
    if (VALID_KEY.test(t)) {
      setLastValid(t)
      onChange({ ...config, saveOutputAs: t })
    }
  }

  const previewName = isValid ? trimmed || lastValid : lastValid

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '1rem', paddingTop: '1rem' }}>
      <Field label="SAVE OUTPUT AS  (optional)" className="config-panel-field">
        <input
          type="text"
          className="input-base"
          placeholder="e.g. userData"
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
        />
        {displayError && (
          <p style={{ fontSize: '0.7rem', color: 'var(--color-failure)', marginTop: '0.35rem', marginBottom: 0 }}>
            Only letters, numbers, underscore. Must start with a letter.
          </p>
        )}
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.35rem', marginBottom: '0.25rem' }}>
          Access anywhere as nex.NAME
        </p>
        {previewName && (
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#F59E0B', margin: 0 }}>
            → nex.{previewName}.yourField
          </p>
        )}
      </Field>
    </div>
  )
}
