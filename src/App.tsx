import { motion, AnimatePresence } from "motion/react";
import { Activity, Server, Smartphone, Laptop, Plus, XOctagon, Zap, Cpu, Database, ChevronRight, ActivitySquare } from "lucide-react";
import { useInferenceEngine, Node, Task, NodeType, ModelConfig } from "./lib/simulation";
import { cn } from "./lib/utils";
import { type ElementType, useMemo } from "react";

const NODE_ICONS: Record<NodeType, ElementType> = {
  server: Server,
  edge: Laptop,
  mobile: Smartphone,
};

function NodeCard({ node, activeTasks, onKill }: { key?: string | number, node: Node; activeTasks: number; onKill: (id: string) => void }) {
  const Icon = NODE_ICONS[node.type];
  const isOffline = node.status === 'offline';
  const memPct = (node.memory.used / node.memory.total) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "grayscale(100%)" }}
      className={cn(
        "relative rounded border p-4 w-64 bg-black flex flex-col gap-3",
        isOffline ? "border-white/5 opacity-50" : "border-white/10",
        activeTasks > 0 && !isOffline && "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-sm",
            isOffline ? "bg-white/5 text-white/40" :
            node.type === 'server' ? "bg-cyan-500/10 text-cyan-400" :
            node.type === 'edge' ? "bg-cyan-500/20 text-cyan-500" :
            "bg-emerald-400/10 text-emerald-400"
          )}>
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-mono text-[11px] font-bold text-[#e0e0e0] uppercase">{node.id}</h3>
            <span className="text-[9px] text-white/40 uppercase tracking-widest">{node.type} • {node.latency}ms</span>
          </div>
        </div>
        {!isOffline && (
          <button 
            onClick={() => onKill(node.id)}
            className="text-white/30 hover:text-amber-500 transition-colors"
            title="Simulate Power Failure"
          >
            <XOctagon size={16} />
          </button>
        )}
      </div>

      {isOffline ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <span className="font-mono text-amber-500 text-sm font-bold tracking-[0.2em]">OFFLINE</span>
        </div>
      ) : (
        <>
          {/* Shards */}
          <div className="flex gap-1 flex-wrap mt-1">
            {node.shards.map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/60">
                S-{s.shardIndex}
              </span>
            ))}
            {node.shards.length === 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-white/30 border border-transparent italic">Idle</span>
            )}
          </div>

          {/* Metrics */}
          <div className="space-y-2 mt-auto pt-2 border-t border-white/5">
            <div className="flex justify-between text-[10px] uppercase font-mono">
              <span className="text-white/40 flex items-center gap-1"><Cpu size={10}/> CPU</span>
              <span className="text-[#e0e0e0]">{node.cpu.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${node.cpu}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[10px] uppercase font-mono">
              <span className="text-white/40 flex items-center gap-1"><Database size={10}/> MEM</span>
              <span className="text-[#e0e0e0]">{node.memory.used} / {node.memory.total}GB</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${memPct}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Active Task Pulse */}
      {activeTasks > 0 && !isOffline && (
         <motion.div 
           className="absolute inset-0 rounded border border-cyan-500 pointer-events-none"
           animate={{ boxShadow: ["0px 0px 0px 0px rgba(6,182,212,0)", "0px 0px 10px 2px rgba(6,182,212,0.3)", "0px 0px 0px 0px rgba(6,182,212,0)"] }}
           transition={{ repeat: Infinity, duration: 1 }}
         />
      )}
    </motion.div>
  );
}

function TaskLine({ task, nodes, activeModel }: { key?: string | number, task: Task; nodes: Node[]; activeModel: ModelConfig }) {
   if (task.status === 'completed' || task.status === 'failed') return null;

   const activeNodeId = task.path[task.currentShardIndex];
   
   return (
     <div className="flex items-center gap-2 mb-2 p-2 bg-white/5 rounded border border-white/10">
        <ActivitySquare size={16} className="text-cyan-500 animate-pulse" />
        <div className="flex-1">
            <div className="flex justify-between text-[10px] uppercase mb-1">
                <span className="font-mono text-white/40">{task.id}</span>
                <span className="font-mono text-cyan-400">{Math.floor(task.progress)}%</span>
            </div>
            <div className="flex items-center gap-1">
              {task.path.map((nodeId, idx) => {
                 const isActive = idx === task.currentShardIndex;
                 const isDone = idx < task.currentShardIndex;
                 return (
                   <div key={idx} className="flex items-center">
                     <span className={cn(
                       "text-[9px] font-mono px-1.5 py-0.5 rounded",
                       isActive ? "bg-cyan-500/20 text-cyan-500 border border-cyan-500/50" :
                       isDone ? "bg-emerald-400/10 text-emerald-400" :
                       "bg-white/5 text-white/30"
                     )}>
                       Shard {idx}
                     </span>
                     {idx < task.path.length - 1 && <ChevronRight size={10} className="text-white/20 mx-1" />}
                   </div>
                 )
              })}
            </div>
        </div>
     </div>
   );
}


