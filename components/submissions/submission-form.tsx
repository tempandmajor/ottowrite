'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  FileText,
  User,
  Send,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ManuscriptType } from '@/lib/submissions/types'
import { validateSubmissionData } from '@/lib/submissions/helpers'

const MANUSCRIPT_TYPES: { value: ManuscriptType; label: string }[] = [
  { value: 'novel', label: 'Novel' },
  { value: 'novella', label: 'Novella' },
  { value: 'short_story', label: 'Short Story' },
  { value: 'screenplay', label: 'Screenplay' },
  { value: 'memoir', label: 'Memoir' },
  { value: 'non_fiction', label: 'Non-Fiction' },
]

const COMMON_GENRES = [
  'Literary Fiction',
  'Commercial Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Romance',
  'Historical Fiction',
  'Horror',
  'Young Adult',
  'Middle Grade',
  'Memoir',
  'Biography',
  'Self-Help',
  'Business',
  'Other',
]

interface SubmissionFormProps {
  projectId?: string
  onSuccess?: (submissionId: string) => void
}

type Step = 'manuscript' | 'query' | 'synopsis' | 'bio' | 'review'

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'manuscript', label: 'Manuscript Details', icon: BookOpen },
  { id: 'query', label: 'Query Letter', icon: FileText },
  { id: 'synopsis', label: 'Synopsis', icon: FileText },
  { id: 'bio', label: 'Author Bio', icon: User },
  { id: 'review', label: 'Review & Submit', icon: Send },
]

