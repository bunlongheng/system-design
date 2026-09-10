'use client'

import dynamic from 'next/dynamic'

// The canvas is a browser thing end to end - React Flow measures real DOM nodes,
// and the app reads window.location to decide which view it is on. There is
// nothing to server-render, and trying threw "window is not defined" on every
// request. Rendering it client-side only is the honest description of what it is.
//
// The parts that MUST be server-rendered - the share card's title and image -
// are metadata, and generateMetadata handles those independently of this.
const App = dynamic(() => import('../src/App.jsx'), { ssr: false })

export default function AppClient() {
  return <App />
}
