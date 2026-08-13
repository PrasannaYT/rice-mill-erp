import { Server, Activity, Cpu, HardDrive, Network } from 'lucide-react';
import os from 'os';

export const dynamic = 'force-dynamic';

export default function SystemHealth() {
  // Use Node.js OS module to get host system info
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);
  
  const cpus = os.cpus();
  const uptime = os.uptime();
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-white mb-2 tracking-tight flex items-center gap-3">
          <Activity className="text-red-500" />
          System Health Diagnostics
        </h1>
        <p className="text-red-400">Real-time hardware and network telemetry for the ERP host server.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Memory Usage */}
        <div className="bg-[#1a1315] border border-red-900/40 rounded-lg p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2"><HardDrive className="text-red-500 h-5 w-5" /> Memory Utilization</h3>
            <span className={`px-2 py-1 rounded text-xs font-bold ${memPercent > 90 ? 'bg-red-900 text-red-100' : 'bg-green-900/20 text-green-400 border border-green-900/30'}`}>
              {memPercent > 90 ? 'CRITICAL' : 'HEALTHY'}
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-red-300/70">Used: {formatBytes(usedMem)}</span>
              <span className="text-red-300/70">Total: {formatBytes(totalMem)}</span>
            </div>
            <div className="h-4 w-full bg-[#121212] rounded-full overflow-hidden border border-red-900/30">
              <div 
                className={`h-full ${memPercent > 90 ? 'bg-red-600' : memPercent > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${memPercent}%` }}
              ></div>
            </div>
            <p className="text-4xl font-bold text-white text-center mt-4">{memPercent}%</p>
          </div>
        </div>

        {/* CPU Info */}
        <div className="bg-[#1a1315] border border-red-900/40 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2"><Cpu className="text-red-500 h-5 w-5" /> Processor Metrics</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-red-900/20 pb-2">
              <span className="text-red-300/70">Model</span>
              <span className="text-white text-right max-w-[200px] truncate" title={cpus[0]?.model}>{cpus[0]?.model || 'Unknown'}</span>
            </div>
            <div className="flex justify-between border-b border-red-900/20 pb-2">
              <span className="text-red-300/70">Cores</span>
              <span className="text-white">{cpus.length}</span>
            </div>
            <div className="flex justify-between border-b border-red-900/20 pb-2">
              <span className="text-red-300/70">Architecture</span>
              <span className="text-white">{os.arch()}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-red-300/70">Speed</span>
              <span className="text-white">{cpus[0]?.speed} MHz</span>
            </div>
          </div>
        </div>

        {/* Server Info */}
        <div className="bg-[#1a1315] border border-red-900/40 rounded-lg p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2"><Server className="text-red-500 h-5 w-5" /> Host Environment</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/30 p-4 rounded border border-red-900/20">
              <div className="text-xs text-red-300/50 uppercase mb-1">OS Platform</div>
              <div className="text-white font-medium">{os.platform()} ({os.release()})</div>
            </div>
            <div className="bg-black/30 p-4 rounded border border-red-900/20">
              <div className="text-xs text-red-300/50 uppercase mb-1">Host Uptime</div>
              <div className="text-white font-medium">{formatUptime(uptime)}</div>
            </div>
            <div className="bg-black/30 p-4 rounded border border-red-900/20">
              <div className="text-xs text-red-300/50 uppercase mb-1">Hostname</div>
              <div className="text-white font-medium truncate">{os.hostname()}</div>
            </div>
            <div className="bg-black/30 p-4 rounded border border-red-900/20">
              <div className="text-xs text-red-300/50 uppercase mb-1">Node Version</div>
              <div className="text-white font-medium">{process.version}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
