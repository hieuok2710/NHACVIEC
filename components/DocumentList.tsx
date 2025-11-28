
import React, { useState } from 'react';
import { Document, DocumentStatus, Priority } from '../types';
import { formatDate, getDocumentStatusColor } from '../utils';
import { FileText, AlertTriangle, CheckCircle, Clock, ArrowRight, Bell, Plus, X, Save, Upload, Paperclip, Filter, Pencil, RotateCcw, ArrowUp, ArrowDown, ChevronsUpDown, AlertCircle } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onUpdateStatus: (id: string, newStatus: DocumentStatus) => void;
  onAddDocument: (doc: Partial<Document>) => void;
  onEditDocument: (doc: Document) => void;
}

type FilterType = 'ALL' | 'PENDING' | 'COMPLETED' | 'REMINDER';
type DeadlineFilterType = 'ALL' | 'OVERDUE' | 'UPCOMING_3_DAYS';

// Helper function for distinct, accessible priority colors
const getPriorityBadgeColor = (priority: Priority) => {
  switch (priority) {
    case Priority.URGENT:
      return 'bg-red-100 text-red-800 border-red-200';
    case Priority.HIGH:
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case Priority.NORMAL:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case Priority.LOW:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onUpdateStatus, onAddDocument, onEditDocument }) => {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterType>('ALL');
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'deadline', 
    direction: 'asc' 
  });

  // Add State
  const [isAdding, setIsAdding] = useState(false);
  const [fileName, setFileName] = useState('');
  const [newDoc, setNewDoc] = useState<{
    code: string;
    title: string;
    submitter: string;
    deadline: string;
    priority: Priority;
    attachmentUrl?: string;
  }>({
    code: '',
    title: '',
    submitter: '',
    deadline: '',
    priority: Priority.NORMAL,
    attachmentUrl: undefined
  });

  // Edit State
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editFormDeadline, setEditFormDeadline] = useState(''); // Handle date input string separately
  const [editFileName, setEditFileName] = useState('');

  // Sorting Handler
  const handleSort = (key: string) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey: string) => {
      if (sortConfig.key !== columnKey) return <ChevronsUpDown className="w-3 h-3 text-slate-400 opacity-50 group-hover:opacity-100" />;
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-200" /> : <ArrowDown className="w-3 h-3 text-indigo-200" />;
  };

  // Sort Logic
  const sortedDocuments = [...documents].sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.key) {
        case 'priority':
             // Custom sort for Priority Enum
             const pScore = { [Priority.URGENT]: 3, [Priority.HIGH]: 2, [Priority.NORMAL]: 1, [Priority.LOW]: 0 };
             comparison = pScore[a.priority as Priority] - pScore[b.priority as Priority];
             break;
        case 'deadline':
             comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
             break;
        case 'status':
             // Group by status logic: Overdue > Pending > In Progress > Completed
             const sScore = { 
                 [DocumentStatus.OVERDUE]: 0, 
                 [DocumentStatus.PENDING]: 1, 
                 [DocumentStatus.IN_PROGRESS]: 2, 
                 [DocumentStatus.COMPLETED]: 3 
             };
             comparison = sScore[a.status as DocumentStatus] - sScore[b.status as DocumentStatus];
             break;
        case 'code':
             comparison = a.code.localeCompare(b.code);
             break;
        case 'submitter':
             comparison = a.submitter.localeCompare(b.submitter);
             break;
        case 'title':
             comparison = a.title.localeCompare(b.title);
             break;
        default:
             return 0;
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  // Filter Logic applied on Sorted Data
  const displayDocs = sortedDocuments.filter(doc => {
    // 1. Status Filter
    let matchesStatus = true;
    if (filter === 'PENDING') {
        matchesStatus = doc.status === DocumentStatus.PENDING || doc.status === DocumentStatus.IN_PROGRESS;
    } else if (filter === 'COMPLETED') {
        matchesStatus = doc.status === DocumentStatus.COMPLETED;
    } else if (filter === 'REMINDER') {
        // Show urgent priority OR overdue items OR items due soon (within 3 days)
        const isUrgent = doc.priority === Priority.URGENT;
        const isOverdue = doc.status === DocumentStatus.OVERDUE;
        
        // Check if due within next 3 days
        const today = new Date();
        today.setHours(0,0,0,0);
        const deadline = new Date(doc.deadline);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isDueSoon = diffDays >= 0 && diffDays <= 3;

        matchesStatus = isUrgent || isOverdue || isDueSoon;
    }

    // 2. Deadline Filter
    let matchesDeadline = true;
    if (deadlineFilter !== 'ALL') {
        const today = new Date();
        today.setHours(0,0,0,0);
        const deadline = new Date(doc.deadline);
        deadline.setHours(0,0,0,0); // Normalize to start of day for comparison

        if (deadlineFilter === 'OVERDUE') {
            matchesDeadline = deadline < today;
        } else if (deadlineFilter === 'UPCOMING_3_DAYS') {
            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // 0 = today, 1 = tomorrow, 2 = day after, 3 = 3rd day
            matchesDeadline = diffDays >= 0 && diffDays <= 3;
        }
    }

    return matchesStatus && matchesDeadline;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      // Create a fake URL for the uploaded file to simulate attachment
      const url = URL.createObjectURL(file);
      setNewDoc({ ...newDoc, attachmentUrl: url });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim()) return;

    onAddDocument({
        code: newDoc.code || 'Chưa có số',
        title: newDoc.title,
        submitter: newDoc.submitter || 'Đang cập nhật',
        deadline: newDoc.deadline ? new Date(newDoc.deadline) : undefined,
        priority: newDoc.priority,
        attachmentUrl: newDoc.attachmentUrl
    });

    // Reset and close
    setNewDoc({
        code: '',
        title: '',
        submitter: '',
        deadline: '',
        priority: Priority.NORMAL,
        attachmentUrl: undefined
    });
    setFileName('');
    setIsAdding(false);
  };

  // Edit Handlers
  const handleEditClick = (doc: Document) => {
      // Format date for input "YYYY-MM-DD" keeping local time
      const d = new Date(doc.deadline);
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      const deadlineStr = localDate.toISOString().split('T')[0];

      setEditingDoc({ ...doc });
      setEditFormDeadline(deadlineStr);
      // Extract filename from existing url (fake logic) or reset
      setEditFileName(doc.attachmentUrl ? 'Tệp đính kèm hiện tại' : '');
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingDoc) {
      const file = e.target.files[0];
      setEditFileName(file.name);
      const url = URL.createObjectURL(file);
      setEditingDoc({ ...editingDoc, attachmentUrl: url });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDoc || !editingDoc.title.trim()) return;

      onEditDocument({
          ...editingDoc,
          deadline: editFormDeadline ? new Date(editFormDeadline) : editingDoc.deadline
      });

      setEditingDoc(null);
      setEditFormDeadline('');
      setEditFileName('');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Quá hạn</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">
            {documents.filter(d => d.status === DocumentStatus.OVERDUE).length}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Chờ xử lý</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">
            {documents.filter(d => d.status === DocumentStatus.PENDING).length}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Đang xử lý</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">
            {documents.filter(d => d.status === DocumentStatus.IN_PROGRESS).length}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Đã ký/duyệt</span>
          </div>
          <span className="text-3xl font-bold text-gray-800">
            {documents.filter(d => d.status === DocumentStatus.COMPLETED).length}
          </span>
        </div>
      </div>

      {/* Add Document Form */}
      {isAdding && (
          <div className="bg-white rounded-xl border border-indigo-200 shadow-lg p-6 animate-in fade-in slide-in-from-top-4 duration-200">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg text-indigo-700 flex items-center gap-2">
                     <Plus className="w-5 h-5" /> Thêm văn bản mới
                 </h3>
                 <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                     <X className="w-5 h-5" />
                 </button>
             </div>
             <form onSubmit={handleCreate}>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                     <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Số ký hiệu</label>
                         <input 
                             type="text" 
                             placeholder="VD: 123/BC-UBND"
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={newDoc.code}
                             onChange={(e) => setNewDoc({...newDoc, code: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Đơn vị trình</label>
                         <input 
                             type="text" 
                             placeholder="VD: Phòng Tài chính"
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={newDoc.submitter}
                             onChange={(e) => setNewDoc({...newDoc, submitter: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Độ khẩn</label>
                         <select 
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={newDoc.priority}
                             onChange={(e) => setNewDoc({...newDoc, priority: e.target.value as Priority})}
                         >
                             {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Hạn xử lý</label>
                         <input 
                             type="date" 
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={newDoc.deadline}
                             onChange={(e) => setNewDoc({...newDoc, deadline: e.target.value})}
                         />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Trích yếu nội dung *</label>
                        <textarea 
                            rows={2}
                            placeholder="Nhập nội dung văn bản..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                            value={newDoc.title}
                            onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tệp đính kèm (PC)</label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-white border border-gray-300 border-dashed rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700 w-fit">
                                <Upload className="w-4 h-4 text-gray-500" />
                                {fileName || "Chọn tệp từ máy tính..."}
                                <input type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                            {fileName && (
                                <button 
                                    type="button" 
                                    onClick={() => { setFileName(''); setNewDoc({...newDoc, attachmentUrl: undefined}); }}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Xóa tệp"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                     <button 
                         type="button" 
                         onClick={() => setIsAdding(false)}
                         className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                     >
                         Hủy bỏ
                     </button>
                     <button 
                         type="submit" 
                         className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
                     >
                         <Save className="w-4 h-4" /> Lưu văn bản
                     </button>
                 </div>
             </form>
          </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                     <Pencil className="w-5 h-5" /> Chỉnh sửa văn bản
                 </h3>
                 <button onClick={() => setEditingDoc(null)} className="text-white/80 hover:text-white transition-colors">
                     <X className="w-6 h-6" />
                 </button>
             </div>
             
             <form onSubmit={handleSaveEdit} className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Số ký hiệu</label>
                         <input 
                             type="text" 
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={editingDoc.code}
                             onChange={(e) => setEditingDoc({...editingDoc, code: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Đơn vị trình</label>
                         <input 
                             type="text" 
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={editingDoc.submitter}
                             onChange={(e) => setEditingDoc({...editingDoc, submitter: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Độ khẩn</label>
                         <select 
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={editingDoc.priority}
                             onChange={(e) => setEditingDoc({...editingDoc, priority: e.target.value as Priority})}
                         >
                             {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Hạn xử lý</label>
                         <input 
                             type="date" 
                             className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             value={editFormDeadline}
                             onChange={(e) => setEditFormDeadline(e.target.value)}
                         />
                     </div>
                 </div>
                 
                 <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Trích yếu nội dung *</label>
                    <textarea 
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        value={editingDoc.title}
                        onChange={(e) => setEditingDoc({...editingDoc, title: e.target.value})}
                        required
                    />
                 </div>

                 <div className="mb-6">
                     <label className="block text-xs font-medium text-gray-600 mb-1">Cập nhật tệp đính kèm</label>
                     <div className="flex items-center gap-3">
                         <label className="cursor-pointer bg-white border border-gray-300 border-dashed rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700 w-fit">
                             <Upload className="w-4 h-4 text-gray-500" />
                             {editFileName || "Tải lên tệp mới..."}
                             <input type="file" className="hidden" onChange={handleEditFileChange} />
                         </label>
                         {editingDoc.attachmentUrl && (
                             <a href={editingDoc.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">
                                 Xem tệp hiện tại
                             </a>
                         )}
                     </div>
                 </div>

                 <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                     <button 
                         type="button" 
                         onClick={() => setEditingDoc(null)}
                         className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                     >
                         Hủy
                     </button>
                     <button 
                         type="submit" 
                         className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                     >
                         Lưu thay đổi
                     </button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Danh sách văn bản
              </h2>
              {!isAdding && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm mới
                  </button>
              )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
             {/* Deadline Filter */}
             <div className="relative">
                <Filter className={`absolute left-2.5 top-2.5 w-4 h-4 ${deadlineFilter !== 'ALL' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <select 
                    value={deadlineFilter}
                    onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilterType)}
                    className={`pl-9 pr-8 py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-colors ${
                        deadlineFilter !== 'ALL' 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <option value="ALL">Tất cả thời hạn</option>
                    <option value="UPCOMING_3_DAYS">Sắp đến hạn (3 ngày)</option>
                    <option value="OVERDUE">Đã quá hạn</option>
                </select>
             </div>

             {/* Status Filter Buttons */}
             <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                <button 
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    Tất cả
                </button>
                <button 
                    onClick={() => setFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'PENDING' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    Chờ ký
                </button>
                <button 
                    onClick={() => setFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'COMPLETED' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    Đã duyệt
                </button>
                <button 
                    onClick={() => setFilter('REMINDER')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${filter === 'REMINDER' ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100' : 'text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                >
                    <Bell className="w-3 h-3" />
                    Cần nhắc
                </button>
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 text-white text-xs uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg cursor-pointer hover:bg-slate-700 transition-colors group select-none" onClick={() => handleSort('code')}>
                    <div className="flex items-center gap-2">
                        Số ký hiệu
                        {getSortIcon('code')}
                    </div>
                </th>
                <th className="px-6 py-4 w-1/3 cursor-pointer hover:bg-slate-700 transition-colors group select-none" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-2">
                        Trích yếu nội dung
                        {getSortIcon('title')}
                    </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-700 transition-colors group select-none" onClick={() => handleSort('submitter')}>
                    <div className="flex items-center gap-2">
                        Đơn vị trình
                        {getSortIcon('submitter')}
                    </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-700 transition-colors group select-none" onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-2">
                        Độ khẩn
                        {getSortIcon('priority')}
                    </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-700 transition-colors group select-none" onClick={() => handleSort('deadline')}>
                    <div className="flex items-center gap-2">
                        Hạn xử lý
                        {getSortIcon('deadline')}
                    </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-700 transition-colors group select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                        Trạng thái
                        {getSortIcon('status')}
                    </div>
                </th>
                <th className="px-6 py-4 rounded-tr-lg text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayDocs.map((doc) => {
                const isOverdue = doc.status === DocumentStatus.OVERDUE;
                
                // Calculate isDueSoon
                const deadlineDate = new Date(doc.deadline);
                const today = new Date();
                today.setHours(0,0,0,0);
                deadlineDate.setHours(0,0,0,0);
                const diffTime = deadlineDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isDueSoon = !isOverdue && doc.status !== DocumentStatus.COMPLETED && diffDays >= 0 && diffDays <= 3;

                return (
                <tr key={doc.id} className={`hover:bg-slate-50 transition-colors group ${isOverdue ? 'bg-red-50/30' : isDueSoon ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        {isOverdue && (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm" title="Văn bản quá hạn"></div>
                        )}
                        <span className="font-semibold text-indigo-900">{doc.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-relaxed" title={doc.title}>
                        {doc.title}
                        </p>
                        {doc.attachmentUrl && (
                            <a 
                                href={doc.attachmentUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline w-fit"
                            >
                                <Paperclip className="w-3 h-3" />
                                Xem tài liệu
                            </a>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.submitter}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm ${getPriorityBadgeColor(doc.priority)}`}>
                        {doc.priority}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${isOverdue ? 'text-red-600 font-bold' : isDueSoon ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>
                      <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-gray-400'}`} />
                      {formatDate(new Date(doc.deadline))}
                      {isDueSoon && (
                         <span title="Sắp đến hạn" className="flex items-center justify-center bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 ml-1 text-[10px] font-bold">
                            Sắp hạn
                         </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getDocumentStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleEditClick(doc)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        {doc.status !== DocumentStatus.COMPLETED ? (
                            <button 
                                onClick={() => onUpdateStatus(doc.id, DocumentStatus.COMPLETED)}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1"
                                title="Đánh dấu đã xử lý xong"
                            >
                                Ký duyệt <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button 
                                onClick={() => onUpdateStatus(doc.id, DocumentStatus.PENDING)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1 group/undo"
                                title="Thu hồi / Đưa về chờ xử lý"
                            >
                                <RotateCcw className="w-3.5 h-3.5 group-hover/undo:-rotate-180 transition-transform" /> Thu hồi
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              )})}
              {displayDocs.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                            <p>Không tìm thấy văn bản nào trong mục này.</p>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
