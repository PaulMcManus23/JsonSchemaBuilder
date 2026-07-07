import * as React from 'react'
import type { WidgetProps } from '@rjsf/core'

function renderInlineBold(value: string): React.ReactNode {
  const boldRegex = /\*\*(.+?)\*\*/g
  const parts: React.ReactNode[] = []
  let currentIndex = 0
  let match = boldRegex.exec(value)

  while (match) {
    const [fullMatch, boldText] = match
    const matchStart = match.index
    if (matchStart > currentIndex) parts.push(value.slice(currentIndex, matchStart))
    parts.push(<strong key={`${matchStart}-${boldText}`}>{boldText}</strong>)
    currentIndex = matchStart + fullMatch.length
    match = boldRegex.exec(value)
  }

  if (currentIndex < value.length) parts.push(value.slice(currentIndex))
  return parts.length > 0 ? parts : value
}

const ReadOnlyTextWidget: React.FC<WidgetProps> = ({ value }) => {
  if (typeof value !== 'string') return <span>{value ?? ''}</span>
  return <span>{renderInlineBold(value)}</span>
}

export default ReadOnlyTextWidget
