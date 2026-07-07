import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { WidgetProps } from '@rjsf/core'
import { CheckmarkRegular } from '@fluentui/react-icons'

const colourPickerSharedState = {
  currentlyOpenPickerId: null as string | null,
  changeCounter: 0,
}

const HEATMAP_COLORS: string[] = [
  'altus-rh-capacity-level--0', 'altus-rh-capacity-level--1', 'altus-rh-capacity-level--2',
  'altus-rh-capacity-level--3', 'altus-rh-capacity-level--4', 'altus-rh-capacity-level--5',
  'altus-rh-capacity-level--6', 'altus-rh-capacity-level--7', 'altus-rh-capacity-level--8',
  'altus-rh-capacity-level--9', 'altus-rh-capacity-level--10', 'altus-rh-capacity-level--11',
  'altus-rh-capacity-level--12',
]

interface IColourPickerWidgetProps extends WidgetProps {
  value: string
}

const ColourPickerWidget = ({ id, disabled, readonly, label, value, onChange, onBlur, rawErrors }: IColourPickerWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [positionAbove, setPositionAbove] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleColorClick = useCallback((className: string) => {
    if (disabled || readonly) return
    onChange(className)
    setIsExpanded(false)
    colourPickerSharedState.currentlyOpenPickerId = null
    colourPickerSharedState.changeCounter++
  }, [disabled, readonly, onChange])

  const handleSelectedSwatchClick = useCallback(() => {
    if (disabled || readonly) return
    const willExpand = !isExpanded
    if (willExpand) {
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - buttonRect.bottom
        const estimatedHeight = Math.ceil(HEATMAP_COLORS.length / 4) * 35 + 50
        setPositionAbove(spaceBelow < estimatedHeight)
      }
      colourPickerSharedState.currentlyOpenPickerId = id
      colourPickerSharedState.changeCounter++
      window.dispatchEvent(new Event('colourPickerStateChange'))
    } else {
      colourPickerSharedState.currentlyOpenPickerId = null
      colourPickerSharedState.changeCounter++
      window.dispatchEvent(new Event('colourPickerStateChange'))
    }
    setIsExpanded(willExpand)
  }, [disabled, readonly, isExpanded, id])

  useEffect(() => {
    if (!isExpanded) return
    const handlePickerStateChange = () => {
      if (colourPickerSharedState.currentlyOpenPickerId !== id && colourPickerSharedState.currentlyOpenPickerId !== null) {
        setIsExpanded(false)
      }
    }
    window.addEventListener('colourPickerStateChange', handlePickerStateChange)
    return () => window.removeEventListener('colourPickerStateChange', handlePickerStateChange)
  }, [isExpanded, id])

  useEffect(() => {
    if (!isExpanded) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.colour-picker-overlay') && !target.closest('.colour-picker-button')) {
        setIsExpanded(false)
        colourPickerSharedState.currentlyOpenPickerId = null
        colourPickerSharedState.changeCounter++
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  const rows: string[][] = []
  for (let i = 0; i < HEATMAP_COLORS.length; i += 4) {
    rows.push(HEATMAP_COLORS.slice(i, i + 4))
  }

  return (
    <div style={{ position: 'relative' }} onBlur={() => onBlur(id, value)}>
      <button
        ref={buttonRef}
        className={`${value || ''} colour-picker-button`}
        disabled={disabled || readonly}
        type="button"
        style={{
          width: 25, height: 25, border: '1px solid #ddd', borderRadius: 4,
          cursor: disabled || readonly ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1, transition: 'all 0.2s ease',
        }}
        onClick={handleSelectedSwatchClick}
      />
      {isExpanded && (
        <div
          ref={overlayRef}
          className="colour-picker-overlay"
          style={{
            position: 'absolute',
            ...(positionAbove ? { bottom: 45 } : { top: 40 }),
            left: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8,
            padding: 12, border: '1px solid #ddd', borderRadius: 4,
            backgroundColor: '#ffffff', boxShadow: '0 4px 8px rgba(0,0,0,.15)',
          }}
        >
          {rows.map((row) => (
            <div key={row[0]} style={{ display: 'flex', gap: 8 }}>
              {row.map((colorClassName) => {
                const isSelected = value === colorClassName
                return (
                  <button
                    key={colorClassName}
                    className={colorClassName}
                    disabled={disabled || readonly}
                    type="button"
                    style={{
                      width: 25, height: 25,
                      border: isSelected ? '2px solid #ddd' : '1px solid #ddd',
                      borderRadius: 4, cursor: disabled || readonly ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1, transition: 'all 0.2s ease', position: 'relative',
                    }}
                    onClick={() => handleColorClick(colorClassName)}
                  >
                    {isSelected && (
                      <CheckmarkRegular
                        style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)', fontSize: 14, color: '#000',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
      {Array.isArray(rawErrors) && rawErrors.length > 0 && (
        <div style={{ color: '#a80000', fontSize: 12, marginTop: 4 }}>{rawErrors.join(', ')}</div>
      )}
    </div>
  )
}

export default ColourPickerWidget
