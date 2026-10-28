import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Bell,
  CheckCircle2,
  Users,
  DollarSign,
  Box,
  Wrench,
  Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n';

export const CommandCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const fetchCommandCenter = async () => {
    setLoading(true);
    try {
      const res = await operationsApi.getCommandCenterFeed();
      setData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load command center feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandCenter();
  }, []);

  const feed = data?.feed || [];
  const urgentCount = feed.filter((f: any) => f.priority === 'URGENT').length;
  const highCount = feed.filter((f: any) => f.priority === 'HIGH').length;

  const filteredFeed = feed.filter((item: any) => {
    if (priorityFilter === 'ALL') return true;
    return item.priority === priorityFilter;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'OVERDUE_RENT':
        return DollarSign;
      case 'PENDING_ADMISSION':
      case 'UNCONTACTED_LEAD':
      case 'UPCOMING_VACANCY':
        return Users;
      case 'KITCHEN_STOCK_SHORTAGE':
        return Box;
      case 'OVERDUE_TASK':
      case 'PREVENTIVE_MAINTENANCE_DUE':
        return Wrench;
      case 'UNCLAIMED_PARCEL':
        return Truck;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Real-Time Operations Command
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Operational Intelligence Feed
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized actionable radar flagging vacancies, overdue rents, staff SLAs, and supply shortages across your PG.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchCommandCenter} className="gap-1.5 self-start sm:self-auto bg-white">
          <RefreshCw className="w-3.5 h-3.5" /> {t('refresh', 'Refresh')}
        </Button>
      </div>

      {/* Priority Summary Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
          <p className="text-[10px] font-bold uppercase text-red-700">Urgent Action Required</p>
          <p className="text-2xl font-extrabold text-red-900 mt-1">{urgentCount} Items</p>
          <p className="text-[11px] text-red-600 mt-0.5">Overdue rents & admissions pending</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
          <p className="text-[10px] font-bold uppercase text-amber-700">High Attention</p>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">{highCount} Items</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Uncontacted leads & pantry shortages</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Actionable Tasks</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{feed.length} Items</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all property departments</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              priorityFilter === p
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p === 'ALL' ? 'All Alerts' : `${p} Priority`}
          </button>
        ))}
      </div>

      {/* Actionable Feed Cards */}
      <div className="space-y-3">
        {filteredFeed.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-slate-800">All Operations In Good Order</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No critical issues or overdue items found for this priority filter.</p>
          </div>
        ) : (
          filteredFeed.map((item: any, idx: number) => {
            const Icon = getIconForType(item.type);
            const isUrgent = item.priority === 'URGENT';
            const isHigh = item.priority === 'HIGH';

            return (
              <Card
                key={idx}
                className={`p-4 bg-white border transition-all hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isUrgent ? 'border-red-200 bg-red-50/20' : isHigh ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isUrgent
                        ? 'bg-red-100 text-red-700'
                        : isHigh
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          isUrgent
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : 'Today'}
                  </span>
                  <Link to={item.actionLink}>
                    <Button size="sm" variant="outline" className="text-xs gap-1 bg-white hover:bg-slate-50">
                      <span>Resolve</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
