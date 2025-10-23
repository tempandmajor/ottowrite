/**
 * DMCA Takedown Request Form Component
 *
 * Multi-step form for submitting DMCA takedown requests:
 * 1. Work Information
 * 2. Infringement Details
 * 3. Contact Information
 * 4. Legal Declarations
 * 5. Review & Submit
 *
 * Ticket: MS-5.3
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  User,
  Scale,
  CheckCircle2,
} from 'lucide-react'

interface DMCAFormData {
  // Work information
  submissionId?: string
  workTitle: string
  workDescription: string
  copyrightRegistration: string

  // Infringement details
  infringingUrl: string
  infringingPlatform: string
  infringementDescription: string
  evidenceUrls: string[]

  // Contact information
  complainantName: string
  complainantEmail: string
  complainantPhone: string
  complainantAddress: string

  // Legal declarations
  goodFaithStatement: boolean
  accuracyStatement: boolean
  penaltyOfPerjury: boolean
  electronicSignature: string
}

const INITIAL_FORM_DATA: DMCAFormData = {
  workTitle: '',
  workDescription: '',
  copyrightRegistration: '',
  infringingUrl: '',
  infringingPlatform: '',
  infringementDescription: '',
  evidenceUrls: [''],
  complainantName: '',
  complainantEmail: '',
  complainantPhone: '',
  complainantAddress: '',
  goodFaithStatement: false,
  accuracyStatement: false,
  penaltyOfPerjury: false,
  electronicSignature: '',
}

const STEPS = [
  { title: 'Work Information', icon: FileText },
  { title: 'Infringement Details', icon: AlertTriangle },
  { title: 'Contact Information', icon: User },
  { title: 'Legal Declarations', icon: Scale },
  { title: 'Review & Submit', icon: CheckCircle2 },
]

export function DMCARequestForm({ submissionId }: { submissionId?: string }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<DMCAFormData>({
    ...INITIAL_FORM_DATA,
    submissionId,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [saveAsDraft, setSaveAsDraft] = useState(false)

  const updateFormData = (updates: Partial<DMCAFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates)
    setErrors((prev) => {
      const newErrors = { ...prev }
      updatedFields.forEach((field) => delete newErrors[field])
      return newErrors
    })
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 0: // Work Information
        if (!formData.workTitle.trim()) newErrors.workTitle = 'Work title is required'
        if (!formData.workDescription.trim())
          newErrors.workDescription = 'Work description is required'
        break

      case 1: // Infringement Details
        if (!formData.infringingUrl.trim()) newErrors.infringingUrl = 'Infringing URL is required'
        if (!formData.infringingPlatform)
          newErrors.infringingPlatform = 'Platform type is required'
        if (!formData.infringementDescription.trim())
          newErrors.infringementDescription = 'Infringement description is required'
        break

      case 2: // Contact Information
        if (!formData.complainantName.trim())
          newErrors.complainantName = 'Full name is required'
        if (!formData.complainantEmail.trim())
          newErrors.complainantEmail = 'Email is required'
        if (!formData.complainantAddress.trim())
          newErrors.complainantAddress = 'Address is required'
        break

      case 3: // Legal Declarations
        if (!formData.goodFaithStatement)
          newErrors.goodFaithStatement = 'This declaration is required'
        if (!formData.accuracyStatement)
          newErrors.accuracyStatement = 'This declaration is required'
        if (!formData.penaltyOfPerjury)
          newErrors.penaltyOfPerjury = 'This declaration is required'
        if (!formData.electronicSignature.trim())
          newErrors.electronicSignature = 'Electronic signature is required'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateStep(currentStep)) return

    try {
      setSubmitting(true)
      setSaveAsDraft(isDraft)

      const response = await fetch('/api/ip-protection/dmca/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: isDraft ? 'draft' : 'submitted',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to submit request')
      }

      const result = await response.json()

      // Redirect to the DMCA requests list
      router.push(`/dashboard/ip-protection/dmca${isDraft ? '?saved=true' : '?submitted=true'}`)
    } catch (error) {
      console.error('Failed to submit DMCA request:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to submit request',
      })
    } finally {
      setSubmitting(false)
      setSaveAsDraft(false)
    }
  }

  const addEvidenceUrl = () => {
    updateFormData({ evidenceUrls: [...formData.evidenceUrls, ''] })
  }

  const removeEvidenceUrl = (index: number) => {
    const newUrls = formData.evidenceUrls.filter((_, i) => i !== index)
    updateFormData({ evidenceUrls: newUrls.length > 0 ? newUrls : [''] })
  }

  const updateEvidenceUrl = (index: number, value: string) => {
    const newUrls = [...formData.evidenceUrls]
    newUrls[index] = value
    updateFormData({ evidenceUrls: newUrls })
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isComplete = index < currentStep

            return (
              <div key={step.title} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs text-center ${
                    isActive ? 'font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Provide information about your copyrighted work'}
            {currentStep === 1 && 'Describe the infringing material and where it was found'}
            {currentStep === 2 && 'Your contact information for this takedown request'}
            {currentStep === 3 && 'Legal declarations required for DMCA takedown'}
            {currentStep === 4 && 'Review your information before submitting'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Step 0: Work Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="workTitle">Work Title *</Label>
                <Input
                  id="workTitle"
                  placeholder="e.g., The Shadow Chronicles"
                  value={formData.workTitle}
                  onChange={(e) => updateFormData({ workTitle: e.target.value })}
                  className={errors.workTitle ? 'border-red-500' : ''}
                />
                {errors.workTitle && (
                  <p className="text-sm text-red-500 mt-1">{errors.workTitle}</p>
                )}
              </div>

              <div>
                <Label htmlFor="workDescription">Work Description *</Label>
                <Textarea
                  id="workDescription"
                  placeholder="Describe your work (genre, synopsis, key details that establish copyright)"
                  rows={4}
                  value={formData.workDescription}
                  onChange={(e) => updateFormData({ workDescription: e.target.value })}
                  className={errors.workDescription ? 'border-red-500' : ''}
                />
                {errors.workDescription && (
                  <p className="text-sm text-red-500 mt-1">{errors.workDescription}</p>
                )}
              </div>

              <div>
                <Label htmlFor="copyrightRegistration">
                  Copyright Registration Number (Optional)
                </Label>
                <Input
                  id="copyrightRegistration"
                  placeholder="e.g., TXu 2-xxx-xxx"
                  value={formData.copyrightRegistration}
                  onChange={(e) => updateFormData({ copyrightRegistration: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  US Copyright Office registration number, if available
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Infringement Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="infringingUrl">Infringing URL *</Label>
                <Input
                  id="infringingUrl"
                  type="url"
                  placeholder="https://example.com/infringing-content"
                  value={formData.infringingUrl}
                  onChange={(e) => updateFormData({ infringingUrl: e.target.value })}
                  className={errors.infringingUrl ? 'border-red-500' : ''}
                />
                {errors.infringingUrl && (
                  <p className="text-sm text-red-500 mt-1">{errors.infringingUrl}</p>
                )}
              </div>

              <div>
                <Label htmlFor="infringingPlatform">Platform Type *</Label>
                <Select
                  value={formData.infringingPlatform}
                  onValueChange={(value) => updateFormData({ infringingPlatform: value })}
                >
                  <SelectTrigger
                    id="infringingPlatform"
                    className={errors.infringingPlatform ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select platform type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="file_sharing">File Sharing Service</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.infringingPlatform && (
                  <p className="text-sm text-red-500 mt-1">{errors.infringingPlatform}</p>
                )}
              </div>

              <div>
                <Label htmlFor="infringementDescription">Infringement Description *</Label>
                <Textarea
                  id="infringementDescription"
                  placeholder="Describe how the material infringes your copyright (e.g., unauthorized reproduction, distribution, public display)"
                  rows={4}
                  value={formData.infringementDescription}
                  onChange={(e) => updateFormData({ infringementDescription: e.target.value })}
                  className={errors.infringementDescription ? 'border-red-500' : ''}
                />
                {errors.infringementDescription && (
                  <p className="text-sm text-red-500 mt-1">{errors.infringementDescription}</p>
                )}
              </div>

              <div>
                <Label>Evidence URLs (Optional)</Label>
                {formData.evidenceUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      type="url"
                      placeholder="https://archive.org/... or screenshot URL"
                      value={url}
                      onChange={(e) => updateEvidenceUrl(index, e.target.value)}
                    />
                    {formData.evidenceUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEvidenceUrl(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEvidenceUrl}
                  className="mt-2"
                >
                  Add Another Evidence URL
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="complainantName">Full Legal Name *</Label>
                <Input
                  id="complainantName"
                  placeholder="John Doe"
                  value={formData.complainantName}
                  onChange={(e) => updateFormData({ complainantName: e.target.value })}
                  className={errors.complainantName ? 'border-red-500' : ''}
                />
                {errors.complainantName && (
                  <p className="text-sm text-red-500 mt-1">{errors.complainantName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="complainantEmail">Email Address *</Label>
                <Input
                  id="complainantEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.complainantEmail}
                  onChange={(e) => updateFormData({ complainantEmail: e.target.value })}
                  className={errors.complainantEmail ? 'border-red-500' : ''}
                />
                {errors.complainantEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.complainantEmail}</p>
                )}
              </div>

              <div>
                <Label htmlFor="complainantPhone">Phone Number (Optional)</Label>
                <Input
                  id="complainantPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.complainantPhone}
                  onChange={(e) => updateFormData({ complainantPhone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="complainantAddress">Mailing Address *</Label>
                <Textarea
                  id="complainantAddress"
                  placeholder="123 Main St, Suite 100&#10;City, State ZIP&#10;Country"
                  rows={3}
                  value={formData.complainantAddress}
                  onChange={(e) => updateFormData({ complainantAddress: e.target.value })}
                  className={errors.complainantAddress ? 'border-red-500' : ''}
                />
                {errors.complainantAddress && (
                  <p className="text-sm text-red-500 mt-1">{errors.complainantAddress}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Legal Declarations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The following statements are required by law for DMCA takedown requests. Making
                  false statements may result in legal consequences.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="goodFaith"
                    checked={formData.goodFaithStatement}
                    onCheckedChange={(checked) =>
                      updateFormData({ goodFaithStatement: checked as boolean })
                    }
                    className={errors.goodFaithStatement ? 'border-red-500' : ''}
                  />
                  <Label htmlFor="goodFaith" className="font-normal leading-relaxed">
                    I have a good faith belief that use of the copyrighted material described above
                    is not authorized by the copyright owner, its agent, or the law.
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="accuracy"
                    checked={formData.accuracyStatement}
                    onCheckedChange={(checked) =>
                      updateFormData({ accuracyStatement: checked as boolean })
                    }
                    className={errors.accuracyStatement ? 'border-red-500' : ''}
                  />
                  <Label htmlFor="accuracy" className="font-normal leading-relaxed">
                    The information in this notification is accurate.
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="perjury"
                    checked={formData.penaltyOfPerjury}
                    onCheckedChange={(checked) =>
                      updateFormData({ penaltyOfPerjury: checked as boolean })
                    }
                    className={errors.penaltyOfPerjury ? 'border-red-500' : ''}
                  />
                  <Label htmlFor="perjury" className="font-normal leading-relaxed">
                    I swear, under penalty of perjury, that I am the copyright owner or am
                    authorized to act on behalf of the owner of an exclusive right that is
                    allegedly infringed.
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="signature">Electronic Signature *</Label>
                <Input
                  id="signature"
                  placeholder="Type your full legal name"
                  value={formData.electronicSignature}
                  onChange={(e) => updateFormData({ electronicSignature: e.target.value })}
                  className={errors.electronicSignature ? 'border-red-500' : ''}
                />
                {errors.electronicSignature && (
                  <p className="text-sm text-red-500 mt-1">{errors.electronicSignature}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  By typing your name, you are providing a legally binding electronic signature
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Please review your information carefully before submitting. Once submitted, your
                  request will be processed and a formal DMCA notice will be generated.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Copyrighted Work</h4>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className="text-muted-foreground inline">Title:</dt>
                      <dd className="inline ml-2">{formData.workTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Description:</dt>
                      <dd className="inline ml-2">{formData.workDescription}</dd>
                    </div>
                    {formData.copyrightRegistration && (
                      <div>
                        <dt className="text-muted-foreground inline">Registration:</dt>
                        <dd className="inline ml-2">{formData.copyrightRegistration}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Infringing Material</h4>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className="text-muted-foreground inline">URL:</dt>
                      <dd className="inline ml-2 break-all">{formData.infringingUrl}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Platform:</dt>
                      <dd className="inline ml-2">{formData.infringingPlatform}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Description:</dt>
                      <dd className="inline ml-2">{formData.infringementDescription}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className="text-muted-foreground inline">Name:</dt>
                      <dd className="inline ml-2">{formData.complainantName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">Email:</dt>
                      <dd className="inline ml-2">{formData.complainantEmail}</dd>
                    </div>
                    {formData.complainantPhone && (
                      <div>
                        <dt className="text-muted-foreground inline">Phone:</dt>
                        <dd className="inline ml-2">{formData.complainantPhone}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Electronic Signature</h4>
                  <p className="text-sm">{formData.electronicSignature}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Signed on {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex gap-2">
              {currentStep < STEPS.length - 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                  >
                    {saveAsDraft ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button type="button" onClick={handleNext} disabled={submitting}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting && !saveAsDraft ? 'Submitting...' : 'Submit Request'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
