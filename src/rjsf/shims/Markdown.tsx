import React from 'react'

export const Markdown: React.FC<{ children?: string }> = ({ children }) => {
  if (!children) return null
  const boldRegex = /\*\*(.+?)\*\*/g
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  boldRegex.lastIndex = 0
  while ((m = boldRegex.exec(children)) !== null) {
    if (m.index > last) parts.push(children.slice(last, m.index))
    parts.push(<strong key={key++}>{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < children.length) parts.push(children.slice(last))
  return <>{parts}</>
}

export default Markdown