export function SubmissionForm({ projectId, onSuccess }: SubmissionFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('manuscript')
  const [loading, setLoading] = useState(false)
  const [generatingQuery, setGeneratingQuery] = useState(false)
  const [generatingSynopsis, setGeneratingSynopsis] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    word_count: '',
    type: '' as ManuscriptType | '',
    query_letter: '',
    synopsis: '',
    author_bio: '',
    sample_pages_content: '',
    sample_pages_count: '',
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {}

    if (currentStep === 'manuscript') {
      if (!formData.title.trim()) errors.title = 'Title is required'
      if (!formData.genre.trim()) errors.genre = 'Genre is required'
      if (!formData.type) errors.type = 'Manuscript type is required'

      const wordCount = parseInt(formData.word_count)
      if (!formData.word_count || isNaN(wordCount) || wordCount <= 0) {
        errors.word_count = 'Valid word count is required'
      }
    }

    if (currentStep === 'query') {
      if (!formData.query_letter.trim()) {
        errors.query_letter = 'Query letter is required'
      } else if (formData.query_letter.trim().length < 100) {
        errors.query_letter = 'Query letter must be at least 100 characters'
      }
    }

    if (currentStep === 'synopsis') {
      if (!formData.synopsis.trim()) {
        errors.synopsis = 'Synopsis is required'
      } else if (formData.synopsis.trim().length < 200) {
        errors.synopsis = 'Synopsis must be at least 200 characters'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }

  const handleGenerateQueryLetter = async () => {
    // Validate manuscript details first
    if (!formData.title || !formData.genre || !formData.word_count || !formData.type) {
      setError('Please complete the manuscript details before generating a query letter')
      return
    }

    // Must have synopsis to generate query letter
    if (!formData.synopsis || formData.synopsis.length < 200) {
      setError('Please write your synopsis first (minimum 200 characters) to generate a query letter')
      return
    }

    setGeneratingQuery(true)
    setError(null)

    try {
      const response = await fetch('/api/submissions/generate-query-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          genre: formData.genre,
          wordCount: formData.word_count,
          manuscriptType: formData.type,
          synopsis: formData.synopsis,
          model: 'claude-sonnet-4.5', // Use Claude for best creative writing
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate query letter')
      }

      // Update form with generated query letter
      updateFormData('query_letter', data.queryLetter)

      // Show success message (optional)
      // You could add a toast notification here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate query letter')
    } finally {
      setGeneratingQuery(false)
    }
  }

  const handleGenerateSynopsis = async () => {
    // Validate manuscript details first
    if (!formData.title || !formData.genre || !formData.word_count || !formData.type) {
      setError('Please complete the manuscript details before generating a synopsis')
      return
    }

    // Need some story description to generate synopsis
    // For now, we'll use existing synopsis as seed if it exists, or show error
    if (!formData.synopsis || formData.synopsis.length < 100) {
      setError('Please provide a brief story description (minimum 100 characters) to generate a full synopsis')
      return
    }

    setGeneratingSynopsis(true)
    setError(null)

    try {
      const response = await fetch('/api/submissions/generate-synopsis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          genre: formData.genre,
          wordCount: formData.word_count,
          manuscriptType: formData.type,
          storyDescription: formData.synopsis, // Use current synopsis as story description
          targetLength: 'medium', // 1000-1500 words (2 pages)
          includeSubplots: true,
          model: 'claude-sonnet-4.5', // Use Claude for best creative writing
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate synopsis')
      }

      // Update form with generated synopsis
      updateFormData('synopsis', data.synopsis)

      // Show success message (optional)
      // You could add a toast notification here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate synopsis')
    } finally {
      setGeneratingSynopsis(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      // Final validation
      const validation = validateSubmissionData({
        title: formData.title,
        genre: formData.genre,
        word_count: parseInt(formData.word_count),
        query_letter: formData.query_letter,
        synopsis: formData.synopsis,
      })

      if (!validation.valid) {
        setValidationErrors(validation.errors)
        setError('Please fix the validation errors')
        setCurrentStep('manuscript')
        return
      }

      // Save as draft first
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          word_count: parseInt(formData.word_count),
          sample_pages_count: formData.sample_pages_count
            ? parseInt(formData.sample_pages_count)
            : 0,
          project_id: projectId,
          status: 'draft', // Save as draft, will be submitted after partner selection
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to save submission')
      }

      const { submission } = await response.json()

      // Navigate to partner selection
      if (onSuccess) {
        onSuccess(submission.id)
      } else {
        router.push(`/dashboard/submissions/${submission.id}/select-partners`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'manuscript':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Manuscript Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => updateFormData('title', e.target.value)}
                placeholder="Enter your manuscript title"
                className={cn(validationErrors.title && 'border-red-500')}
              />
              {validationErrors.title && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Manuscript Type *</Label>
              <Select
                value={formData.type}
                onValueChange={value => updateFormData('type', value)}
              >
                <SelectTrigger className={cn(validationErrors.type && 'border-red-500')}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MANUSCRIPT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.type && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.type}</p>
              )}
            </div>

            <div>
              <Label htmlFor="genre">Genre *</Label>
              <Select
                value={formData.genre}
                onValueChange={value => updateFormData('genre', value)}
              >
                <SelectTrigger className={cn(validationErrors.genre && 'border-red-500')}>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_GENRES.map(genre => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.genre && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.genre}</p>
              )}
            </div>

            <div>
              <Label htmlFor="word_count">Word Count *</Label>
              <Input
                id="word_count"
                type="number"
                value={formData.word_count}
                onChange={e => updateFormData('word_count', e.target.value)}
                placeholder="e.g., 95000"
                className={cn(validationErrors.word_count && 'border-red-500')}
              />
              {validationErrors.word_count && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.word_count}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Total word count of your completed manuscript
              </p>
            </div>

            <div>
              <Label htmlFor="sample_pages_count">Sample Pages (Optional)</Label>
              <Input
                id="sample_pages_count"
                type="number"
                value={formData.sample_pages_count}
                onChange={e => updateFormData('sample_pages_count', e.target.value)}
                placeholder="e.g., 10"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Number of sample pages to include (typically 10-50)
              </p>
            </div>
          </div>
        )

      case 'query':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="query_letter">Query Letter *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateQueryLetter}
                disabled={generatingQuery || !formData.synopsis}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingQuery ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>
            <Textarea
              id="query_letter"
              value={formData.query_letter}
              onChange={e => updateFormData('query_letter', e.target.value)}
              placeholder="Write your query letter here. A query letter should introduce your manuscript, highlight key plot points, and showcase your writing style. Typically 250-400 words."
              rows={15}
              className={cn(validationErrors.query_letter && 'border-red-500')}
            />
            {validationErrors.query_letter && (
              <p className="text-sm text-red-500">{validationErrors.query_letter}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {formData.query_letter.length} characters (minimum 100 required)
            </p>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> A strong query letter includes a hook, brief synopsis,
                word count, genre, and why you&apos;re querying this specific agent.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'synopsis':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="synopsis">Synopsis *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateSynopsis}
                disabled={generatingSynopsis || !formData.synopsis}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingSynopsis ? 'Generating...' : 'Expand with AI'}
              </Button>
            </div>
            <Textarea
              id="synopsis"
              value={formData.synopsis}
              onChange={e => updateFormData('synopsis', e.target.value)}
              placeholder="Write a 1-2 page synopsis of your manuscript. Include major plot points, character arcs, and the ending. Be clear and concise."
              rows={20}
              className={cn(validationErrors.synopsis && 'border-red-500')}
            />
            {validationErrors.synopsis && (
              <p className="text-sm text-red-500">{validationErrors.synopsis}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {formData.synopsis.length} characters (minimum 200 required)
            </p>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> A good synopsis reveals the entire story including the
                ending. Write in present tense and focus on the main plot.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'bio':
        return (
          <div className="space-y-4">
            <Label htmlFor="author_bio">Author Bio (Optional)</Label>
            <Textarea
              id="author_bio"
              value={formData.author_bio}
              onChange={e => updateFormData('author_bio', e.target.value)}
              placeholder="Write a brief author bio. Include relevant writing experience, publications, awards, or credentials. Keep it professional and concise (100-200 words)."
              rows={10}
            />
            <p className="text-sm text-muted-foreground">
              {formData.author_bio.length} characters
            </p>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Include relevant credentials, publications, or platform.
                If you&apos;re a debut author, mention relevant experience or education.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Review your submission package before saving. You&apos;ll be able to select partners
                to submit to in the next step.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Manuscript Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {MANUSCRIPT_TYPES.find(t => t.value === formData.type)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Genre:</span>
                    <span className="font-medium">{formData.genre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Word Count:</span>
                    <span className="font-medium">
                      {parseInt(formData.word_count).toLocaleString()} words
                    </span>
                  </div>
                  {formData.sample_pages_count && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sample Pages:</span>
                      <span className="font-medium">{formData.sample_pages_count} pages</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Query Letter</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {formData.query_letter.substring(0, 200)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formData.query_letter.length} characters
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Synopsis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {formData.synopsis.substring(0, 200)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formData.synopsis.length} characters
                  </p>
                </CardContent>
              </Card>

              {formData.author_bio && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Author Bio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {formData.author_bio}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Create Submission Package</h2>
          <Badge variant="outline">Step {currentStepIndex + 1} of {STEPS.length}</Badge>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step Labels */}
        <div className="flex justify-between mt-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isComplete = index < currentStepIndex

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-2 flex-1',
                  isActive && 'text-primary',
                  !isActive && !isComplete && 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'rounded-full p-2 border-2',
                    isActive && 'border-primary bg-primary/10',
                    isComplete && 'border-primary bg-primary text-primary-foreground',
                    !isActive && !isComplete && 'border-muted'
                  )}
                >
                  {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="text-xs text-center hidden sm:block">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStepIndex].label}</CardTitle>
          <CardDescription>
            {currentStep === 'manuscript' &&
              'Provide basic information about your manuscript'}
            {currentStep === 'query' &&
              'Write a compelling query letter to introduce your work'}
            {currentStep === 'synopsis' &&
              'Summarize your entire story including the ending'}
            {currentStep === 'bio' &&
              'Tell agents about yourself and your writing background'}
            {currentStep === 'review' &&
              'Review your submission package before saving'}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0 || loading}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep !== 'review' ? (
          <Button onClick={handleNext} disabled={loading}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save & Select Partners'}
            <Send className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
