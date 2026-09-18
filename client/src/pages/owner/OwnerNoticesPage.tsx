import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Send,
  Pin,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';

export const OwnerNoticesPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    category: 'GENERAL',
    priority: 'NORMAL',
    target: 'ALL_RESIDENTS',
    content: '',
    isImportant: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const res = await ownerApi.getNotices(activeProperty?.id);
      setNotices(res.data || []);
    } catch (err: any) {
      console.error('Failed to load notices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [activeProperty]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      showToast('Please fill in title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      await ownerApi.createNotice({
        propertyId: activeProperty?.id,
        title: noticeForm.title.trim(),
        content: noticeForm.content.trim(),
        category: noticeForm.category,
        priority: noticeForm.priority,
        target: noticeForm.target,
        isImportant: noticeForm.priority === 'URGENT' || noticeForm.isImportant,
      });
      showToast('Announcement broadcasted successfully!');
      setCreateModalOpen(false);
      setNoticeForm({
        title: '',
        category: 'GENERAL',
        priority: 'NORMAL',
        target: 'ALL_RESIDENTS',
        content: '',
        isImportant: false,
      });
      fetchNotices();
    } catch (err: any) {
      showToast(err.message || 'Failed to broadcast notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotice) return;
    setIsSubmitting(true);
    try {
      await ownerApi.updateNotice(selectedNotice.id, {
        title: noticeForm.title.trim(),
        content: noticeForm.content.trim(),
        category: noticeForm.category,
        priority: noticeForm.priority,
      });
      showToast('Notice updated successfully!');
      setEditModalOpen(false);
      setSelectedNotice(null);
      fetchNotices();
    } catch (err: any) {
      showToast(err.message || 'Failed to update notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveNotice = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this notice?')) return;
    try {
      await ownerApi.archiveNotice(id);
      showToast('Notice archived.');
      fetchNotices();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive notice');
    }
  };

  const handleOpenEdit = (notice: any) => {
    setSelectedNotice(notice);
    setNoticeForm({
      title: notice.title || '',
      category: notice.category || 'GENERAL',
      priority: notice.priority || 'NORMAL',
      target: notice.target || 'ALL_RESIDENTS',
      content: notice.content || '',
      isImportant: notice.isImportant || false,
    });
    setEditModalOpen(true);
  };

  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || n.category === categoryFilter;
    const matchesPriority = priorityFilter === 'ALL' || n.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0B4036] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#C8A45D]/40 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C8A45D]" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0B4036] dark:text-[#C8A45D]" />
            Noticeboard & Announcements
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Broadcast official circulars, maintenance alerts, and policy updates to {activeProperty?.name || 'your property'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchNotices} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-[#0B4036] hover:bg-[#08332c] text-white"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post Announcement
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="p-4 border-[#DDE2DD]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>

          <Select
            label=""
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Categories' },
              { value: 'GENERAL', label: 'General Announcement' },
              { value: 'MAINTENANCE', label: 'Maintenance & Utilities' },
              { value: 'RULES', label: 'PG Rules & Regulations' },
              { value: 'PAYMENT', label: 'Rent & Payments' },
              { value: 'EVENT', label: 'Festivals & Events' },
              { value: 'EMERGENCY', label: 'Emergency Notice' },
            ]}
          />

          <Select
            label=""
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Priorities' },
              { value: 'NORMAL', label: 'Normal' },
              { value: 'IMPORTANT', label: 'Important' },
              { value: 'URGENT', label: 'Urgent Alert' },
            ]}
          />
        </div>
      </Card>

      {/* Notices Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[#DDE2DD] bg-[#FCFBF8] space-y-3">
          <Pin className="w-10 h-10 text-[#8A928D] mx-auto" />
          <h3 className="text-sm font-bold text-[#18231F]">No Announcements Published</h3>
          <p className="text-xs text-[#68736D] max-w-sm mx-auto">
            Broadcast your first digital notice to keep residents informed about water schedules, rent reminders, or house rules.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="bg-[#0B4036] text-white mt-2"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Notice
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotices.map((n) => {
            const isUrgent = n.priority === 'URGENT' || n.isImportant;
            return (
              <Card
                key={n.id}
                className={`p-5 space-y-3 border transition-all ${
                  isUrgent
                    ? 'border-rose-300 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-[#DDE2DD] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#18231F] dark:text-white">
                        {n.title}
                      </span>
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#68736D]">
                      <span className="px-2 py-0.5 rounded bg-[#FAF5EB] text-[#B9954E] border border-[#C8A45D]/30 font-semibold text-[10px]">
                        {n.category || 'GENERAL'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(n.createdAt || n.publishedAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(n)}
                      className="p-1.5 text-[#68736D] hover:text-[#0B4036] rounded-lg hover:bg-[#EAF2EE] transition-colors"
                      title="Edit Notice"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchiveNotice(n.id)}
                      className="p-1.5 text-[#68736D] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Archive Notice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#18231F] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {n.content}
                </p>

                <div className="pt-2 border-t border-[#DDE2DD] flex justify-between items-center text-[10px] text-[#8A928D]">
                  <span>Target: {n.target === 'ALL_RESIDENTS' ? 'All Active Residents' : n.target || 'General'}</span>
                  <span>Published by PG Admin</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Notice Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Post New Announcement"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <Input
            label="Notice Title"
            placeholder="e.g. Scheduled Water Tank Cleaning on Sunday"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={noticeForm.category}
              onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
              options={[
                { value: 'GENERAL', label: 'General Announcement' },
                { value: 'MAINTENANCE', label: 'Maintenance / Utilities' },
                { value: 'RULES', label: 'Rules & Policy' },
                { value: 'PAYMENT', label: 'Rent & Payments' },
                { value: 'EVENT', label: 'Social & Event' },
                { value: 'EMERGENCY', label: 'Emergency Alert' },
              ]}
            />

            <Select
              label="Priority Level"
              value={noticeForm.priority}
              onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
              options={[
                { value: 'NORMAL', label: 'Normal' },
                { value: 'IMPORTANT', label: 'Important' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#18231F]">Notice Body</label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement details here..."
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#0B4036] text-white"
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Broadcast Notice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Notice Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Notice"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateNotice} className="space-y-4">
          <Input
            label="Notice Title"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={noticeForm.category}
              onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
              options={[
                { value: 'GENERAL', label: 'General Announcement' },
                { value: 'MAINTENANCE', label: 'Maintenance / Utilities' },
                { value: 'RULES', label: 'Rules & Policy' },
                { value: 'PAYMENT', label: 'Rent & Payments' },
                { value: 'EVENT', label: 'Social & Event' },
              ]}
            />

            <Select
              label="Priority Level"
              value={noticeForm.priority}
              onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
              options={[
                { value: 'NORMAL', label: 'Normal' },
                { value: 'IMPORTANT', label: 'Important' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#18231F]">Notice Body</label>
            <textarea
              rows={4}
              required
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" className="bg-[#0B4036] text-white" type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OwnerNoticesPage;
