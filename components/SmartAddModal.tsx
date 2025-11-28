
import React, { useState } from 'react';
import { CalendarEvent, EventType, Document, Priority } from '../types';
import { X, Calendar, MapPin, AlignLeft, Clock, FileText, Building2, AlertTriangle, Hash, ScanLine, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { formatTime } from '../utils';
import { extractScheduleFromImage } from '../services/gemini';

interface SmartAddModalProps {
  onClose: () => void;
  onAddEvent: (event: Partial<CalendarEvent>) => void;
  onAddMultipleEvents?: (events: Partial<CalendarEvent>[]) => void;
  onAddDocument: (doc: Partial<Document>) => void;
  events?: CalendarEvent[];
}

type Tab = 'EVENT' | 'DOCUMENT' | 'SCAN';

export const SmartAddModal: React.FC<SmartAddModalProps> = ({ onClose, onAddEvent, onAddMultipleEvents, onAddDocument, events }) => {
  const [activeTab, setActiveTab] = useState<Tab>('EVENT');
  
  // Conflict Warning State
  const [showConflictConfirm, setShowConflictConfirm] = useState(false);
  const [conflictingEvent, setConflictingEvent] = useState<CalendarEvent | null>(null);

  // Scan State
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedEvents, setScannedEvents] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string>('');

  // Event Form State
  const [eventData, setEventData] = useState({
    title: '',
    start: '',
    end: '',
    type: EventType.MEETING,
    priority: Priority.NORMAL,
    location: '',
    description: ''
  });

  // Document Form State
  const [docData, setDocData] = useState({
    code: '',
    title: '',
    submitter: '',
    deadline: '',
    priority: Priority.NORMAL,
  });

  const handleEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDocData(prev => ({ ...prev, [name]: value }));
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.title || !eventData.start || !eventData.end) return;

    const newStart = new Date(eventData.start);
    const newEnd = new Date(eventData.end);

    // Conflict Check (Overlapping High/Urgent Events)
    if (!showConflictConfirm && events) {
        const conflict = events.find(ev => {
            const evStart = new Date(ev.start);
            const evEnd = new Date(ev.end);
            
            const isOverlapping = newStart < evEnd && newEnd > evStart;
            const isHighPriority = ev.priority === Priority.URGENT || ev.priority === Priority.HIGH;

            return isOverlapping && isHighPriority;
        });

        if (conflict) {
            setConflictingEvent(conflict);
            setShowConflictConfirm(true);
            return;
        }
    }

    onAddEvent({
      title: eventData.title,
      start: newStart,
      end: newEnd,
      type: eventData.type as EventType,
      priority: eventData.priority as Priority,
      location: eventData.location,
      description: eventData.description
    });
    onClose();
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docData.title) return;

    onAddDocument({
        code: docData.code,
        title: docData.title,
        submitter: docData.submitter,
        deadline: docData.deadline ? new Date(docData.deadline) : undefined,
        priority: docData.priority as Priority
    });
    onClose();
  };

  // --- SCAN Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScanFile(e.target.files[0]);
      setScanError('');
      setScannedEvents([]);
    }
  };

  const handleScan = async () => {
    if (!scanFile) return;
    setIsScanning(true);
    setScanError('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(scanFile);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = scanFile.type;

        try {
            const results = await extractScheduleFromImage(base64String, mimeType);
            setScannedEvents(results);
        } catch (err: any) {
             setScanError('Lỗi khi phân tích hình ảnh: ' + (err.message || 'Không xác định'));
        } finally {
            setIsScanning(false);
        }
      };
      reader.onerror = () => {
        setScanError("Lỗi đọc file.");
        setIsScanning(false);
      }
    } catch (e) {
      setScanError("Có lỗi xảy ra.");
      setIsScanning(false);
    }
  };

  const handleImportScanned = () => {
      if (!onAddMultipleEvents) return;
      
      const eventsToImport = scannedEvents.map(item => {
          // Parse date and time string to Date objects
          // Assuming item.day is YYYY-MM-DD or DD/MM/YYYY
          // Assuming item.time is HH:MM
          let datePart = item.day;
          if (datePart.includes('/')) {
              const parts = datePart.split('/');
              if (parts.length === 3) datePart = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          
          const startStr = `${datePart}T${item.time}:00`;
          const startDate = new Date(startStr);
          const duration = item.durationMinutes || 90;
          const endDate = new Date(startDate.getTime() + duration * 60000);

          return {
              title: item.title,
              start: startDate,
              end: endDate,
              location: item.location,
              type: mapType(item.type),
              priority: mapPriority(item.priority),
              description: "Được quét tự động từ lịch tuần."
          }
      });

      onAddMultipleEvents(eventsToImport);
      onClose();
  };

  const mapType = (str: string): EventType => {
      const lower = (str || '').toLowerCase();
      if (lower.includes('họp')) return EventType.MEETING;
      if (lower.includes('công tác') || lower.includes('đi')) return EventType.BUSINESS_TRIP;
      if (lower.includes('văn bản') || lower.includes('ký')) return EventType.DEEP_WORK;
      return EventType.EVENT;
  };

  const mapPriority = (str: string): Priority => {
      const lower = (str || '').toLowerCase();
      if (lower.includes('khẩn') || lower.includes('gấp')) return Priority.URGENT;
      if (lower.includes('quan trọng') || lower.includes('cao')) return Priority.HIGH;
      return Priority.NORMAL;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">
        
        {/* Conflict Warning Overlay */}
        {showConflictConfirm && conflictingEvent && (
            <div className="absolute inset-0 bg-white/98 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 animate-pulse">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Cảnh báo trùng lịch</h3>
                <p className="text-gray-500 mb-6 text-sm">
                    Thời gian bạn chọn trùng với một sự kiện quan trọng đã có trong lịch trình.
                </p>
                
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 w-full mb-8 text-left shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800 border border-red-300">
                            {conflictingEvent.priority}
                        </span>
                        <span className="text-xs text-red-700 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(new Date(conflictingEvent.start))} - {formatTime(new Date(conflictingEvent.end))}
                        </span>
                    </div>
                    <h4 className="font-bold text-red-900 text-sm mt-1">{conflictingEvent.title}</h4>
                    {conflictingEvent.location && (
                        <p className="text-xs text-red-700 mt-1 flex items-center gap-1">
                           📍 {conflictingEvent.location}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setShowConflictConfirm(false)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                        Quay lại chỉnh sửa
                    </button>
                    <button 
                        onClick={handleEventSubmit}
                        className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 text-sm"
                    >
                        Vẫn thêm
                    </button>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex justify-between items-center flex-none">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {activeTab === 'EVENT' && <Calendar className="w-5 h-5" />}
            {activeTab === 'DOCUMENT' && <FileText className="w-5 h-5" />}
            {activeTab === 'SCAN' && <ScanLine className="w-5 h-5" />}
            
            {activeTab === 'EVENT' && 'Thêm sự kiện mới'}
            {activeTab === 'DOCUMENT' && 'Thêm văn bản mới'}
            {activeTab === 'SCAN' && 'Quét lịch công tác'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 p-2 flex gap-2 border-b border-gray-100 flex-none">
            <button 
                onClick={() => setActiveTab('EVENT')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'EVENT' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:bg-gray-200'}`}
            >
                <Calendar className="w-4 h-4" /> Sự kiện
            </button>
            <button 
                onClick={() => setActiveTab('DOCUMENT')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'DOCUMENT' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:bg-gray-200'}`}
            >
                <FileText className="w-4 h-4" /> Văn bản
            </button>
            <button 
                onClick={() => setActiveTab('SCAN')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'SCAN' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:bg-gray-200'}`}
            >
                <ScanLine className="w-4 h-4" /> Quét lịch
            </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'EVENT' && (
              // --- EVENT FORM ---
              <form onSubmit={handleEventSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Tiêu đề sự kiện *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={eventData.title}
                    onChange={handleEventChange}
                    placeholder="Ví dụ: Họp giao ban"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Bắt đầu *</label>
                    <input
                        type="datetime-local"
                        name="start"
                        required
                        value={eventData.start}
                        onChange={handleEventChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Kết thúc *</label>
                    <input
                        type="datetime-local"
                        name="end"
                        required
                        value={eventData.end}
                        onChange={handleEventChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Loại sự kiện</label>
                    <select
                      name="type"
                      value={eventData.type}
                      onChange={handleEventChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    >
                      {Object.values(EventType).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Mức độ ưu tiên</label>
                    <select
                      name="priority"
                      value={eventData.priority}
                      onChange={handleEventChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    >
                      {Object.values(Priority).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Địa điểm</label>
                  <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                          type="text"
                          name="location"
                          value={eventData.location}
                          onChange={handleEventChange}
                          placeholder="Phòng họp A"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Ghi chú</label>
                  <div className="relative">
                    <AlignLeft className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <textarea
                        name="description"
                        value={eventData.description}
                        onChange={handleEventChange}
                        rows={2}
                        placeholder="Chi tiết nội dung..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                  >
                    Lưu sự kiện
                  </button>
                </div>
              </form>
          )}

          {activeTab === 'DOCUMENT' && (
              // --- DOCUMENT FORM ---
              <form onSubmit={handleDocSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Số ký hiệu</label>
                        <div className="relative">
                            <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                name="code"
                                value={docData.code}
                                onChange={handleDocChange}
                                placeholder="VD: 123/BC"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Độ khẩn</label>
                        <select
                            name="priority"
                            value={docData.priority}
                            onChange={handleDocChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        >
                            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Trích yếu nội dung *</label>
                    <textarea
                        name="title"
                        required
                        value={docData.title}
                        onChange={handleDocChange}
                        rows={3}
                        placeholder="Nội dung chính của văn bản..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Đơn vị trình</label>
                        <div className="relative">
                            <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                name="submitter"
                                value={docData.submitter}
                                onChange={handleDocChange}
                                placeholder="Phòng/Ban"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Hạn xử lý</label>
                        <div className="relative">
                            <input
                                type="date"
                                name="deadline"
                                value={docData.deadline}
                                onChange={handleDocChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                            />
                        </div>
                      </div>
                  </div>

                  <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                    >
                        Lưu văn bản
                    </button>
                  </div>
              </form>
          )}

          {activeTab === 'SCAN' && (
             <div className="space-y-6">
                 {!scannedEvents.length ? (
                     <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                            {isScanning ? <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /> : <Upload className="w-8 h-8 text-indigo-600" />}
                        </div>
                        
                        {isScanning ? (
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Đang phân tích hình ảnh...</h3>
                                <p className="text-sm text-gray-500 mt-2">Vui lòng đợi trong giây lát, AI đang đọc lịch công tác của bạn.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-gray-800">Tải lên lịch công tác</h3>
                                <p className="text-sm text-gray-500 mt-2 mb-6 max-w-xs mx-auto">Chụp ảnh hoặc tải lên file ảnh (JPG, PNG) chứa bảng lịch tuần để hệ thống tự động quét.</p>
                                
                                <label className="cursor-pointer bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                                    <Upload className="w-4 h-4" /> Chọn ảnh lịch
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                                </label>
                            </>
                        )}

                        {scanFile && !isScanning && (
                            <div className="mt-4 p-3 bg-gray-100 rounded-lg flex items-center gap-2 text-sm text-gray-700">
                                <FileText className="w-4 h-4" /> {scanFile.name}
                                <button onClick={handleScan} className="ml-2 text-indigo-600 font-bold hover:underline">Bắt đầu quét</button>
                            </div>
                        )}

                        {scanError && (
                            <div className="mt-4 text-red-600 text-sm font-medium flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> {scanError}
                            </div>
                        )}
                     </div>
                 ) : (
                     <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Đã tìm thấy {scannedEvents.length} sự kiện
                            </h3>
                            <button onClick={() => setScannedEvents([])} className="text-sm text-gray-500 hover:text-gray-700">Quét lại</button>
                         </div>
                         
                         <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto p-2 space-y-2">
                             {scannedEvents.map((item, idx) => (
                                 <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex gap-3">
                                     <div className="text-center min-w-[60px] border-r border-gray-100 pr-3">
                                         <div className="text-xs font-bold text-indigo-600">{item.time}</div>
                                         <div className="text-[10px] text-gray-500">{item.day}</div>
                                     </div>
                                     <div className="flex-1">
                                         <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                         <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                             {item.location && <span>📍 {item.location}</span>}
                                             <span className="bg-gray-100 px-1.5 rounded">{item.type}</span>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>

                         <div className="flex gap-3 justify-end pt-2">
                             <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                             >
                                Hủy
                             </button>
                             <button
                                type="button"
                                onClick={handleImportScanned}
                                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
                             >
                                Nhập vào lịch
                             </button>
                         </div>
                     </div>
                 )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
