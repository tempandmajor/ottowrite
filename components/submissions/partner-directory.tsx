'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { VerificationBadge } from '@/components/submissions/verification-badge'
import {
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronRight,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubmissionPartner } from '@/lib/submissions/types'

const COMMON_GENRES = [
  'All Genres',
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
]

interface PartnerDirectoryProps {
  _submissionId?: string // Prefixed with _ to indicate intentionally unused
  manuscriptGenre?: string
  onSelectPartner: (partner: SubmissionPartner) => void
  selectedPartners?: string[] // Array of partner IDs
}

export function PartnerDirectory({
  _submissionId,
  manuscriptGenre,
  onSelectPartner,
  selectedPartners = [],
}: PartnerDirectoryProps) {
  const [partners, setPartners] = useState<SubmissionPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState(manuscriptGenre || 'All Genres')
  const [typeFilter, setTypeFilter] = useState<'all' | 'agent' | 'publisher' | 'manager'>('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [acceptingOnly, setAcceptingOnly] = useState(true) // Default to only accepting
  const [aarOnly, setAarOnly] = useState(false)

  // Pagination
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchPartners = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (genreFilter && genreFilter !== 'All Genres') {
        params.append('genre', genreFilter)
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      if (verifiedOnly) {
        params.append('verified', 'true')
      }

      if (acceptingOnly) {
        params.append('accepting', 'true')
      }

      if (aarOnly) {
        params.append('aar', 'true')
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      params.append('limit', '50')
      params.append('offset', '0')

      const response = await fetch(`/api/submissions/partners?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load partners')
      }

      setPartners(data.partners)
      setTotal(data.pagination.total)
      setHasMore(data.pagination.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPartners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreFilter, typeFilter, verifiedOnly, acceptingOnly, aarOnly])

  const handleSearch = () => {
    fetchPartners()
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const isPartnerSelected = (partnerId: string) => {
    return selectedPartners.includes(partnerId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Partners</h2>
        <p className="text-muted-foreground">
          Choose literary agents or publishers to submit your manuscript to. You can select multiple
          partners.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-4 w-4 mr-2" />
            Filter Partners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search by name or company</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Genre Filter */}
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger id="genre">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="type">Partner Type</Label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="agent">Literary Agents</SelectItem>
                  <SelectItem value="publisher">Publishers</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={verifiedOnly}
                onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
              />
              <Label
                htmlFor="verified"
                className="text-sm font-normal cursor-pointer flex items-center"
              >
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Verified only
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="accepting"
                checked={acceptingOnly}
                onCheckedChange={(checked) => setAcceptingOnly(checked === true)}
              />
              <Label
                htmlFor="accepting"
                className="text-sm font-normal cursor-pointer flex items-center"
              >
                Currently accepting submissions
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="aar"
                checked={aarOnly}
                onCheckedChange={(checked) => setAarOnly(checked === true)}
              />
              <Label htmlFor="aar" className="text-sm font-normal cursor-pointer flex items-center">
                AAR members only
              </Label>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${total} partner${total !== 1 ? 's' : ''} found`}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8 text-muted-foreground">Loading partners...</div>
        )}

        {!loading && partners.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No partners found matching your filters. Try adjusting your search criteria.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading &&
          partners.map((partner) => (
            <Card
              key={partner.id}
              className={cn(
                'transition-all cursor-pointer hover:shadow-md',
                isPartnerSelected(partner.id) && 'ring-2 ring-primary'
              )}
              onClick={() => onSelectPartner(partner)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/dashboard/submissions/partners/${partner.id}${_submissionId ? `?submission=${_submissionId}` : ''}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CardTitle className="text-lg">{partner.name}</CardTitle>
                      </Link>
                      <VerificationBadge
                        status={partner.verification_status || 'unverified'}
                        level={partner.verification_level}
                        size="sm"
                      />
                      {partner.aar_member && (
                        <Badge variant="outline" className="text-xs">
                          AAR
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        {partner.company}
                      </span>
                      <span className="capitalize">{partner.type}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/submissions/partners/${partner.id}${_submissionId ? `?submission=${_submissionId}` : ''}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant={isPartnerSelected(partner.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectPartner(partner)
                      }}
                    >
                      {isPartnerSelected(partner.id) ? 'Selected' : 'Select'}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Bio */}
                {partner.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{partner.bio}</p>
                )}

                {/* Genres */}
                {partner.genres && partner.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {partner.genres.slice(0, 5).map((genre) => (
                      <Badge key={genre} variant="secondary" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                    {partner.genres.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{partner.genres.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                  {partner.acceptance_rate !== null && partner.acceptance_rate !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{partner.acceptance_rate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Accept Rate</div>
                      </div>
                    </div>
                  )}

                  {partner.total_submissions > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{partner.total_submissions}</div>
                        <div className="text-xs text-muted-foreground">Submissions</div>
                      </div>
                    </div>
                  )}

                  {partner.response_time_days && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{partner.response_time_days} days</div>
                        <div className="text-xs text-muted-foreground">Avg Response</div>
                      </div>
                    </div>
                  )}

                  {!partner.accepting_submissions && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <div>
                        <div className="font-medium text-xs">Not Accepting</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={fetchPartners}>
            Load More Partners
          </Button>
        </div>
      )}
    </div>
  )
}
