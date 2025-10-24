'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardLoading } from '@/components/dashboard/loading-state'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { NewUserDashboard } from '@/components/dashboard/new-user-dashboard'
import { BeginnerDashboard } from '@/components/dashboard/beginner-dashboard'
import { ExperiencedDashboard } from '@/components/dashboard/experienced-dashboard'
import { getUserExperienceLevel, type ExperienceLevel } from '@/lib/dashboard/experience-level'

interface Project {
  id: string
  name: string
  type: string
  created_at: string
}

interface OnboardingChecklist {
  created_first_project: boolean
  added_first_character: boolean
  wrote_first_100_words: boolean
  used_ai_assistant: boolean
}

const DEFAULT_CHECKLIST: OnboardingChecklist = {
  created_first_project: false,
  added_first_character: false,
  wrote_first_100_words: false,
  used_ai_assistant: false,
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checklistProgress, setChecklistProgress] = useState<OnboardingChecklist | undefined>()
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('new')
  const [stats, setStats] = useState({
    projectCount: 0,
    documentCount: 0,
    totalWordsGenerated: 0,
  })
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('Dashboard load: failed to fetch user', userError)
        window.location.href = '/auth/login'
        return
      }

      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const [projectsResponse, documentsResponse, aiUsageResponse, profileResponse, authUserResponse] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('documents')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('ai_usage')
          .select('words_generated')
          .eq('user_id', user.id),
        supabase
          .from('user_profiles')
          .select('has_completed_onboarding, onboarding_checklist')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.auth.getUser(),
      ])

      if (projectsResponse.error) {
        throw projectsResponse.error
      }
      if (documentsResponse.error) {
        throw documentsResponse.error
      }
      if (aiUsageResponse.error) {
        throw aiUsageResponse.error
      }

      const projectCount = projectsResponse.count ?? 0
      const documentCount = documentsResponse.count ?? 0
      const aiUsage = aiUsageResponse.data ?? []

      const totalWordsGenerated =
        aiUsage.reduce((sum, record) => sum + (record?.words_generated || 0), 0) || 0

      setStats({
        projectCount,
        documentCount,
        totalWordsGenerated,
      })
      setProjects(projectsResponse.data ?? [])

      // Determine experience level for progressive disclosure
      if (authUserResponse.data?.user?.created_at) {
        const level = getUserExperienceLevel({
          projectCount,
          accountCreatedAt: authUserResponse.data.user.created_at,
        })
        setExperienceLevel(level)
      }

      // Check if user needs onboarding (gracefully handle missing columns)
      if (profileResponse.error) {
        const message = (profileResponse.error.message || '').toLowerCase()
        const isMissingColumns =
          message.includes('has_completed_onboarding') ||
          message.includes('onboarding_checklist')
        const isMissingRow =
          profileResponse.error.code === 'PGRST116' ||
          profileResponse.status === 406 ||
          message.includes('json object requested')

        if (isMissingColumns || isMissingRow) {
          console.warn('Onboarding profile fields unavailable; skipping onboarding gates.')
          setShowOnboarding(false)
          setChecklistProgress(DEFAULT_CHECKLIST)
        } else {
          throw profileResponse.error
        }
      } else if (profileResponse.data) {
        const hasCompletedOnboarding = profileResponse.data.has_completed_onboarding ?? false
        setShowOnboarding(!hasCompletedOnboarding)
        setChecklistProgress(
          (profileResponse.data.onboarding_checklist as OnboardingChecklist) ?? DEFAULT_CHECKLIST
        )
      } else {
        console.warn('No user profile record found; allowing dashboard access without onboarding gates.')
        setShowOnboarding(false)
        setChecklistProgress(DEFAULT_CHECKLIST)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardLoading />
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // Reload dashboard to get updated checklist progress
    loadDashboard()
  }

  // Render progressive dashboard based on experience level
  const renderDashboard = () => {
    switch (experienceLevel) {
      case 'new':
        return <NewUserDashboard />
      case 'beginner':
        return (
          <BeginnerDashboard
            projects={projects}
            stats={stats}
            checklistProgress={checklistProgress}
          />
        )
      case 'experienced':
        return <ExperiencedDashboard projects={projects} stats={stats} />
    }
  }

  return (
    <>
      {/* Onboarding Wizard - shown for first-time users */}
      <OnboardingWizard open={showOnboarding} onComplete={handleOnboardingComplete} />

      {/* Progressive Dashboard */}
      {renderDashboard()}
    </>
  )
}
