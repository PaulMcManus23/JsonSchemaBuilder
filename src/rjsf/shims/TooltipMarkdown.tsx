import React from 'react'
import { Tooltip } from '@fluentui/react-components'

interface Props {
  description?: string
  children: React.ReactNode
}

export const TooltipMarkdown: React.FC<Props> = ({ description, children }) => {
  if (!description) return <>{children}</>
  return (
    <Tooltip content={description} relationship="description">
      <span style={{ cursor: 'default' }}>{children}</span>
    </Tooltip>
  )
}
