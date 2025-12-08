// ABOUTME: Redirect /run to /keywords for backwards compatibility
import { redirect } from 'next/navigation'

export default function RunPage() {
  redirect('/keywords')
}




