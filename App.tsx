
import React, { useState, useRef } from 'react';
import { ViewMode, CalendarEvent, Task, EventType, Priority, Document, DocumentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { Calendar } from './components/Calendar';
import { TaskList } from './components/TaskList';
import { DocumentList } from './components/DocumentList';
import { SmartAddModal } from './components/SmartAddModal';
import { FloatingNotifier } from './components/FloatingNotifier';
import { LayoutDashboard, Calendar as CalIcon, CalendarDays, CheckSquare, Plus, Bell, FileText, ChevronRight, Briefcase, Database, Download, Upload, ChevronDown, Settings, Palette, X } from 'lucide-react';

// Simple ID generator for this environment
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default Colors
const DEFAULT_EVENT_COLORS: Record<EventType, string> = {
  [EventType.MEETING]: '#3b82f6',      // Blue
  [EventType.BUSINESS_TRIP]: '#9333ea', // Purple
  [EventType.EVENT]: '#d97706',         // Amber
  [EventType.PERSONAL]: '#16a34a',      // Green
  [EventType.DEEP_WORK]: '#475569'      // Slate
};

// Mock Data
const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Họp giao ban đầu tuần',
    start: new Date(new Date().setHours(8, 0, 0, 0)),
    end: new Date(new Date().setHours(9, 30, 0, 0)),
    type: EventType.MEETING,
    priority: Priority.URGENT,
    location: 'Phòng họp A'
  },
  {
    id: '2',
    title: 'Tiếp đối tác Samsung',
    start: new Date(new Date().setHours(14, 0, 0, 0)),
    end: new Date(new Date().setHours(15, 30, 0, 0)),
    type: EventType.EVENT,
    priority: Priority.HIGH,
    location: 'Sảnh VIP'
  },
  {
    id: '3',
    title: 'Duyệt hồ sơ thầu',
    start: new Date(new Date().setHours(16, 0, 0, 0)),
    end: new Date(new Date().setHours(17, 30, 0, 0)),
    type: EventType.DEEP_WORK,
    priority: Priority.NORMAL,
  }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Phê duyệt ngân sách Q4',
    priority: Priority.URGENT,
    completed: false,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1))
  },
  {
    id: 't2',
    title: 'Chuẩn bị bài phát biểu hội nghị',
    priority: Priority.HIGH,
    completed: false,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 3))
  },
  {
    id: 't3',
    title: 'Ký quyết định nhân sự',
    priority: Priority.NORMAL,
    completed: true,
  }
];

