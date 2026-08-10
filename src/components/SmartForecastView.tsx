'use client';

import { useState, useMemo } from 'react';
import { Phone, TrendingUp, Wheat, MapPin, Users, Filter, ChevronDown, ChevronRight, Sun, Cloud, Snowflake, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PredictiveLead {
  farmerId: string;
  farmerName: string;
  phone: string | null;
  predictedVariety: string;
  allVarieties: string[];
  probabilityScore: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  historicalAvgKg: number;
  village: string | null;
  brokerName: string;
  brokerId: string;
  totalBatches: number;
  lastProcurementDate: string | null;
  seasonalMonths: number[];
}

interface SmartForecastViewProps {
  leads: PredictiveLead[];
  availableVarieties: string[];
}

const CONFIDENCE_CONFIG = {
  HIGH: { dot: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', label: 'High' },
  MEDIUM: { dot: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', label: 'Medium' },
  LOW: { dot: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', label: 'Low' },
};

// Indian agricultural seasons
type Season = 'KHARIF' | 'RABI' | 'SUMMER';

const SEASON_CONFIG: Record<Season, { label: string; months: number[]; icon: typeof Sun; color: string; bg: string; border: string }> = {
  KHARIF: { label: 'Kharif', months: [6, 7, 8, 9, 10], icon: Cloud, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  RABI: { label: 'Rabi', months: [11, 0, 1, 2, 3], icon: Snowflake, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  SUMMER: { label: 'Summer', months: [4, 5], icon: Sun, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if ([6, 7, 8, 9, 10].includes(month)) return 'KHARIF';
  if ([11, 0, 1, 2, 3].includes(month)) return 'RABI';
  return 'SUMMER';
}

function getCurrentMonthYear(): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
}

// ─── Lead Card Component ───
function LeadCard({ lead, index }: { lead: PredictiveLead; index: number }) {
  const conf = CONFIDENCE_CONFIG[lead.confidenceLevel];
  const currentMonth = new Date().getMonth();
  const isInSeason = lead.seasonalMonths.includes(currentMonth);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 overflow-hidden hover:border-neutral-700 transition-colors"
    >
      <div className="p-4 sm:p-5">
        {/* Top Row: Name + Confidence + Season */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight truncate">
              {lead.farmerName}
            </h3>
            {(lead.village || lead.brokerName) && (
              <div className="flex items-center gap-3 mt-1">
                {lead.village && (
                  <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-semibold">
                    <MapPin className="w-3 h-3" /> {lead.village}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-semibold">
                  <Users className="w-3 h-3" /> via {lead.brokerName}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isInSeason && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]">
                <Leaf className="w-3 h-3" /> In Season
              </span>
            )}
            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${conf.border} ${conf.bg} ${conf.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
              {Math.round(lead.probabilityScore * 100)}%
            </span>
          </div>
        </div>

        {/* Middle Row: Data Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800/50">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#F5A623] mb-0.5">Expected Variety</p>
            <p className="text-sm font-black text-white">{lead.predictedVariety}</p>
            {lead.allVarieties.length > 1 && (
              <p className="text-[9px] text-neutral-600 font-medium mt-0.5">
                Also: {lead.allVarieties.filter(v => v !== lead.predictedVariety).join(', ')}
              </p>
            )}
          </div>
          <div className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800/50">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#F5A623] mb-0.5">Est. Yield</p>
            <p className="text-sm font-black text-white tabular-nums">~{lead.historicalAvgKg.toLocaleString('en-IN')} kg</p>
          </div>
          <div className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800/50 col-span-2 sm:col-span-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#F5A623] mb-0.5">Past Batches</p>
            <p className="text-sm font-black text-white tabular-nums">
              {lead.totalBatches} batch{lead.totalBatches !== 1 ? 'es' : ''}
              {lead.lastProcurementDate && (
                <span className="text-[10px] font-semibold text-neutral-500 ml-1.5">
                  (last: {new Date(lead.lastProcurementDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Bottom Row: Click to Call */}
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center justify-center w-full py-3 bg-[#F5A623] text-black font-black uppercase tracking-wider text-sm rounded-xl gap-2 active:scale-[0.97] hover:bg-[#E09510] transition-all shadow-lg shadow-[#F5A623]/10"
          >
            <Phone className="w-4 h-4" />
            Call Farmer
          </a>
        ) : (
          <div className="flex items-center justify-center w-full py-3 bg-neutral-800 text-neutral-500 font-black uppercase tracking-wider text-sm rounded-xl gap-2 cursor-not-allowed">
            <Phone className="w-4 h-4" />
            No Phone Number
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Broker Group Component ───
function BrokerGroup({ brokerName, leads, startIndex }: { brokerName: string; leads: PredictiveLead[]; startIndex: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const totalKg = leads.reduce((sum, l) => sum + l.historicalAvgKg, 0);
  const avgConfidence = Math.round(leads.reduce((sum, l) => sum + l.probabilityScore, 0) / leads.length * 100);

  return (
    <div className="bg-[#111111] rounded-2xl border border-neutral-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3 hover:bg-neutral-900/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#F5A623]/15 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-[#F5A623]" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-black text-white text-sm uppercase tracking-tight truncate">{brokerName}</h3>
            <p className="text-[10px] text-neutral-500 font-semibold">
              {leads.length} farmer{leads.length !== 1 ? 's' : ''} · ~{totalKg.toLocaleString('en-IN')} kg potential · {avgConfidence}% avg confidence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]">
            {leads.length}
          </span>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-4 space-y-3">
              {leads.map((lead, i) => (
                <LeadCard key={lead.farmerId} lead={lead} index={startIndex + i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───
export default function SmartForecastView({ leads, availableVarieties }: SmartForecastViewProps) {
  const monthYear = getCurrentMonthYear();
  const currentSeason = getCurrentSeason();
  const seasonConf = SEASON_CONFIG[currentSeason];
  const SeasonIcon = seasonConf.icon;

  // Filter state
  const [varietyFilter, setVarietyFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [groupByBroker, setGroupByBroker] = useState(true);

  // Apply filters
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (varietyFilter !== 'ALL') {
      result = result.filter(l => l.allVarieties.includes(varietyFilter));
    }
    return result;
  }, [leads, varietyFilter]);

  // Group by broker
  const brokerGroups = useMemo(() => {
    const groups: Record<string, { brokerName: string; leads: PredictiveLead[] }> = {};
    for (const lead of filteredLeads) {
      if (!groups[lead.brokerId]) {
        groups[lead.brokerId] = { brokerName: lead.brokerName, leads: [] };
      }
      groups[lead.brokerId].leads.push(lead);
    }
    // Sort groups by total probability (highest first)
    return Object.values(groups).sort((a, b) => {
      const aAvg = a.leads.reduce((s, l) => s + l.probabilityScore, 0) / a.leads.length;
      const bAvg = b.leads.reduce((s, l) => s + l.probabilityScore, 0) / b.leads.length;
      return bAvg - aAvg;
    });
  }, [filteredLeads]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Header with Season Badge */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#111111] rounded-2xl border border-neutral-800 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-[#F5A623]/15 rounded-xl">
                <TrendingUp className="w-5 h-5 text-[#F5A623]" />
              </div>
              <h2 className="font-black text-lg sm:text-xl text-white uppercase tracking-tight">
                Expected Harvests: {monthYear}
              </h2>
            </div>
            <p className="text-neutral-500 text-xs sm:text-sm font-medium ml-12">
              Predicted farmer leads based on historical procurement patterns.
            </p>
          </div>
          <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full border ${seasonConf.border} ${seasonConf.bg} ${seasonConf.color}`}>
            <SeasonIcon className="w-3.5 h-3.5" />
            {seasonConf.label} Season
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between sm:hidden mb-2"
        >
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400">
            <Filter className="w-3.5 h-3.5" /> Filters
          </span>
          {showFilters ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}
        </button>

        <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
          {/* Variety Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 shrink-0">Variety:</span>
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar flex-1">
              <button
                type="button"
                onClick={() => setVarietyFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  varietyFilter === 'ALL'
                    ? 'bg-[#F5A623] text-black'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
                }`}
              >
                All
              </button>
              {availableVarieties.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVarietyFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    varietyFilter === v
                      ? 'bg-[#F5A623] text-black'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-neutral-700" />

          {/* Broker Grouping Toggle */}
          <button
            type="button"
            onClick={() => setGroupByBroker(!groupByBroker)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
              groupByBroker
                ? 'bg-[#F5A623] text-black'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
            }`}
          >
            <Users className="w-3 h-3" />
            Group by Broker
          </button>
        </div>
      </div>

      {/* Results Count */}
      {filteredLeads.length > 0 && filteredLeads.length !== leads.length && (
        <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider px-1">
          Showing {filteredLeads.length} of {leads.length} leads
          {varietyFilter !== 'ALL' && <span> · Filtered by <span className="text-[#F5A623]">{varietyFilter}</span></span>}
        </p>
      )}

      {/* Lead Cards — Grouped or Flat */}
      {filteredLeads.length === 0 ? (
        <div className="bg-[#111111] rounded-2xl border border-neutral-800 p-10 sm:p-16 text-center">
          <Wheat className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <p className="font-black text-base text-neutral-500 uppercase tracking-wider mb-2">
            {leads.length === 0 ? 'No Predictions Yet' : 'No Matches'}
          </p>
          <p className="text-neutral-600 text-sm font-medium max-w-md mx-auto">
            {leads.length === 0
              ? 'Add more farmers and procurement entries to generate harvest predictions.'
              : `No farmers found for "${varietyFilter}". Try a different variety filter.`
            }
          </p>
        </div>
      ) : groupByBroker ? (
        <div className="space-y-4">
          {brokerGroups.map((group, gi) => {
            const startIdx = brokerGroups.slice(0, gi).reduce((sum, g) => sum + g.leads.length, 0);
            return (
              <BrokerGroup
                key={group.brokerName}
                brokerName={group.brokerName}
                leads={group.leads}
                startIndex={startIdx}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead, index) => (
            <LeadCard key={lead.farmerId} lead={lead} index={index} />
          ))}
        </div>
      )}

      {/* Footer */}
      {filteredLeads.length > 0 && (
        <p className="text-center text-[10px] text-neutral-600 font-semibold uppercase tracking-wider py-2">
          {filteredLeads.length} predicted lead{filteredLeads.length !== 1 ? 's' : ''} for {monthYear} · {seasonConf.label} Season
        </p>
      )}
    </div>
  );
}