export default function App() {
  const {
    nodes,
    tasks,
    logs,
    MODELS,
    activeModelId,
    setActiveModelId,
    addNode,
    killNode,
    dispatchTask
  } = useInferenceEngine();

  const activeModel = MODELS.find(m => m.id === activeModelId)!;
  const activeTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  
  // Calculate cluster health
  const onlineNodes = nodes.filter(n => n.status === 'online');
  const currentTotalShards = Array.from(new Set(
    onlineNodes.flatMap(n => n.shards.filter(s => s.modelId === activeModelId).map(s => s.shardIndex))
  )).length;
  const clusterReady = currentTotalShards === activeModel.totalShards;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans overflow-hidden">
      
      {/* Header View */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md">
         <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-cyan-500 rounded-sm flex items-center justify-center text-black font-black text-xs">EXO</div>
            <h1 className="text-xl font-bold tracking-tighter uppercase">Nexus <span className="text-cyan-500">Core</span></h1>
         </div>

         {/* Global Stats */}
         <div className="flex gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/40 font-mono uppercase">TPS (Completed)</span>
                <span className="text-xs font-bold font-mono text-emerald-400">{completedTasks} TICK/S</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/40 font-mono uppercase">Active Nodes</span>
                <span className="text-xs font-bold font-mono text-cyan-400">{onlineNodes.length} SYNCED</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/40 font-mono uppercase">Cluster Status</span>
                <span className={cn("text-xs font-bold font-mono flex items-center gap-1 uppercase", clusterReady ? "text-emerald-400" : "text-amber-500")}>
                    <span className="flex h-2 w-2 relative">
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", clusterReady ? "bg-emerald-400" : "bg-amber-500")}></span>
                        <span className={cn("relative inline-flex rounded-full h-2 w-2", clusterReady ? "bg-emerald-400" : "bg-amber-500")}></span>
                    </span>
                    {clusterReady ? 'Ready' : 'Re-sharding'}
                </span>
            </div>
         </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-1 p-1 bg-white/5">
        
        {/* Left Sidebar: Controls */}
        <aside className="col-span-3 bg-black flex flex-col p-4 border border-white/5 overflow-y-auto hidden lg:flex">
           
           <section className="mb-8">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/60 mb-4">Model Config</h2>
              <div className="flex flex-col gap-2">
                 {MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => setActiveModelId(model.id)}
                      className={cn(
                        "text-left px-4 py-3 border transition-all rounded-sm",
                        activeModelId === model.id 
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" 
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/60"
                      )}
                    >
                       <div className="font-mono text-[10px] flex justify-between">
                         <span className={activeModelId === model.id ? "font-bold font-sans uppercase" : "font-sans uppercase"}>{model.name}</span>
                         {activeModelId === model.id && <Activity size={12} className="text-cyan-400" />}
                       </div>
                       <div className="text-[9px] font-mono mt-1 opacity-70">
                         {model.totalShards} Shards • {model.memoryPerShard}GB/Shard
                       </div>
                    </button>
                 ))}
              </div>
           </section>

           <section>
              <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/60 mb-4">Add Capacity</h2>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => addNode('server')} className="flex flex-col items-center gap-2 p-3 border border-white/10 bg-white/5 hover:border-white/30 rounded-sm transition-colors">
                    <Server size={18} className="text-cyan-400"/>
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Server</span>
                 </button>
                 <button onClick={() => addNode('edge')} className="flex flex-col items-center gap-2 p-3 border border-white/10 bg-white/5 hover:border-white/30 rounded-sm transition-colors">
                    <Laptop size={18} className="text-cyan-500"/>
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Edge</span>
                 </button>
                 <button onClick={() => addNode('mobile')} className="flex flex-col items-center gap-2 p-3 border border-white/10 bg-white/5 hover:border-white/30 rounded-sm transition-colors col-span-2">
                    <Smartphone size={18} className="text-emerald-400"/>
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Mobile</span>
                 </button>
              </div>
           </section>

           <div className="mt-auto pt-6">
              <button 
                onClick={dispatchTask}
                disabled={!clusterReady}
                className={cn(
                  "w-full py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-sm",
                  clusterReady 
                    ? "bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                    : "bg-white/10 text-white/30 cursor-not-allowed border border-white/5"
                )}
              >
                  Deploy Model Shard
              </button>
           </div>
        </aside>

        {/* Center: Network Visualizer Grid */}
        <section className="col-span-6 bg-black relative flex flex-col p-6 overflow-y-auto custom-scrollbar border border-white/5">
            {/* Minimal Grid Background */}
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] [background-size:24px_24px]"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight uppercase">{activeModel.name}</h2>
                <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">Model Sharding: {activeModel.totalShards} Partitions / Distributed P2P Inference</p>
              </div>
              <div className="px-3 py-1 bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded">
                REAL-TIME ENGINE ACTIVE
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 relative z-10 justify-center lg:justify-start">
               <AnimatePresence>
                 {nodes.map(node => (
                    <NodeCard 
                       key={node.id} 
                       node={node} 
                       onKill={killNode}
                       activeTasks={tasks.filter(t => t.status === 'running' && t.path[t.currentShardIndex] === node.id).length}
                    />
                 ))}
               </AnimatePresence>

               {nodes.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-white/30 text-xs tracking-widest uppercase">Awaiting topology data...</span>
                 </div>
               )}
            </div>
        </section>

        {/* Right Sidebar: Telemetry & Traces */}
        <aside className="col-span-3 bg-black flex flex-col border border-white/5 hidden lg:flex">
           
           {/* Active Traces */}
           <div className="flex-1 flex flex-col p-4 overflow-hidden">
               <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/60 mb-4 flex justify-between items-center">
                 System Health
                 <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-[9px]">{activeTasks.length} TRACES</span>
               </h2>
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  <AnimatePresence>
                    {activeTasks.length === 0 ? (
                       <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-center mt-10">
                          <ActivitySquare size={24} className="text-white/10 mx-auto mb-2" />
                          <span className="font-mono text-white/30 text-[10px] uppercase tracking-widest">No active tasks</span>
                       </motion.div>
                    ) : (
                       activeTasks.map(task => (
                          <motion.div key={task.id} initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, scale: 0.95}}>
                             <TaskLine task={task} nodes={nodes} activeModel={activeModel} />
                          </motion.div>
                       ))
                    )}
                  </AnimatePresence>
               </div>
           </div>

           {/* Event Log */}
           <div className="h-1/3 border-t border-white/5 bg-[#0a0a0a] p-4 flex flex-col overflow-hidden">
              <span className="text-[10px] font-mono uppercase text-white/40 mb-2">Event Stream</span>
              <div className="flex-1 overflow-y-auto pr-2 font-mono text-[9px] space-y-2 custom-scrollbar flex flex-col-reverse opacity-80">
                 {logs.map(log => (
                    <div key={log.id} className="flex gap-2">
                       <span className="text-white/30 shrink-0">[{log.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]</span>
                       <span className={cn(
                          "flex-1 uppercase",
                          log.type === 'error' && "text-amber-500",
                          log.type === 'warn' && "text-cyan-400",
                          log.type === 'success' && "text-emerald-400",
                          log.type === 'info' && "text-white/50"
                       )}>
                          {log.message}
                       </span>
                    </div>
                 ))}
              </div>
           </div>
        </aside>

        {/* Mobile Warning Overlay */}
        <div className="fixed inset-0 bg-[#050505] z-50 flex lg:hidden flex-col justify-center p-6 text-center">
            <ActivitySquare size={48} className="text-cyan-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold font-mono mb-2 uppercase tracking-tight">Nexus Requires Desktop</h2>
            <p className="text-white/40 text-sm">The edge topology simulation dashboard requires a desktop viewport to visualize P2P mesh relationships.</p>
        </div>

      </main>

      {/* Footer Bar */}
      <footer className="h-8 bg-[#050505] border-t border-white/5 flex items-center justify-between px-6 text-[9px] font-mono text-white/30">
        <div className="flex gap-4">
          <span>SYSTEM_ID: Nexus-9-Alpha</span>
          <span>UPTIME: 142:22:04</span>
          <span>PROTO: P2P/V3-Secure</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-emerald-500">SECURE ENCLAVE CONNECTED</span>
        </div>
      </footer>
    </div>
  );
}
