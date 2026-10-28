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
import { downloadCsv } from '../../utils/csv';

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
    if (!reportData) {
      setToastMessage('Report data is still loading...');
      return;
    }

    try {
      if (reportName === 'Revenue_Vs_Expenses_Report') {
        const headers = ['Month', 'Revenue Collected (INR)', 'Operating Expenses (INR)', 'Net Operating Income (INR)'];
        const rows = (reportData.revenueByMonth || []).map((m: any) => [
          m.month,
          m.revenue,
          m.expenses,
          m.revenue - m.expenses,
        ]);
        downloadCsv('Revenue_Vs_Expenses_Report', headers, rows);
      } else if (reportName === 'Expense_Categories_Report') {
        const totalExp = (reportData.expenseCategories || []).reduce((acc: number, c: any) => acc + (c.amount || 0), 0);
        const headers = ['Expense Category', 'Total Amount (INR)', 'Share of OPEX (%)'];
        const rows = (reportData.expenseCategories || []).map((c: any) => [
          c.category,
          c.amount,
          totalExp > 0 ? `${Math.round((c.amount / totalExp) * 100)}%` : '0%',
        ]);
        downloadCsv('Expense_Categories_Report', headers, rows);
      } else {
        // Master Financial Report
        const headers = ['Report Section', 'Metric / Item', 'Value (INR / Count)', 'Notes'];
        const rows = [
          ['Executive Summary', 'Occupancy Rate', `${reportData.summary?.occupancyRate || 0}%`, `${reportData.summary?.occupiedBeds || 0} of ${reportData.summary?.totalBeds || 0} beds occupied`],
          ['Executive Summary', 'Total Collected Revenue', reportData.summary?.totalCollected || 0, 'Settled rent & utility invoices'],
          ['Executive Summary', 'Outstanding Rent', reportData.summary?.totalOutstanding || 0, 'Pending or overdue invoices'],
          ['Executive Summary', 'Total Operating Expenses', reportData.summary?.totalExpenses || 0, 'OPEX bills settled'],
          ['Executive Summary', 'Net Operating Income (NOI)', reportData.summary?.netProfit || 0, 'Revenue minus OPEX'],
          ...((reportData.revenueByMonth || []).map((m: any) => [
            'Monthly Trend',
            m.month,
            `Rev: ₹${m.revenue} | Exp: ₹${m.expenses}`,
            `Net: ₹${m.revenue - m.expenses}`,
          ])),
          ...((reportData.expenseCategories || []).map((c: any) => [
            'Expense Breakdown',
            c.category,
            c.amount,
            'Categorized OPEX disbursement',
          ])),
        ];
        downloadCsv('UrbanNest_Master_Financial_Report', headers, rows);
      }

      setToastMessage(`${reportName}.csv downloaded successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      setToastMessage('Failed to generate CSV export.');
    }
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
            <option value="THIS_MONTH">Current Month ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</option>
            <option value="LAST_QUARTER">Last Quarter</option>
            <option value="YEAR_TO_DATE">Year to Date ({new Date().getFullYear()})</option>
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
            <BedDouble className="w-4 h-4 text-[#0B4036] dark:text-[#C8A45D]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {reportData?.summary?.occupancyRate || 0}%
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{reportData?.summary?.occupiedBeds || 0} Occupied</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">{reportData?.summary?.availableBeds || 0} Available</span>
            {(reportData?.summary?.maintenanceBeds || 0) > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 font-medium">{reportData?.summary?.maintenanceBeds} Maintenance</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Collected Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{(reportData?.summary?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Rent collections this period</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Outstanding Rent</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            ₹{(reportData?.summary?.totalOutstanding || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Pending & overdue invoices</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Operating Expenses</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            ₹{(reportData?.summary?.totalExpenses || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Electricity, Wi-Fi, Supplies</p>
        </Card>
      </div>

      {/* Secondary Unit Economics & Efficiency KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RevPAB (Per Available Bed)</p>
          <p className="text-xl font-extrabold text-[#0B4036] dark:text-[#C8A45D] mt-1">
            ₹{(reportData?.summary?.revPAB || 0).toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/mo</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total yield across all active beds</p>
        </Card>

        <Card className="p-4 bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Realized Rent</p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            ₹{(reportData?.summary?.avgRentPerBed || 0).toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/mo</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Average collection per occupied bed</p>
        </Card>

        <Card className="p-4 bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Efficiency Rate</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            {reportData?.summary?.collectionRate || 100}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Ratio of billed rent collected</p>
        </Card>

        <Card className="p-4 bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OPEX Budget Variance</p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            ₹{Math.abs(reportData?.summary?.opexVariance || 0).toLocaleString('en-IN')}
          </p>
          <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded mt-0.5 ${
            (reportData?.summary?.opexVariance || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {(reportData?.summary?.opexVariance || 0) >= 0 ? 'Under Benchmark Budget' : 'Exceeds Benchmark Budget'}
          </span>
        </Card>
      </div>

      {/* AI Business Intelligence & Tenant Recommendations */}
      {reportData?.aiInsights && reportData.aiInsights.length > 0 && (
        <Card className="p-5 border-l-4 border-l-[#0B4036] bg-gradient-to-r from-emerald-50/40 to-slate-50 dark:from-slate-900 dark:to-slate-900/60">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-[#0B4036] dark:text-[#C8A45D]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Tenant-Scoped AI Recommendations & Forecasts
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportData.aiInsights.map((insight: any, idx: number) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    insight.type === 'ACTUAL'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      : insight.type === 'ESTIMATE'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                  }`}>
                    {insight.type}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{insight.label}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{insight.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rent Aging Analysis & Cash Flow Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Rent Aging Analysis */}
        <Card className="p-6 space-y-4">
          <div className="border-b pb-3 border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Outstanding Rent Aging Analysis</h3>
              <p className="text-xs text-slate-400">Aging schedule of unpaid and delayed invoices</p>
            </div>
            <span className="text-xs font-bold text-rose-600">
              ₹{(reportData?.summary?.totalOutstanding || 0).toLocaleString('en-IN')} Total
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Current (Not Yet Overdue)', data: reportData?.aging?.current, color: 'bg-emerald-500' },
              { label: '1 - 30 Days Overdue', data: reportData?.aging?.days1To30, color: 'bg-amber-400' },
              { label: '31 - 60 Days Overdue', data: reportData?.aging?.days31To60, color: 'bg-amber-600' },
              { label: '61 - 90 Days Overdue', data: reportData?.aging?.days61To90, color: 'bg-rose-500' },
              { label: '90+ Days Overdue (Critical)', data: reportData?.aging?.daysOver90, color: 'bg-rose-700' },
            ].map((bucket, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{bucket.label}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{(bucket.data?.amount || 0).toLocaleString('en-IN')} ({bucket.data?.count || 0} invoices)
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${bucket.color} h-1.5 rounded-full`}
                    style={{
                      width: `${
                        (reportData?.summary?.totalOutstanding || 0) > 0
                          ? Math.min(100, Math.round(((bucket.data?.amount || 0) / (reportData?.summary?.totalOutstanding || 1)) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Operating Cash Flow Summary */}
        <Card className="p-6 space-y-4">
          <div className="border-b pb-3 border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Operating Cash Flow Summary</h3>
            <p className="text-xs text-slate-400">Net operating cash inflow vs outflow for reporting period</p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase">Operating Cash Inflow</p>
                <p className="text-[11px] text-slate-500">Collected tenant rent and utility allocations</p>
              </div>
              <p className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-400">
                +₹{(reportData?.cashFlow?.operatingInflow || reportData?.summary?.totalCollected || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-700 dark:text-rose-300 font-bold uppercase">Operating Cash Outflow</p>
                <p className="text-[11px] text-slate-500">Disbursed OPEX, maintenance, groceries & bills</p>
              </div>
              <p className="text-xl font-mono font-black text-rose-700 dark:text-rose-400">
                -₹{(reportData?.cashFlow?.operatingOutflow || reportData?.summary?.totalExpenses || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase">Net Operating Cash Flow</p>
                <p className="text-[11px] text-slate-500">Surplus cash generated after OPEX disbursements</p>
              </div>
              <p className="text-2xl font-mono font-black text-indigo-800 dark:text-indigo-300">
                ₹{((reportData?.cashFlow?.operatingInflow || 0) - (reportData?.cashFlow?.operatingOutflow || 0)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
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
              className="text-xs text-[#0B4036] dark:text-[#C8A45D] hover:underline flex items-center gap-1 font-semibold"
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
              className="text-xs text-[#0B4036] dark:text-[#C8A45D] hover:underline flex items-center gap-1 font-semibold"
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
