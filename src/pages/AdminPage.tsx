/**
 * WF-023: School Admin Panel
 * Five tabs: Overview, Manage Classes, Manage Users, Invite Teacher, School Settings.
 */

import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { OverviewTab } from '../components/admin/OverviewTab'
import { ManageClassesTab } from '../components/admin/ManageClassesTab'
import { ManageUsersTab } from '../components/admin/ManageUsersTab'
import { InviteTeacherTab } from '../components/admin/InviteTeacherTab'
import { SchoolSettingsTab } from '../components/admin/SchoolSettingsTab'

type TabId = 'overview' | 'classes' | 'users' | 'invite' | 'settings'

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  classes: 'Manage Classes',
  users: 'Manage Users',
  invite: 'Invite Teacher',
  settings: 'School Settings',
}

import { useState } from 'react'

export default function AdminPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const schoolId = profile?.school_id as string | undefined

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (!schoolId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>No school linked to this account.</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="admin-page"
    >
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="font-bold text-base"
          style={{ color: 'var(--color-text)' }}
          data-tts="WriFe School Admin"
        >
          WriFe — School Admin
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {profile?.first_name}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            data-testid="sign-out-button"
            data-tts="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav
        className="flex border-b overflow-x-auto"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        data-testid="admin-tabs"
      >
        {(Object.keys(TAB_LABELS) as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
            className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab
                ? '2px solid var(--color-brand-primary)'
                : '2px solid transparent',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {activeTab === 'overview' && <OverviewTab schoolId={schoolId} />}
        {activeTab === 'classes' && <ManageClassesTab schoolId={schoolId} />}
        {activeTab === 'users' && <ManageUsersTab schoolId={schoolId} />}
        {activeTab === 'invite' && <InviteTeacherTab schoolId={schoolId} />}
        {activeTab === 'settings' && <SchoolSettingsTab schoolId={schoolId} />}
      </main>
    </div>
  )
}
