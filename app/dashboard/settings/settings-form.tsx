'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles } from 'lucide-react'

type ProfileSettings = {
  id: string
  fullName: string
  preferredGenres: string[]
  writingFocus: string
  writingPreferences: Record<string, string>
  timezone: string
}

const WRITING_FOCUS_OPTIONS = [
  { value: 'prose', label: 'Primarily prose' },
  { value: 'screenplay', label: 'Primarily screenplays' },
  { value: 'both', label: 'Both prose & screenplays' },
]

type SettingsFormProps = {
  profile: ProfileSettings
  email: string
}

export function SettingsForm({ profile, email }: SettingsFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [fullName, setFullName] = useState(profile.fullName)
  const [writingFocus, setWritingFocus] = useState(profile.writingFocus || 'prose')
  const [genresInput, setGenresInput] = useState(profile.preferredGenres.join(', '))
  const [writingGoals, setWritingGoals] = useState(profile.writingPreferences?.goals ?? '')
  const [voiceNotes, setVoiceNotes] = useState(profile.writingPreferences?.voice ?? '')
  const [timezone, setTimezone] = useState(profile.timezone ?? '')
  const [saving, setSaving] = useState(false)

  const preferredGenres = genresInput
    .split(',')
    .map((genre) => genre.trim())
    .filter((genre) => genre.length > 0)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    const writingPreferences = {
      goals: writingGoals,
      voice: voiceNotes,
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName || null,
        preferred_genres: preferredGenres,
        writing_focus: writingFocus,
        writing_preferences: writingPreferences,
        timezone: timezone || null,
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      console.error('Profile update error:', error)
      toast({
        title: 'Update failed',
        description: 'We could not save your preferences. Please try again.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Preferences updated',
      description: 'Your writing workspace is now tailored to your goals.',
    })
  }

  const handleUseLocalTimezone = () => {
    try {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (localTz) {
        setTimezone(localTz)
      }
    } catch (error) {
      console.warn('Unable to detect timezone', error)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="rounded-3xl border bg-card/80 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Personalization
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Workspace settings</h1>
              <p className="text-sm text-muted-foreground">
                Fine-tune how Ottowrite collaborates with you—from tone guidance to scheduling.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Account</p>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {email}
            </Badge>
          </div>
        </div>
      </section>

      <form className="space-y-8" onSubmit={handleSave}>
        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Who should Ottowrite address and reference in documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="bg-muted/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Primary writing focus</Label>
              <Select value={writingFocus} onValueChange={(value) => setWritingFocus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your focus" />
                </SelectTrigger>
                <SelectContent>
                  {WRITING_FOCUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader>
            <CardTitle>Creative preferences</CardTitle>
            <CardDescription>
              Share your genre interests, goals, and voice guidance to shape AI suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="genres">Preferred genres</Label>
              <Textarea
                id="genres"
                placeholder="Fantasy, Thriller, Literary Fiction"
                value={genresInput}
                onChange={(event) => setGenresInput(event.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Separate with commas. Ottowrite uses this to recommend tailored beat sheets and prompts.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goals">Writing goals</Label>
                <Textarea
                  id="goals"
                  placeholder="Share the milestones you want Ottowrite to keep you accountable for."
                  value={writingGoals}
                  onChange={(event) => setWritingGoals(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice">Voice & tone guidance</Label>
                <Textarea
                  id="voice"
                  placeholder="Describe style, pacing, or voice cues Ottowrite should honor."
                  value={voiceNotes}
                  onChange={(event) => setVoiceNotes(event.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/80 shadow-card">
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
            <CardDescription>Choose the timezone for reminders, analytics, and collaboration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="e.g. America/New_York"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleUseLocalTimezone}>
                Use my timezone
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We use your timezone to schedule AI-assisted writing sessions and align progress reports.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-6">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
