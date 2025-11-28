import React, { useState } from 'react';
import { Document, DocumentStatus, Priority } from '../types';
import { formatDate, getDocumentStatusColor, getPriorityColor } from '../utils';
import { FileText, AlertTriangle, CheckCircle, Clock, ArrowRight, Bell, Plus, X, Save, Upload, Paperclip, Filter } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onUpdateStatus: (id: string, newStatus: DocumentStatus) => void;
  onAddDocument: (doc: Partial<Document>) => void;
}

type FilterType = 'ALL' | 'PENDING' | 'REMINDER';
type DeadlineFilterType = 'ALL' | 'OVERDUE' | 'UPCOMING_3_DAYS';

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onUpdateStatus, onAddDocument }) => {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterType>('ALL');
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

  // Sort: Strictly by deadline (Nearest/Past -> Farthest/Future)
  const sortedDocs = [...documents].sort((a, b) => {
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Filter Logic
  const displayDocs = sortedDocs.filter(doc => {
    // 1. Status Filter
    let matchesStatus = true;
    if (filter === 'PENDING') {
        matchesStatus = doc.status === DocumentStatus.PENDING || doc.status === DocumentStatus.IN_PROGRESS;
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
                <Filter className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                <select 
                    value={deadlineFilter}
                    onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilterType)}
                    className="pl-9 pr-8 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-indigo-500 bg-white text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <option value="ALL">Tất cả thời hạn</option>
                    <option value="UPCOMING_3_DAYS">Trong 3 ngày tới</option>
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
                <th className="px-6 py-4 rounded-tl-lg">Số ký hiệu</th>
                <th className="px-6 py-4 w-1/3">Trích yếu nội dung</th>
                <th className="px-6 py-4">Đơn vị trình</th>
                <th className="px-6 py-4">Độ khẩn</th>
                <th className="px-6 py-4">Hạn xử lý</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 rounded-tr-lg text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-indigo-900 whitespace-nowrap">
                    {doc.code}
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
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm ${getPriorityColor(doc.priority)}`}>
                        {doc.priority}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDate(new Date(doc.deadline))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getDocumentStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {doc.status !== DocumentStatus.COMPLETED ? (
                        <button 
                            onClick={() => onUpdateStatus(doc.id, DocumentStatus.COMPLETED)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1"
                        >
                            Ký duyệt <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <span className="text-gray-400 text-sm italic">Đã hoàn thành</span>
                    )}
                  </td>
                </tr>
              ))}
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