import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Clock,
  Users,
  AlertTriangle,
  ShoppingCart,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  PackageCheck
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';

export const CookDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  // Menu Form State
  const [mealPeriod, setMealPeriod] = useState('LUNCH');
  const [title, setTitle] = useState('');
  const [servingTime, setServingTime] = useState('12:30 PM - 02:30 PM');
  const [cutoffTime, setCutoffTime] = useState('10:00 AM');
  const [dishes, setDishes] = useState('');

  // Stock Form State
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [stockType, setStockType] = useState<'STOCK_IN' | 'CONSUMED' | 'WASTED'>('CONSUMED');
  const [stockQty, setStockQty] = useState('');
  const [stockReason, setStockReason] = useState('');

  // Purchase Request State
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('kg');
  const [purchaseCost, setPurchaseCost] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await saasApi.getCookDashboard();
      setData(res.data);
      const invRes = await saasApi.getKitchenInventory();
      setInventory(invRes.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load kitchen dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = dishes
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          dietaryType: name.toLowerCase().includes('chicken') || name.toLowerCase().includes('egg') ? 'NON_VEG' : 'VEG',
          isAvailable: true,
        }));

      await saasApi.createOrUpdateMenu({
        date: new Date().toISOString(),
        mealPeriod,
        title,
        servingTime,
        cutoffTime,
        items,
      });

      toast.success(`${mealPeriod} menu published successfully!`);
      setMenuModalOpen(false);
      setTitle('');
      setDishes('');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save menu');
    }
  };

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.recordStockMovement({
        ingredientId: selectedIngredient,
        type: stockType,
        quantity: parseFloat(stockQty),
        reason: stockReason,
      });
      toast.success('Stock movement recorded successfully');
      setStockModalOpen(false);
      setStockQty('');
      setStockReason('');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record movement');
    }
  };

  const handlePurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.createPurchaseRequest({
        itemTitle: purchaseItem,
        quantity: parseFloat(purchaseQty),
        unit: purchaseUnit,
        estimatedCost: purchaseCost ? parseFloat(purchaseCost) : undefined,
      });
      toast.success('Purchase request submitted for manager approval');
      setPurchaseModalOpen(false);
      setPurchaseItem('');
      setPurchaseQty('');
      setPurchaseCost('');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-medium">Loading Kitchen & Mess Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] p-4 sm:p-6 lg:p-8 text-slate-900">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Kitchen & Mess Staff Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111A16] tracking-tight">
            Daily Meal Planning & Kitchen Ops
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage menus, live resident meal counts, ingredient inventory, and supplies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchDashboard} className="gap-1.5 bg-white border-slate-200">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setStockModalOpen(true)} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
            <PackageCheck className="w-3.5 h-3.5" /> Log Stock
          </Button>
          <Button size="sm" onClick={() => setMenuModalOpen(true)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Publish Menu
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Meal Schedules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" /> Today's Published Meals
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full">
              {data?.totalActiveResidents || 0} Total Active Residents
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.todayMeals && data.todayMeals.length > 0 ? (
              data.todayMeals.map((meal: any) => (
                <Card key={meal.id} className="p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {meal.mealPeriod}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {meal.servingTime || 'Standard'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mb-1">{meal.title}</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-black text-emerald-700">{meal.expectedCount}</span>
                    <span className="text-xs text-slate-500 font-medium">Expected Servings</span>
                    <span className="text-[11px] text-slate-400">({meal.optedOutCount} opted out)</span>
                  </div>

                  {meal.items && meal.items.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Menu Items</p>
                      <ul className="space-y-1">
                        {meal.items.map((it: any) => (
                          <li key={it.id} className="text-xs text-slate-700 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${it.dietaryType === 'NON_VEG' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            {it.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No menus published for today yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Publish Breakfast, Lunch, or Dinner so residents can opt-in.</p>
                <Button size="sm" onClick={() => setMenuModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Publish First Meal
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inventory Shortages & Purchase Requests */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Kitchen Shortage Alerts
              </h3>
              <Button size="xs" variant="ghost" onClick={() => setPurchaseModalOpen(true)} className="text-amber-700">
                + Request
              </Button>
            </div>

            {data?.lowStockAlerts && data.lowStockAlerts.length > 0 ? (
              <div className="space-y-2">
                {data.lowStockAlerts.map((item: any) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-rose-700">Min required: {item.minStock} {item.unit}</p>
                    </div>
                    <span className="text-xs font-extrabold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                      {item.currentStock} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">All kitchen pantry ingredients are above threshold levels.</p>
            )}
          </Card>

          {/* Pending Purchase Requests */}
          <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-slate-600" /> Recent Purchase Requests
            </h3>
            {data?.pendingPurchaseRequests && data.pendingPurchaseRequests.length > 0 ? (
              <div className="space-y-2">
                {data.pendingPurchaseRequests.map((req: any) => (
                  <div key={req.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{req.itemTitle}</p>
                      <p className="text-[10px] text-slate-400">{req.quantity} {req.unit} · {req.status}</p>
                    </div>
                    {req.estimatedCost && (
                      <span className="text-xs font-semibold text-slate-700">₹{req.estimatedCost}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No pending grocery purchase requests.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: Publish Menu */}
      <Modal isOpen={menuModalOpen} onClose={() => setMenuModalOpen(false)} title="Publish Kitchen Meal Menu">
        <form onSubmit={handleSaveMenu} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Meal Period</label>
            <select
              value={mealPeriod}
              onChange={(e) => setMealPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="SNACKS">Evening Snacks</option>
              <option value="DINNER">Dinner</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Meal Title / Theme</label>
            <input
              type="text"
              required
              placeholder="e.g. Gujarati Thali or Sunday Special Biryani"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Serving Time</label>
              <input
                type="text"
                value={servingTime}
                onChange={(e) => setServingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Opt-Out Cutoff</label>
              <input
                type="text"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dishes & Items (One per line)</label>
            <textarea
              rows={4}
              required
              placeholder="Paneer Tikka Masala&#10;Dal Tadka&#10;Jeera Rice&#10;Butter Roti&#10;Gulab Jamun"
              value={dishes}
              onChange={(e) => setDishes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setMenuModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
              Publish Menu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Stock Movement */}
      <Modal isOpen={stockModalOpen} onClose={() => setStockModalOpen(false)} title="Log Kitchen Pantry Movement">
        <form onSubmit={handleStockMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Ingredient</label>
            <select
              required
              value={selectedIngredient}
              onChange={(e) => setSelectedIngredient(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="">-- Choose item --</option>
              {inventory.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.name} (Current: {inv.currentStock} {inv.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Action Type</label>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="CONSUMED">Used / Consumed</option>
                <option value="STOCK_IN">Added New Stock</option>
                <option value="WASTED">Wasted / Spoiled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 5"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Prepared dinner for 40 residents"
              value={stockReason}
              onChange={(e) => setStockReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStockModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Save Movement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Purchase Request */}
      <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="New Grocery / Ingredient Purchase Request">
        <form onSubmit={handlePurchaseRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Mustard Oil or Cooking Gas Cylinder"
              value={purchaseItem}
              onChange={(e) => setPurchaseItem(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.1"
                required
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
              <select
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="kg">kg</option>
                <option value="liters">liters</option>
                <option value="packets">packets</option>
                <option value="units">units</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Cost (₹ Optional)</label>
            <input
              type="number"
              placeholder="e.g. 1500"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPurchaseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
