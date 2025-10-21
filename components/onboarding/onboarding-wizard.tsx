'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { WelcomeStep } from './welcome-step'
import { ProjectTypeStep } from './project-type-step'
import { TemplateStep } from './template-step'
import { TourStep } from './tour-step'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingWizardProps {
  open: boolean
  onComplete: () => void
}

type ProjectType = 'novel' | 'series' | 'screenplay' | 'play' | 'short_story'

const STEPS = ['welcome', 'project-type', 'template', 'tour'] as const
type Step = typeof STEPS[number]

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const currentStepIndex = STEPS.indexOf(currentStep)
  const totalSteps = STEPS.length
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  const goToNextStep = () => {
    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1])
    }
  }

  const goToPreviousStep = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1])
    }
  }

  const handleSkipOnboarding = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase
          .from('user_profiles')
          .update({
            has_completed_onboarding: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      onComplete()
      router.refresh()
    } catch (error) {
      console.error('Error skipping onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase
          .from('user_profiles')
          .update({
            has_completed_onboarding: true,
            onboarding_completed_at: new Date().toISOString(),
            onboarding_step: totalSteps,
          })
          .eq('id', user.id)

        toast({
          title: 'Welcome to Ottowrite! 🎉',
          description: 'Your workspace is ready. Start creating your first story.',
        })
      }

      onComplete()
      router.refresh()
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (currentStep === 'project-type') {
      return selectedProjectType !== null
    }
    return true
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="sr-only">
            Onboarding - Step {currentStepIndex + 1} of {totalSteps}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete the onboarding process to get started with Ottowrite
          </DialogDescription>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipOnboarding}
                disabled={loading}
              >
                Skip for now
              </Button>
            </div>
            <div className="flex gap-2">
              {STEPS.map((step, index) => (
                <div
                  key={step}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-colors',
                    index <= currentStepIndex
                      ? 'bg-primary'
                      : 'bg-secondary'
                  )}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="py-8">
          {currentStep === 'welcome' && <WelcomeStep />}

          {currentStep === 'project-type' && (
            <ProjectTypeStep
              selectedType={selectedProjectType}
              onSelect={setSelectedProjectType}
            />
          )}

          {currentStep === 'template' && (
            <TemplateStep
              projectType={selectedProjectType || 'novel'}
              onTemplateSelected={goToNextStep}
              onSkip={goToNextStep}
            />
          )}

          {currentStep === 'tour' && (
            <TourStep
              onComplete={handleCompleteOnboarding}
              onSkip={handleCompleteOnboarding}
            />
          )}
        </div>

        {/* Navigation Footer (except for template and tour steps which have their own CTAs) */}
        {currentStep !== 'template' && currentStep !== 'tour' && (
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={isFirstStep || loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={goToNextStep}
              disabled={!canProceed() || loading}
            >
              {currentStep === 'project-type' ? 'Continue with ' + selectedProjectType : 'Continue'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
