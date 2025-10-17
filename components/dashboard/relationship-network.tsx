'use client'

import { useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { RelationshipWithCharacters } from '@/types/relationships'

export function RelationshipNetwork({
  relationships,
  characters,
}: {
  relationships: RelationshipWithCharacters[]
  characters: { id: string; name: string; role: string }[]
}) {
  const nodes = useMemo(
    () =>
      characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.role,
      })),
    [characters]
  )

  const links = useMemo(
    () =>
      relationships.map((rel) => ({
        source: rel.character_a_id,
        target: rel.character_b_id,
        strength: rel.strength,
        type: rel.relationship_type,
        is_positive: rel.is_positive,
      })),
    [relationships]
  )

  useEffect(() => {
    const svg = d3.select('#relationship-network')
    svg.selectAll('*').remove()

    const width = 600
    const height = 600

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))

    const link = svg
      .append('g')
      .attr('stroke', '#CBD5F5')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d) => Math.max(2, d.strength / 2))

    const node = svg
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 18)
      .attr('fill', (d) => {
        switch (d.role) {
          case 'protagonist':
            return '#4F46E5'
          case 'antagonist':
            return '#DC2626'
          case 'supporting':
            return '#16A34A'
          default:
            return '#64748B'
        }
      })
      .call(
        d3
          .drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    const labels = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#0F172A')
      .attr('font-size', 10)
      .text((d) => d.name)

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as any).x)
        .attr('y1', (d) => (d.source as any).y)
        .attr('x2', (d) => (d.target as any).x)
        .attr('y2', (d) => (d.target as any).y)

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
      labels.attr('x', (d) => d.x!).attr('y', (d) => d.y! + 28)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, links])

  return <svg id="relationship-network" className="h-[420px] w-full" />
}
