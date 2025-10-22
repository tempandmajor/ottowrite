'use client';

/**
 * New Project Page with Template Wizard
 * TICKET-TMPL-007: Interactive template selection
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateWizard } from '@/components/templates/template-wizard';
import { useToast } from '@/hooks/use-toast';

interface RecentTemplate {
  id: string;
  type: string;
  name: string;
  lastUsed: string;
  projectsCount: number;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recentTemplates, setRecentTemplates] = useState<RecentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent templates on mount
  useEffect(() => {
    fetchRecentTemplates();
  }, []);

  const fetchRecentTemplates = async () => {
    try {
      const response = await fetch('/api/templates/recent?limit=4');
      if (response.ok) {
        const data = await response.json();
        setRecentTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch recent templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWizardComplete = async (wizardData: any) => {
    try {
      // Save wizard session
      const sessionResponse = await fetch('/api/templates/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...wizardData,
          completedStep: 5,
          isCompleted: true,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to save wizard session');
      }

      // Create project using template
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardData.projectName,
          template_type: wizardData.templateType,
          logline: wizardData.logline,
          genre: wizardData.genre,
        }),
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }

      const project = await projectResponse.json();

      // Apply template if specified
      if (wizardData.templateType) {
        await fetch(`/api/projects/${project.id}/apply-template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_type: wizardData.templateType,
          }),
        });
      }

      toast({
        title: 'Success',
        description: 'Project created successfully!',
      });
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <TemplateWizard onComplete={handleWizardComplete} recentTemplates={recentTemplates} />
    </div>
  );
}
