import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
export type NodeType = 'server' | 'edge' | 'mobile';

export interface Node {
  id: string;
  type: NodeType;
  cpu: number; // 0-100%
  memory: { used: number; total: number }; // GB
  latency: number; // ms to nearest peer
  status: 'online' | 'offline' | 'compiling';
  shards: ShardAllocation[];
}

export interface ModelConfig {
  id: string;
  name: string;
  totalShards: number;
  memoryPerShard: number; // GB
}

export interface ShardAllocation {
  modelId: string;
  shardIndex: number;
}

export interface Task {
  id: string;
  modelId: string;
  path: string[]; // Node IDs representing the path
  currentShardIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  progress: number; // 0 to 100
}

const MODELS: ModelConfig[] = [
  { id: 'llama3-8b', name: 'Llama-3-8B', totalShards: 4, memoryPerShard: 4 },
  { id: 'mistral-7b', name: 'Mistral-7B', totalShards: 3, memoryPerShard: 5 },
  { id: 'phi-3-mini', name: 'Phi-3-Mini', totalShards: 2, memoryPerShard: 2 },
];

const NODE_SPECS: Record<NodeType, { mem: number[], lat: number[] }> = {
  server: { mem: [16, 24, 32, 64], lat: [5, 20] },
  edge: { mem: [8, 16], lat: [15, 45] },
  mobile: { mem: [2, 4, 8], lat: [40, 120] },
};