const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    code: '154/BC-UBND',
    title: 'Báo cáo tình hình kinh tế xã hội tháng 10',
    submitter: 'Văn phòng UBND',
    deadline: new Date(new Date().setDate(new Date().getDate() + 2)),
    status: DocumentStatus.PENDING,
    priority: Priority.HIGH
  },
  {
    id: 'd2',
    code: 'KH-05/TTr',
    title: 'Kế hoạch thanh tra diện rộng năm 2024',
    submitter: 'Thanh tra Tỉnh',
    deadline: new Date(new Date().setDate(new Date().getDate() - 1)), // Overdue
    status: DocumentStatus.OVERDUE,
    priority: Priority.URGENT
  },
  {
    id: 'd3',
    code: 'TT-23/STC',
    title: 'Tờ trình phê duyệt kinh phí mua sắm trang thiết bị',
    submitter: 'Sở Tài chính',
    deadline: new Date(new Date().setDate(new Date().getDate() + 5)),
    status: DocumentStatus.IN_PROGRESS,
    priority: Priority.NORMAL
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [isSmartAddOpen, setIsSmartAddOpen] = useState(false);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isColorSettingsOpen, setIsColorSettingsOpen] = useState(false);
  
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [eventColors, setEventColors] = useState<Record<EventType, string>>(DEFAULT_EVENT_COLORS);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleTaskToggle = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (task: Partial<Task>) => {
    const newTask: Task = {
      id: generateId(),
      title: task.title || 'Việc mới',
      priority: task.priority || Priority.NORMAL,
      completed: false,
      dueDate: task.dueDate,
      assignee: task.assignee
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleAddEvent = (event: Partial<CalendarEvent>) => {
    const newEvent: CalendarEvent = {
        id: generateId(),
        title: event.title || 'Sự kiện mới',
        start: event.start || new Date(),
        end: event.end || new Date(new Date().getTime() + 3600000),
        type: event.type || EventType.MEETING,
        priority: event.priority || Priority.NORMAL,
        location: event.location,
        description: event.description
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const handleAddMultipleEvents = (newEvents: Partial<CalendarEvent>[]) => {
    const formattedEvents: CalendarEvent[] = newEvents.map(e => ({
        id: generateId(),
        title: e.title || 'Sự kiện quét được',
        start: e.start || new Date(),
        end: e.end || new Date(new Date().getTime() + 3600000),
        type: e.type || EventType.EVENT,
        priority: e.priority || Priority.NORMAL,
        location: e.location,
        description: e.description
    }));
    setEvents(prev => [...prev, ...formattedEvents]);
  };

  const handleUpdateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleAddDocument = (doc: Partial<Document>) => {
    const newDoc: Document = {
        id: generateId(),
        code: doc.code || '---',
        title: doc.title || 'Văn bản mới',
        submitter: doc.submitter || 'Đang cập nhật',
        deadline: doc.deadline || new Date(),
        status: DocumentStatus.PENDING,
        priority: doc.priority || Priority.NORMAL,
        attachmentUrl: doc.attachmentUrl
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const handleUpdateDocStatus = (id: string, newStatus: DocumentStatus) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
  };

  const handleEditDocument = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  // Color Settings Handler
  const handleColorChange = (type: EventType, color: string) => {
    setEventColors(prev => ({ ...prev, [type]: color }));
  };

  const handleResetColors = () => {
    setEventColors(DEFAULT_EVENT_COLORS);
  };

  // --- Backup & Restore Logic ---
  const handleBackup = () => {
    const data = {
      events,
      tasks,
      documents,
      eventColors, // Save colors too
      exportDate: new Date().toISOString()
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaderflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // Validate and restore Dates (JSON strings -> Date objects)
        if (data.events && Array.isArray(data.events)) {
          const restoredEvents = data.events.map((ev: any) => ({
            ...ev,
            start: new Date(ev.start),
            end: new Date(ev.end)
          }));
          setEvents(restoredEvents);
        }

        if (data.tasks && Array.isArray(data.tasks)) {
          const restoredTasks = data.tasks.map((t: any) => ({
            ...t,
            dueDate: t.dueDate ? new Date(t.dueDate) : undefined
          }));
          setTasks(restoredTasks);
        }

        if (data.documents && Array.isArray(data.documents)) {
          const restoredDocs = data.documents.map((d: any) => ({
            ...d,
            deadline: new Date(d.deadline)
          }));
          setDocuments(restoredDocs);
        }

        if (data.eventColors) {
            setEventColors(data.eventColors);
        }

        alert('Phục hồi dữ liệu thành công!');
      } catch (error) {
        console.error('Error parsing backup file:', error);
        alert('Lỗi: File sao lưu không hợp lệ.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // View Routing
  const renderContent = () => {
    switch (currentView) {
      case ViewMode.DASHBOARD:
        return (
          <Dashboard 
            events={events} 
            tasks={tasks} 
            documents={documents}
            onTaskToggle={handleTaskToggle}
            onViewAllDocuments={() => setCurrentView(ViewMode.DOCUMENTS)}
            eventColors={eventColors}
          />
        );
      case ViewMode.CALENDAR_WEEK:
        return <Calendar events={events} mode={ViewMode.CALENDAR_WEEK} onUpdateEvent={handleUpdateEvent} eventColors={eventColors} />;
      case ViewMode.CALENDAR_MONTH:
        return <Calendar events={events} mode={ViewMode.CALENDAR_MONTH} onUpdateEvent={handleUpdateEvent} eventColors={eventColors} />;
      case ViewMode.TASKS:
        return <TaskList tasks={tasks} onToggle={handleTaskToggle} onAddTask={handleAddTask} />;
      case ViewMode.DOCUMENTS:
        return (
            <DocumentList 
                documents={documents} 
                onUpdateStatus={handleUpdateDocStatus} 
                onAddDocument={handleAddDocument}
                onEditDocument={handleEditDocument}
            />
        );
      default:
        return <div className="p-10 text-center text-gray-500">Đang phát triển...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-gray-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            LeaderFlow
          </h1>
          <p className="text-xs text-slate-400 mt-2 pl-10">Quản lý điều hành 4.0</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => setCurrentView(ViewMode.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === ViewMode.DASHBOARD ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Tổng quan
          </button>
          
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lịch trình</div>
          <button 
            onClick={() => setCurrentView(ViewMode.CALENDAR_WEEK)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === ViewMode.CALENDAR_WEEK ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <CalIcon className="w-5 h-5" />
            Lịch Tuần
          </button>
          <button 
            onClick={() => setCurrentView(ViewMode.CALENDAR_MONTH)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === ViewMode.CALENDAR_MONTH ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <CalendarDays className="w-5 h-5" />
            Lịch Tháng
          </button>
          
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Công việc & Văn bản</div>
          <button 
            onClick={() => setCurrentView(ViewMode.TASKS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === ViewMode.TASKS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <CheckSquare className="w-5 h-5" />
            Nhiệm vụ
            <span className="ml-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-300">{tasks.filter(t => !t.completed).length}</span>
          </button>
          <button 
            onClick={() => setCurrentView(ViewMode.DOCUMENTS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === ViewMode.DOCUMENTS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <FileText className="w-5 h-5" />
            Văn bản
            <span className="ml-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-300">{documents.filter(d => d.status === DocumentStatus.PENDING).length}</span>
          </button>

          {/* System Menu - Collapsible */}
          <button 
            onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
            className="w-full flex items-center justify-between pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors group focus:outline-none"
          >
            <span className="flex items-center gap-2">
               Hệ thống
            </span>
            {isSystemMenuOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          {isSystemMenuOpen && (
            <div className="px-4 space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
               <button 
                onClick={() => setIsColorSettingsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-sm"
              >
                <Palette className="w-4 h-4" />
                Cấu hình màu sắc
              </button>
              <button 
                onClick={handleBackup}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Sao lưu dữ liệu
              </button>
              <button 
                onClick={handleRestoreClick}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-sm"
              >
                <Upload className="w-4 h-4" />
                Phục hồi dữ liệu
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange}
              />
            </div>
          )}

        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={() => setIsSmartAddOpen(true)}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Tạo mới nhanh
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 transition-all">
        {/* Header Breadcrumb/Title */}
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">
                    {currentView === ViewMode.DASHBOARD && "Bàn làm việc Lãnh đạo"}
                    {currentView === ViewMode.CALENDAR_WEEK && "Lịch công tác"}
                    {currentView === ViewMode.CALENDAR_MONTH && "Lịch tháng"}
                    {currentView === ViewMode.TASKS && "Quản lý nhiệm vụ"}
                    {currentView === ViewMode.DOCUMENTS && "Văn bản & Báo cáo"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-600">Hệ thống sẵn sàng</span>
                </div>
            </div>
        </header>

        {renderContent()}
      </main>

      {/* Modals & Overlays */}
      {isSmartAddOpen && (
        <SmartAddModal 
          events={events}
          onClose={() => setIsSmartAddOpen(false)} 
          onAddEvent={handleAddEvent}
          onAddMultipleEvents={handleAddMultipleEvents}
          onAddDocument={handleAddDocument}
        />
      )}
      
      <FloatingNotifier 
        events={events}
        tasks={tasks} 
        documents={documents} 
        onViewTask={(id) => setCurrentView(ViewMode.TASKS)}
        onViewDocument={(id) => setCurrentView(ViewMode.DOCUMENTS)}
      />

      {/* Color Settings Modal */}
      {isColorSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 text-white flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Palette className="w-5 h-5" /> Cấu hình màu sắc sự kiện
                    </h3>
                    <button onClick={() => setIsColorSettingsOpen(false)} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Chọn màu sắc hiển thị cho từng loại sự kiện trên lịch.
                    </p>
                    {Object.values(EventType).map((type) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="font-medium text-gray-700">{type}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-mono">{eventColors[type]}</span>
                                <input 
                                    type="color" 
                                    value={eventColors[type]}
                                    onChange={(e) => handleColorChange(type, e.target.value)}
                                    className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
                        <button 
                            onClick={handleResetColors}
                            className="text-sm text-red-500 hover:text-red-700 font-medium"
                        >
                            Khôi phục mặc định
                        </button>
                        <button 
                            onClick={() => setIsColorSettingsOpen(false)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
                        >
                            Hoàn tất
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
