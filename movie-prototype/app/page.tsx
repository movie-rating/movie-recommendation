import { redirect } from 'next/navigation'

export default function Home() {
  // Simply redirect to onboarding
  // Session will be created when user submits the form
  redirect('/onboarding')
}
