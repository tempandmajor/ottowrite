'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Settings2 } from 'lucide-react'

export type DocumentMetadata = {
  povCharacter?: string
  pacingTarget?: 'slow' | 'balanced' | 'fast'
  tone?: string
  targetWordCount?: number | null
}

type DocumentMetadataFormProps = {
  metadata: DocumentMetadata
  onChange: (metadata: DocumentMetadata) => void
}

export function DocumentMetadataForm({ metadata, onChange }: DocumentMetadataFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localMetadata, setLocalMetadata] = useState<DocumentMetadata>(metadata)

  const handleSave = () => {
    onChange(localMetadata)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalMetadata(metadata)
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Document Settings
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Document Settings</SheetTitle>
          <SheetDescription>
            Configure point of view, pacing, and tone for this document.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* POV Character */}
          <div className="space-y-2">
            <Label htmlFor="pov-character">POV Character</Label>
            <Input
              id="pov-character"
              placeholder="e.g., Sarah, The Detective, First Person"
              value={localMetadata.povCharacter ?? ''}
              onChange={(e) =>
                setLocalMetadata({ ...localMetadata, povCharacter: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              The primary perspective character for this document
            </p>
          </div>

          {/* Pacing Target */}
          <div className="space-y-2">
            <Label htmlFor="pacing-target">Pacing Target</Label>
            <Select
              value={localMetadata.pacingTarget ?? 'balanced'}
              onValueChange={(value: 'slow' | 'balanced' | 'fast') =>
                setLocalMetadata({ ...localMetadata, pacingTarget: value })
              }
            >
              <SelectTrigger id="pacing-target">
                <SelectValue placeholder="Select pacing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow - Detailed, contemplative</SelectItem>
                <SelectItem value="balanced">Balanced - Mix of action and reflection</SelectItem>
                <SelectItem value="fast">Fast - Quick, action-driven</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The intended pacing style for this document
            </p>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Input
              id="tone"
              placeholder="e.g., dark, humorous, suspenseful, romantic"
              value={localMetadata.tone ?? ''}
              onChange={(e) => setLocalMetadata({ ...localMetadata, tone: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              The emotional atmosphere and style of this document
            </p>
          </div>

          {/* Target Word Count */}
          <div className="space-y-2">
            <Label htmlFor="target-word-count">Target Word Count</Label>
            <Input
              id="target-word-count"
              type="number"
              min={0}
              step={100}
              placeholder="e.g., 90000"
              value={localMetadata.targetWordCount ?? ''}
              onChange={(event) => {
                const value = event.target.value.trim()
                setLocalMetadata({
                  ...localMetadata,
                  targetWordCount: value === '' ? null : Math.max(0, Number(value)),
                })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Set a goal to track progress while you write (optional)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
