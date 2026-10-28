import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from '../../context/ToastContext';

export const ResidentMealsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<any[]>([]);

  const fetchResidentMenus = async () => {
    setLoading(true);
    try {
      const res = await saasApi.getMenus();
      setMenus(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidentMenus();
  }, []);

  const handleToggleParticipation = async (menuId: string, status: 'OPTED_IN' | 'OPTED_OUT') => {
    try {
      await saasApi.optInOutMeal(menuId, status);
      toast.success(status === 'OPTED_IN' ? 'You are attending this meal' : 'You opted out of this meal');
      fetchResidentMenus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update meal selection');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Mess & Dining Portal
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Today's PG Meals & Menu</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Opt-in or opt-out before the cutoff time so the kitchen prepares the right portion.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchResidentMenus} className="gap-1.5 self-start bg-white">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Menu
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching today's published menus...</p>
        </div>
      ) : menus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menus.map((menu) => {
            const isOptedOut = menu.residentSelection === 'OPTED_OUT';

            return (
              <Card key={menu.id} className="p-5 border border-slate-200 bg-white shadow-xs hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
                    {menu.mealPeriod}
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {menu.servingTime || 'Serving Hours'}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 mb-1">{menu.title}</h3>

                {menu.cutoffTime && (
                  <p className="text-[11px] text-amber-800 bg-amber-50/70 px-2 py-1 rounded border border-amber-100 mb-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" /> Cutoff for changes: {menu.cutoffTime}
                  </p>
                )}

                {/* Items List */}
                {menu.items && menu.items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dishes on Menu</p>
                    <div className="space-y-1">
                      {menu.items.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <span className={`w-2 h-2 rounded-full ${it.dietaryType === 'NON_VEG' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {it.name}
                          </span>
                          {it.allergens && (
                            <span className="text-[10px] text-slate-400">Allergen: {it.allergens}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resident Selection Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Your Status:</span>
                    <span className={`font-bold ${isOptedOut ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {isOptedOut ? 'Opted Out (Not Attending)' : 'Attending Meal'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {isOptedOut ? (
                      <Button
                        size="xs"
                        onClick={() => handleToggleParticipation(menu.id, 'OPTED_IN')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Opt-In
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleToggleParticipation(menu.id, 'OPTED_OUT')}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Opt-Out
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center bg-white border border-dashed border-slate-200">
          <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No menus published for today yet</p>
          <p className="text-xs text-slate-400 mt-1">The kitchen staff will publish the daily menu shortly.</p>
        </Card>
      )}
    </div>
  );
};
