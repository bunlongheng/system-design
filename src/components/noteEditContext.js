import { createContext } from 'react'

// The owner's note editor, handed to every node through React Flow's tree. The
// value is (nodeId, note) => void when signed in, and null on a shared /demo
// link or while signed out - a node with no handler renders its note read-only.
export const NoteEditContext = createContext(null)
