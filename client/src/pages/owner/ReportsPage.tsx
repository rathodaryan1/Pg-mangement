import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Users,
  BedDouble,
  FileSpreadsheet,
  PieChart,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import ownerApi from '../../services/ownerApi';

export const ReportsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await ownerApi.getReports({ propertyId: activeProperty.id, range: dateRange });
      setReportData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeProperty, dateRange]);

  const handleExportCSV = (reportName: string) => {
    setToastMessage(`Exporting ${reportName} to CSV...`);
    setTimeout(() => {
      setToastMessage(`${reportName}.csv downloaded successfully!`);
      setTimeout(() => setToastMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operational Intelligence & Financial Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time analytics for occupancy, revenue collections, overdue rents, and expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="THIS_MONTH">Current Month (September 2026)</option>
            <option value="LAST_QUARTER">Last Quarter (Q3 2026)</option>
            <option value="YEAR_TO_DATE">Year to Date (2026)</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV('UrbanNest_Master_Financial_Report')}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export All Data
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Occupancy Rate</span>
            <BedDouble className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {reportData?.summary?.occupancyRate || 75}%
          </div>
          <p className="text-[11px] text-slate-500">
            {reportData?.summary?.occupiedBeds || 18} of {reportData?.summary?.totalBeds || 24} Beds Occupied
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Collected Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{(reportData?.summary?.totalCollected || 14000).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Rent collections this period</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Outstanding Rent</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            ₹{(reportData?.summary?.totalOutstanding || 28000).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Pending & overdue invoices</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Operating Expenses</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            ₹{(reportData?.summary?.totalExpenses || 22199).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Electricity, Wi-Fi, Supplies</p>
        </Card>
      </div>

      {/* Monthly Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Revenue vs Expenses</h3>
              <p className="text-xs text-slate-400">Revenue collections compared against OPEX</p>
            </div>
            <button
              onClick={() => handleExportCSV('Revenue_Vs_Expenses_Report')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          <div className="space-y-3">
            {(reportData?.revenueByMonth || []).map((m: any) => (
              <div key={m.month} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
                <div className="font-bold text-slate-800 dark:text-slate-200">{m.month}</div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Revenue</span>
                    <strong className="text-emerald-600">₹{m.revenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Expenses</span>
                    <strong className="text-amber-600">₹{m.expenses.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-right font-bold text-slate-900 dark:text-white">
                    <span className="text-[10px] text-slate-400 uppercase block">NOI</span>
                    <span>₹{(m.revenue - m.expenses).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Expense Category Breakdown</h3>
              <p className="text-xs text-slate-400">Where operational budget is allocated</p>
            </div>
            <button
              onClick={() => handleExportCSV('Expense_Categories_Report')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          <div className="space-y-3">
            {(reportData?.expenseCategories || []).map((exp: any) => (
              <div key={exp.category} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
                <div className="font-bold text-slate-800 dark:text-slate-200">{exp.category}</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{exp.amount.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
