'use client'

import { Node, mergeAttributes, type CommandProps } from '@tiptap/core'

export interface SceneAnchorOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneAnchor: {
      insertSceneAnchor: (sceneId: string) => ReturnType
      ensureSceneAnchor: (sceneId: string) => ReturnType
    }
  }
}

export const SceneAnchor = Node.create<SceneAnchorOptions>({
  name: 'sceneAnchor',

  inline: true,
  atom: true,
  selectable: false,
  draggable: false,
  group: 'inline',
  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {
        'data-scene-anchor': 'true',
        style: 'display: none;',
      },
    }
  },

  addAttributes() {
    return {
      sceneId: {
        default: null,
        keepOnSplit: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-scene-id'),
        renderHTML: (attributes) => {
          if (!attributes.sceneId) {
            return {}
          }
          return {
            'data-scene-id': attributes.sceneId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-scene-anchor="true"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      insertSceneAnchor:
        (sceneId: string) =>
        ({ commands, editor }: CommandProps) => {
          if (!sceneId || editor.isDestroyed) {
            return false
          }

          const existing = editor.view.dom.querySelector(
            `[data-scene-anchor="true"][data-scene-id="${sceneId}"]`
          )
          if (existing) {
            existing.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return true
          }

          return commands.insertContent({
            type: this.name,
            attrs: { sceneId },
          })
        },
      ensureSceneAnchor:
        (sceneId: string) =>
        ({ editor, tr, state }: CommandProps) => {
          if (!sceneId || editor.isDestroyed) {
            return false
          }

          const { doc } = state
          let anchorFound = false

          doc.descendants((node, _pos) => {
            if (anchorFound) return false
            if (node.type.name === this.name && node.attrs.sceneId === sceneId) {
              anchorFound = true
              return false
            }
            return true
          })

          if (anchorFound) {
            return true
          }

          const position = editor.state.selection.from
          tr.insert(position, this.type.create({ sceneId }))
          editor.view.dispatch(tr)
          return true
        },
    }
  },
})