function randomId() {
  return Math.random().toString(36).substring(2, 9);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useInferenceEngine() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<{ id: string; time: Date; message: string; type: 'info' | 'warn' | 'error' | 'success' }[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>(MODELS[0].id);
  
  const addLog = useCallback((message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setLogs((prev) => [{ id: randomId(), time: new Date(), message, type }, ...prev].slice(0, 50));
  }, []);

  // Engine loop ref
  const lastTickRef = useRef<number>(Date.now());

  // Init network with some nodes
  useEffect(() => {
    const initialNodes: Node[] = [];
    for (let i = 0; i < 4; i++) {
        const type = i === 0 ? 'server' : 'edge';
        const memChoices = NODE_SPECS[type].mem;
        const mem = randomChoice(memChoices);
        initialNodes.push({
            id: `node-${randomId()}`,
            type,
            cpu: randomInt(5, 15),
            memory: { used: 0, total: mem },
            latency: randomInt(NODE_SPECS[type].lat[0], NODE_SPECS[type].lat[1]),
            status: 'online',
            shards: [],
        });
    }
    setNodes(initialNodes);
    addLog('Nexus distributed network initialized with 4 nodes.');
  }, [addLog]);

  const activeModel = MODELS.find((m) => m.id === activeModelId)!;

  // Auto-Sharding Logic: re-distribute shards primarily to nodes with memory
  useEffect(() => {
    setNodes((currentNodes) => {
      let changed = false;
      const newNodes = currentNodes.map(n => ({...n}));
      
      const missingShards = [];
      const requiredShards = activeModel.totalShards;
      
      // Determine what is currently hosted for the active model
      const hostedShards = new Set<number>();
      // Also clean up dead model shards
      newNodes.forEach(node => {
         node.shards = node.shards.filter(s => s.modelId === activeModelId); // Only keep active model shards to save sim complexity
         node.shards.forEach(s => {
           if (s.modelId === activeModelId) hostedShards.add(s.shardIndex);
         });
      });

      for (let i = 0; i < requiredShards; i++) {
        if (!hostedShards.has(i)) missingShards.push(i);
      }

      if (missingShards.length > 0) {
        // Try to allocate missing shards
        for (const shardIdx of missingShards) {
            // Find a node that has enough free memory and is online
            const availableNodes = newNodes.filter(n => n.status === 'online' && (n.memory.total - n.memory.used) >= activeModel.memoryPerShard);
            if (availableNodes.length > 0) {
                // Sort by least latency & most free memory
                availableNodes.sort((a, b) => {
                    const freeA = a.memory.total - a.memory.used;
                    const freeB = b.memory.total - b.memory.used;
                    return (a.latency - freeA*10) - (b.latency - freeB*10); 
                });
                
                const targetNode = availableNodes[0];
                targetNode.shards.push({ modelId: activeModelId, shardIndex: shardIdx });
                targetNode.memory.used += activeModel.memoryPerShard;
                changed = true;
                setTimeout(() => addLog(`Allocated Shard ${shardIdx} of ${activeModel.name} to ${targetNode.id}`, 'info'), 0);
            } else {
                setTimeout(() => addLog(`WARNING: Insufficient cluster memory to allocate Shard ${shardIdx} of ${activeModel.name}`, 'warn'), 0);
            }
        }
      }

      return changed ? newNodes : currentNodes;
    });
  }, [activeModel, nodes.length, addLog, activeModelId]);

  // Actions
  const addNode = useCallback((type: NodeType) => {
    const mem = randomChoice(NODE_SPECS[type].mem);
    const newNode: Node = {
        id: `node-${randomId()}`,
        type,
        cpu: randomInt(2, 5),
        memory: { used: 0, total: mem },
        latency: randomInt(NODE_SPECS[type].lat[0], NODE_SPECS[type].lat[1]),
        status: 'online',
        shards: [],
    };
    setNodes(prev => [...prev, newNode]);
    addLog(`New ${type} node joined the network (${mem}GB).`, 'success');
  }, [addLog]);

  const killNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
            return { ...n, status: 'offline', memory: { ...n.memory, used: 0 }, shards: [] };
        }
        return n;
    }));
    setTasks(prev => prev.map(t => {
      // fail task if it was using this node
      if (t.status === 'running' && t.path.includes(nodeId)) {
          return { ...t, status: 'failed' };
      }
      return t;
    }));
    addLog(`Node ${nodeId} reported offline. Re-sharding will commence.`, 'error');
  }, [addLog]);

  const dispatchTask = useCallback(() => {
    setNodes(currentNodes => {
      // Find a path of nodes that sequentially host shards 0 to N
      const path: string[] = [];
      const requiredShards = activeModel.totalShards;
      
      let canServe = true;
      for (let i = 0; i < requiredShards; i++) {
          const eligibleNodes = currentNodes.filter(n => n.status === 'online' && n.shards.some(s => s.modelId === activeModelId && s.shardIndex === i));
          if (eligibleNodes.length === 0) {
              canServe = false;
              break;
          }
          // Pick a random eligible node for this shard (could be load balanced)
          const chosenNode = randomChoice(eligibleNodes) as Node;
          path.push(chosenNode.id);
      }

      if (!canServe) {
          addLog(`Failed to dispatch task: Model shards not fully available.`, 'error');
          return currentNodes;
      }

      const newTask: Task = {
        id: `task-${randomId()}`,
        modelId: activeModelId,
        path,
        currentShardIndex: 0,
        status: 'pending',
        startTime: Date.now(),
        progress: 0
      };

      setTasks(prev => [...prev.slice(-20), newTask]);
      return currentNodes;
    });
  }, [activeModel, activeModelId, addLog]);

  // Simulation Tick
  useEffect(() => {
    const tickId = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;

      setTasks(prevTasks => {
        let changed = false;
        const newTasks = prevTasks.map(t => {
            if (t.status === 'completed' || t.status === 'failed') return t;
            
            if (t.status === 'pending') {
                changed = true;
                return { ...t, status: 'running' };
            }

            if (t.status === 'running') {
                changed = true;
                // progress increment based on dt. A full inference takes ~ 800ms
                const inferenceSpeed = 100 / (800 / dt);
                const newProgress = t.progress + inferenceSpeed;

                if (newProgress >= 100) {
                     return { ...t, progress: 100, status: 'completed' };
                } else {
                     // update current shard index based on progress
                     const totalShards = MODELS.find(m => m.id === t.modelId)?.totalShards || 1;
                     const currentShard = Math.min(Math.floor((newProgress / 100) * totalShards), totalShards - 1);
                     return { ...t, progress: newProgress, currentShardIndex: currentShard };
                }
            }
            return t;
        });
        return changed ? newTasks : prevTasks;
      });

      // Fluctuate CPU usage
      setNodes(prev => prev.map(n => {
        if (n.status === 'offline') return n;
        
        let cpuTarget = 5;
        const activeTasksForNode = tasks.filter(t => t.status === 'running' && t.path[t.currentShardIndex] === n.id).length;
        cpuTarget += (activeTasksForNode * 30);
        
        let newCpu = n.cpu + (cpuTarget - n.cpu) * 0.1;
        newCpu = Math.max(0, Math.min(100, newCpu + (Math.random() * 4 - 2)));
        
        return { ...n, cpu: newCpu };
      }));

    }, 100); // 10 ticks per second

    return () => clearInterval(tickId);
  }, [tasks]);

  return {
    nodes,
    tasks,
    logs,
    MODELS,
    activeModelId,
    setActiveModelId,
    addNode,
    killNode,
    dispatchTask
  };
}
