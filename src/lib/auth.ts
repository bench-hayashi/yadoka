import { redirect } from 'next/navigation'
import { supabase } from './supabase'

export type OwnerUser = {
  id: string
  email: string
  role: string
  display_name: string | null
}

export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireOwner(): Promise<OwnerUser> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    redirect('/unauthorized')
  }

  return {
    id: user.id,
    email: user.email ?? '',
    role: profile.role as string,
    display_name: profile.display_name as string | null,
  }
}
