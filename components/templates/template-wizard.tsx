'use client';

/**
 * TICKET-TMPL-007: Template Wizard
 * Interactive 5-step wizard for template selection
 * Notion-style gallery with preview and AI quick-start
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, ArrowRight, ArrowLeft, Check, FileText, Clock, Star } from 'lucide-react';

interface WizardStep {
  id: number;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Choose Path', description: 'Browse templates or AI quick-start' },
  { id: 2, title: 'Select Template', description: 'Pick from our gallery' },
  { id: 3, title: 'Preview', description: 'See what you\'ll get' },
  { id: 4, title: 'Project Details', description: 'Add your info' },
  { id: 5, title: 'Create', description: 'Launch your project' },
];

interface TemplateWizardProps {
  onComplete: (data: WizardData) => void;
  recentTemplates?: RecentTemplate[];
}

interface WizardData {
  path: 'browse' | 'ai';
  templateType?: string;
  projectName: string;
  logline?: string;
  genre?: string;
  aiModel?: 'claude-sonnet-4.5' | 'gpt-5' | 'deepseek-chat';
}

interface RecentTemplate {
  id: string;
  type: string;
  name: string;
  lastUsed: string;
  projectsCount: number;
}

export function TemplateWizard({ onComplete, recentTemplates = [] }: TemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({
    aiModel: 'claude-sonnet-4.5',
  });
  const [isLoading, setIsLoading] = useState(false);

  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(wizardData as WizardData);
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (updates: Partial<WizardData>) => {
    setWizardData({ ...wizardData, ...updates });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Template Wizard</h2>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1].title}
            </p>
          </div>
          <Badge variant="outline">
            {Math.round(progress)}% Complete
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step Indicators */}
        <div className="flex gap-2">
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex-1 p-2 rounded text-xs text-center transition-colors ${
                step.id === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step.id < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.id < currentStep ? <Check className="w-4 h-4 mx-auto" /> : step.title}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6 min-h-[400px]">
          {currentStep === 1 && <Step1ChoosePath data={wizardData} updateData={updateData} />}
          {currentStep === 2 && (
            <Step2SelectTemplate
              data={wizardData}
              updateData={updateData}
              recentTemplates={recentTemplates}
            />
          )}
          {currentStep === 3 && <Step3Preview data={wizardData} />}
          {currentStep === 4 && <Step4ProjectDetails data={wizardData} updateData={updateData} />}
          {currentStep === 5 && <Step5Create data={wizardData} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < WIZARD_STEPS.length ? (
          <Button
            onClick={handleNext}
            disabled={!canProceedToNextStep(currentStep, wizardData) || isLoading}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={isLoading || !wizardData.projectName}>
            {isLoading ? 'Creating...' : 'Create Project'}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Step 1: Choose Path (Browse vs AI)
function Step1ChoosePath({
  data,
  updateData,
}: {
  data: Partial<WizardData>;
  updateData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">How would you like to start?</h3>
        <p className="text-muted-foreground">Choose your preferred method</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Browse Templates */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            data.path === 'browse' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => updateData({ path: 'browse' })}
        >
          <CardHeader>
            <FileText className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Browse Templates</CardTitle>
            <CardDescription>
              Choose from our curated collection of professional templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                30+ professional templates
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Industry-standard formats
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Preview before choosing
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* AI Quick-Start */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            data.path === 'ai' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => updateData({ path: 'ai' })}
        >
          <CardHeader>
            <Sparkles className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>AI Quick-Start</CardTitle>
            <CardDescription>
              Let AI recommend the perfect template based on your idea
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                AI-powered recommendations
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                95% match accuracy
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Genre & tone detection
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 2: Select Template (Gallery or AI input)
function Step2SelectTemplate({
  data,
  updateData,
  recentTemplates,
}: {
  data: Partial<WizardData>;
  updateData: (updates: Partial<WizardData>) => void;
  recentTemplates: RecentTemplate[];
}) {
  if (data.path === 'ai') {
    return <AIQuickStart data={data} updateData={updateData} />;
  }

  return <TemplateGallery data={data} updateData={updateData} recentTemplates={recentTemplates} />;
}

// AI Quick-Start Input
function AIQuickStart({
  data,
  updateData,
}: {
  data: Partial<WizardData>;
  updateData: (updates: Partial<WizardData>) => void;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!data.logline) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/recommend-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logline: data.logline,
          model: data.aiModel,
        }),
      });

      const result = await response.json();
      setRecommendation(result);
      updateData({ templateType: result.primary?.template_type });
    } catch (error) {
      console.error('Failed to get AI recommendation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Sparkles className="w-12 h-12 mx-auto text-primary" />
        <h3 className="text-xl font-semibold">Tell us about your story</h3>
        <p className="text-muted-foreground">
          Our AI will recommend the perfect template
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="logline">Logline or Story Idea</Label>
          <Textarea
            id="logline"
            placeholder="A detective discovers their investigation is being manipulated by an AI that can predict crimes before they happen..."
            value={data.logline || ''}
            onChange={(e) => updateData({ logline: e.target.value })}
            rows={4}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Describe your story in 1-3 sentences
          </p>
        </div>

        <div>
          <Label htmlFor="aiModel">AI Model</Label>
          <Select
            value={data.aiModel}
            onValueChange={(value: any) => updateData({ aiModel: value })}
          >
            <SelectTrigger id="aiModel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-sonnet-4.5">
                Claude Sonnet 4.5 (Best Quality)
              </SelectItem>
              <SelectItem value="gpt-5">GPT-5 (Balanced)</SelectItem>
              <SelectItem value="deepseek-chat">DeepSeek (Fastest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={!data.logline || isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>Analyzing...</>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Recommendation
            </>
          )}
        </Button>

        {recommendation && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Recommended: {recommendation.primary?.template_name}
              </CardTitle>
              <CardDescription>
                {recommendation.primary?.match_percentage}% match confidence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{recommendation.primary?.reasoning}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">{recommendation.detectedGenre}</Badge>
                <Badge variant="secondary">{recommendation.detectedTone}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Template Gallery (Notion-style)
function TemplateGallery({
  data,
  updateData,
  recentTemplates,
}: {
  data: Partial<WizardData>;
  updateData: (updates: Partial<WizardData>) => void;
  recentTemplates: RecentTemplate[];
}) {
  const templates = [
    {
      type: 'feature_film',
      name: 'Feature Film',
      description: '90-120 page screenplay',
      pageCount: '90-120 pages',
      icon: '🎬',
      popular: true,
    },
    {
      type: 'tv_pilot',
      name: 'TV Pilot (1-Hour)',
      description: 'Drama series pilot',
      pageCount: '45-60 pages',
      icon: '📺',
      popular: true,
    },
    {
      type: 'tv_pilot_half',
      name: 'TV Pilot (30-min)',
      description: 'Comedy series pilot',
      pageCount: '25-35 pages',
      icon: '😄',
    },
    {
      type: 'short_film',
      name: 'Short Film',
      description: 'Festival-ready short',
      pageCount: '5-40 pages',
      icon: '🎞️',
    },
    {
      type: 'stage_play',
      name: 'Stage Play',
      description: 'Theatrical production',
      pageCount: '60-120 pages',
      icon: '🎭',
    },
    {
      type: 'podcast',
      name: 'Podcast Script',
      description: 'Audio storytelling',
      pageCount: '10-30 pages',
      icon: '🎙️',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Choose Your Template</h3>
        <p className="text-muted-foreground">Select the format that fits your story</p>
      </div>

      {/* Recent Templates */}
      {recentTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Recently Used
          </div>
          <div className="grid grid-cols-2 gap-2">
            {recentTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => updateData({ templateType: template.type })}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Used {template.projectsCount}x
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Recent
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Template Gallery */}
      <div className="grid md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.type}
            className={`cursor-pointer transition-all hover:shadow-lg relative ${
              data.templateType === template.type ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => updateData({ templateType: template.type })}
          >
            {template.popular && (
              <Badge className="absolute top-2 right-2" variant="default">
                Popular
              </Badge>
            )}
            <CardHeader>
              <div className="text-4xl mb-2">{template.icon}</div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs">{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{template.pageCount}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Step 3: Preview Template
function Step3Preview({ data }: { data: Partial<WizardData> }) {
  const templateDetails = getTemplatePreview(data.templateType || '');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Template Preview</h3>
        <p className="text-muted-foreground">
          Here&apos;s what your project will include
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {templateDetails.icon} {templateDetails.name}
          </CardTitle>
          <CardDescription>{templateDetails.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Structure</h4>
            <ul className="space-y-1 text-sm">
              {templateDetails.structure.map((item: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Included Features</h4>
            <div className="flex flex-wrap gap-2">
              {templateDetails.features.map((feature: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Estimated completion time:</strong> {templateDetails.estimatedTime}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Step 4: Project Details
function Step4ProjectDetails({
  data,
  updateData,
}: {
  data: Partial<WizardData>;
  updateData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Project Details</h3>
        <p className="text-muted-foreground">Add information about your project</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            placeholder="My Awesome Screenplay"
            value={data.projectName || ''}
            onChange={(e) => updateData({ projectName: e.target.value })}
            className="mt-2"
          />
        </div>

        {!data.logline && (
          <div>
            <Label htmlFor="loglineDetail">Logline (Optional)</Label>
            <Textarea
              id="loglineDetail"
              placeholder="A brief description of your story..."
              value={data.logline || ''}
              onChange={(e) => updateData({ logline: e.target.value })}
              rows={3}
              className="mt-2"
            />
          </div>
        )}

        <div>
          <Label htmlFor="genre">Genre (Optional)</Label>
          <Select value={data.genre} onValueChange={(value) => updateData({ genre: value })}>
            <SelectTrigger id="genre" className="mt-2">
              <SelectValue placeholder="Select a genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="action">Action</SelectItem>
              <SelectItem value="comedy">Comedy</SelectItem>
              <SelectItem value="drama">Drama</SelectItem>
              <SelectItem value="horror">Horror</SelectItem>
              <SelectItem value="thriller">Thriller</SelectItem>
              <SelectItem value="scifi">Sci-Fi</SelectItem>
              <SelectItem value="fantasy">Fantasy</SelectItem>
              <SelectItem value="romance">Romance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Step 5: Create (Final confirmation)
function Step5Create({ data }: { data: Partial<WizardData> }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Check className="w-16 h-16 mx-auto text-green-500" />
        <h3 className="text-xl font-semibold">Ready to Create!</h3>
        <p className="text-muted-foreground">Review your selections</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Project Name</p>
              <p className="font-medium">{data.projectName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Template</p>
              <p className="font-medium">
                {getTemplatePreview(data.templateType || '').name}
              </p>
            </div>
            {data.genre && (
              <div>
                <p className="text-sm text-muted-foreground">Genre</p>
                <p className="font-medium capitalize">{data.genre}</p>
              </div>
            )}
            {data.logline && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Logline</p>
                <p className="text-sm">{data.logline}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <p className="text-sm">
          Click <strong>Create Project</strong> below to start writing!
        </p>
      </div>
    </div>
  );
}

// Helper Functions
function canProceedToNextStep(step: number, data: Partial<WizardData>): boolean {
  switch (step) {
    case 1:
      return !!data.path;
    case 2:
      return !!data.templateType;
    case 3:
      return true; // Preview is always available
    case 4:
      return !!data.projectName && data.projectName.trim().length > 0;
    case 5:
      return true;
    default:
      return false;
  }
}

function getTemplatePreview(templateType: string) {
  const templates: Record<string, any> = {
    feature_film: {
      icon: '🎬',
      name: 'Feature Film',
      description: 'Professional 3-act screenplay structure (90-120 pages)',
      structure: [
        'Title Page',
        'Act I: Setup (Pages 1-30)',
        'Act II: Confrontation (Pages 30-90)',
        'Act III: Resolution (Pages 90-120)',
      ],
      features: ['Scene Numbering', 'Character List', 'Location Tracking', 'Beat Sheet Support'],
      estimatedTime: '3-12 months',
    },
    tv_pilot: {
      icon: '📺',
      name: 'TV Pilot (1-Hour)',
      description: 'Drama series pilot with teaser and 4-5 acts (45-60 pages)',
      structure: ['Teaser', 'Act I', 'Act II', 'Act III', 'Act IV', 'Tag (optional)'],
      features: ['Act Breaks', 'Series Bible', 'Character Arcs', 'Season Outline'],
      estimatedTime: '2-6 months',
    },
    short_film: {
      icon: '🎞️',
      name: 'Short Film',
      description: 'Festival-ready short screenplay (5-40 pages)',
      structure: ['Title Page', 'Setup', 'Conflict', 'Resolution'],
      features: ['Tight Structure', 'Quick Setup', 'Single Location Support'],
      estimatedTime: '1-3 months',
    },
  };

  return (
    templates[templateType] || {
      icon: '📝',
      name: 'Custom Template',
      description: 'Flexible template structure',
      structure: ['Title Page', 'Content Pages'],
      features: ['Basic Formatting'],
      estimatedTime: 'Varies',
    }
  );
}
