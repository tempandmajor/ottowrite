'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ProfileSettings = {
  id: string
  fullName: string
  preferredGenres: string[]
  writingFocus: string
  writingPreferences: Record<string, string>
  timezone: string
}

const WRITING_FOCUS_OPTIONS = [
  { value: 'prose', label: 'Primarily Prose' },
  { value: 'screenplay', label: 'Primarily Screenplays' },
  { value: 'both', label: 'Both Prose & Screenplays' },
]

type SettingsFormProps = {
  profile: ProfileSettings
  email: string
}

export function SettingsForm({ profile, email }: SettingsFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [fullName, setFullName] = useState(profile.fullName)
  const [writingFocus, setWritingFocus] = useState(
    profile.writingFocus || 'prose'
  )
  const [genresInput, setGenresInput] = useState(
    profile.preferredGenres.join(', ')
  )
  const [writingGoals, setWritingGoals] = useState(
    profile.writingPreferences?.goals ?? ''
  )
  const [voiceNotes, setVoiceNotes] = useState(
    profile.writingPreferences?.voice ?? ''
  )
  const [timezone, setTimezone] = useState(profile.timezone ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    const preferredGenres = genresInput
      .split(',')
      .map((genre) => genre.trim())
      .filter((genre) => genre.length > 0)

    const writingPreferences = {
      goals: writingGoals,
      voice: voiceNotes,
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
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
      title: 'Profile updated',
      description: 'Your writing preferences have been saved.',
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
    <div className="max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update the name and preferences associated with your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
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
              <Select
                value={writingFocus}
                onValueChange={(value) => setWritingFocus(value)}
              >
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

            <div className="space-y-2">
              <Label htmlFor="genres">Preferred genres</Label>
              <Textarea
                id="genres"
                placeholder="e.g. Fantasy, Thriller, Literary Fiction"
                value={genresInput}
                onChange={(event) => setGenresInput(event.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple genres with commas to help tailor AI
                suggestions.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goals">Writing goals</Label>
                <Textarea
                  id="goals"
                  placeholder="Share your writing goals to guide AI feedback."
                  value={writingGoals}
                  onChange={(event) => setWritingGoals(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice">Voice & tone guidance</Label>
                <Textarea
                  id="voice"
                  placeholder="Describe the tone, style, or voices you want the AI to maintain."
                  value={voiceNotes}
                  onChange={(event) => setVoiceNotes(event.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="flex gap-2">
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="e.g. America/New_York"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseLocalTimezone}
                >
                  Use my timezone
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used for scheduling features and aligning usage reports.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
