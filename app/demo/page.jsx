import AppClient from '../AppClient.jsx'
import { designMetadata } from '../share-metadata.js'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }) {
  return designMetadata(searchParams, '/demo')
}

export default function Page() {
  return <AppClient />
}
