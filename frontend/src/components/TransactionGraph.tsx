import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import MonGuardClient from '@monguard/sdk';

interface Node {
  id: string;
  address: string;
  riskScore: number;
  balance: number;
  type: 'wallet' | 'contract';
}

interface Link {
  source: string;
  target: string;
  amount: number;
  timestamp: number;
  flagged: boolean;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface TransactionGraphProps {
  client: MonGuardClient | null;
}

const TransactionGraph: React.FC<TransactionGraphProps> = ({ client }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real transaction data from MonGuard API
  useEffect(() => {
    const fetchTransactionGraph = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        if (apiUrl) {
          // Fetch from MonGuard monitoring API
          const response = await fetch(`${apiUrl}/api/monitoring/transactions?limit=50`);
          const result = await response.json();
          
          // Transform API data into graph format
          const transactions = result.transactions || [];
          const nodesMap = new Map();
          const links: Link[] = [];

          transactions.forEach((tx: any) => {
            // Add sender node
            if (!nodesMap.has(tx.from)) {
              nodesMap.set(tx.from, {
                id: tx.from,
                address: tx.from.substring(0, 6) + '...' + tx.from.substring(38),
                riskScore: tx.riskScore || 0,
                balance: tx.amount || 0,
                type: 'wallet' as const,
              });
            }

            // Add receiver node
            if (!nodesMap.has(tx.to)) {
              nodesMap.set(tx.to, {
                id: tx.to,
                address: tx.to.substring(0, 6) + '...' + tx.to.substring(38),
                riskScore: tx.riskScore || 0,
                balance: tx.amount || 0,
                type: 'wallet' as const,
              });
            }

            // Add link
            links.push({
              source: tx.from,
              target: tx.to,
              amount: parseFloat(tx.amount) || 0,
              timestamp: new Date(tx.timestamp).getTime(),
              flagged: tx.flagged || false,
            });
          });

          setData({
            nodes: Array.from(nodesMap.values()),
            links,
          });
        } else {
          // Fallback to mock data if API not configured
          const mockData: GraphData = {
            nodes: [
              { id: '0x1', address: '0x1234...5678', riskScore: 25, balance: 100, type: 'wallet' },
              { id: '0x2', address: '0x2345...6789', riskScore: 75, balance: 50, type: 'wallet' },
              { id: '0x3', address: '0x3456...7890', riskScore: 45, balance: 200, type: 'contract' },
              { id: '0x4', address: '0x4567...8901', riskScore: 90, balance: 30, type: 'wallet' },
              { id: '0x5', address: '0x5678...9012', riskScore: 10, balance: 150, type: 'wallet' },
            ],
            links: [
              { source: '0x1', target: '0x2', amount: 10, timestamp: Date.now(), flagged: false },
              { source: '0x2', target: '0x3', amount: 25, timestamp: Date.now(), flagged: true },
              { source: '0x3', target: '0x4', amount: 15, timestamp: Date.now(), flagged: true },
              { source: '0x4', target: '0x5', amount: 8, timestamp: Date.now(), flagged: false },
              { source: '0x1', target: '0x5', amount: 20, timestamp: Date.now(), flagged: false },
            ],
          };
          setData(mockData);
        }
      } catch (error) {
        console.error('Error fetching transaction graph:', error);
        // Use mock data on error
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionGraph();
    
    // Set up polling for real-time updates (every 10 seconds)
    const interval = setInterval(fetchTransactionGraph, 10000);
    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 500;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create arrow markers for directed graph
    svg.append('defs').selectAll('marker')
      .data(['normal', 'flagged'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => d === 'flagged' ? '#ef4444' : '#94a3b8');

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', d => d.flagged ? '#ef4444' : '#cbd5e1')
      .attr('stroke-width', d => Math.sqrt(d.amount))
      .attr('marker-end', d => `url(#arrow-${d.flagged ? 'flagged' : 'normal'})`);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => 10 + (d.balance / 10))
      .attr('fill', d => getRiskColor(d.riskScore))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Add labels
    node.append('text')
      .attr('dx', 20)
      .attr('dy', 4)
      .text(d => d.address)
      .attr('font-size', '10px')
      .attr('fill', '#4b5563');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

  }, [data]);

  const getRiskColor = (score: number): string => {
    if (score >= 90) return '#991b1b'; // critical
    if (score >= 70) return '#ef4444'; // high
    if (score >= 40) return '#f59e0b'; // medium
    if (score >= 10) return '#84cc16'; // low
    return '#10b981'; // none
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height="500"
        viewBox="0 0 800 500"
        className="border border-gray-200 rounded"
      />

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded shadow-sm border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Risk Levels</h4>
        <div className="space-y-1">
          {[
            { label: 'Critical', color: '#991b1b' },
            { label: 'High', color: '#ef4444' },
            { label: 'Medium', color: '#f59e0b' },
            { label: 'Low', color: '#84cc16' },
            { label: 'None', color: '#10b981' },
          ].map(item => (
            <div key={item.label} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-900">Selected Wallet</h4>
          <div className="mt-2 space-y-1 text-sm">
            <div>
              <span className="text-gray-600">Address:</span>
              <span className="ml-2 font-mono">{selectedNode.address}</span>
            </div>
            <div>
              <span className="text-gray-600">Risk Score:</span>
              <span className="ml-2 font-medium">{selectedNode.riskScore}</span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2">{selectedNode.type}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionGraph;
