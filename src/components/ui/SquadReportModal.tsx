'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Download, BarChart2, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cn } from '@/lib/utils'

interface SquadMember {
  id: string
  member_row_id: string
  full_name: string
  avatar_url: string | null
  rank: string
  role: string
  last_seen: string | null
}

interface SquadReportModalProps {
  isOpen: boolean
  onClose: () => void
  mission: any
  squadMembers: SquadMember[]
  themeColor: string
  isRTL: boolean
}

export default function SquadReportModal({
  isOpen,
  onClose,
  mission,
  squadMembers,
  themeColor,
  isRTL
}: SquadReportModalProps) {
  if (!isOpen || !mission) return null

  const tasks = mission.tasks || []

  // Resolve task deadline helper
  const getTaskDeadline = (task: any) => {
    return task.metadata?.endDate || task.metadata?.dueDate || task.deadline || task.metadata?.deadline
  }

  // Calculate member statistics
  const memberStats = squadMembers.map(member => {
    const assignedTasks = tasks.filter((t: any) => t.assigned_to === member.id)
    const completedTasks = assignedTasks.filter((t: any) => t.is_completed)
    
    // Calculate overdue
    const overdueTasks = assignedTasks.filter((t: any) => {
      if (t.is_completed) return false
      const deadline = getTaskDeadline(t)
      if (!deadline) return false
      try {
        const dDate = new Date(deadline)
        dDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return dDate < today
      } catch {
        return false
      }
    })

    const progressPercent = assignedTasks.length > 0 
      ? Math.round((completedTasks.length / assignedTasks.length) * 100)
      : 0

    return {
      member,
      assignedCount: assignedTasks.length,
      completedCount: completedTasks.length,
      overdueCount: overdueTasks.length,
      progressPercent
    }
  })

  // Goal metrics
  const totalTasksCount = tasks.length
  const completedTasksCount = tasks.filter((t: any) => t.is_completed).length
  const overallProgress = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : 0

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Overview
    const overviewData = [
      { Metric: isRTL ? 'اسم الهدف' : 'Goal Title', Value: mission.title },
      { Metric: isRTL ? 'إجمالي التقدم' : 'Overall Progress', Value: `${overallProgress}%` },
      { Metric: isRTL ? 'إجمالي المهام' : 'Total Tasks', Value: totalTasksCount },
      { Metric: isRTL ? 'المهام المكتملة' : 'Completed Tasks', Value: completedTasksCount },
      { Metric: isRTL ? 'عدد الأعضاء' : 'Members Count', Value: squadMembers.length },
      { Metric: isRTL ? 'تاريخ التقرير' : 'Report Date', Value: new Date().toLocaleDateString() }
    ]
    const wsOverview = XLSX.utils.json_to_sheet(overviewData)
    XLSX.utils.book_append_sheet(wb, wsOverview, isRTL ? 'نظرة عامة' : 'Overview')

    // Sheet 2: Members Stats
    const membersData = memberStats.map(stat => ({
      [isRTL ? 'الاسم' : 'Name']: stat.member.full_name,
      [isRTL ? 'الدور' : 'Role']: stat.member.role,
      [isRTL ? 'المهام المعينة' : 'Tasks Assigned']: stat.assignedCount,
      [isRTL ? 'المهام المنجزة' : 'Tasks Completed']: stat.completedCount,
      [isRTL ? 'المهام المتأخرة' : 'Tasks Overdue']: stat.overdueCount,
      [isRTL ? 'النسبة المئوية' : 'Completion Rate']: `${stat.progressPercent}%`
    }))
    const wsMembers = XLSX.utils.json_to_sheet(membersData)
    XLSX.utils.book_append_sheet(wb, wsMembers, isRTL ? 'إحصائيات الأعضاء' : 'Members Stats')

    // Sheet 3: Tasks Log
    const tasksData = tasks.map((t: any) => {
      const deadline = getTaskDeadline(t)
      const assignee = squadMembers.find(m => m.id === t.assigned_to)
      return {
        [isRTL ? 'عنوان المهمة' : 'Task Title']: t.title,
        [isRTL ? 'الحالة' : 'Status']: t.is_completed ? (isRTL ? 'مكتملة' : 'Completed') : (isRTL ? 'قيد التنفيذ' : 'In Progress'),
        [isRTL ? 'الأهمية' : 'Weight']: t.weight || 1,
        [isRTL ? 'المسؤول' : 'Assignee']: assignee ? assignee.full_name : (isRTL ? 'غير معين' : 'Unassigned'),
        [isRTL ? 'تاريخ الاستحقاق' : 'Due Date']: deadline || (isRTL ? 'غير محدد' : 'Not Set')
      }
    })
    const wsTasks = XLSX.utils.json_to_sheet(tasksData)
    XLSX.utils.book_append_sheet(wb, wsTasks, isRTL ? 'سجل المهام' : 'Tasks Log')

    // Auto-adjust column widths for all sheets
    const sheets: any[] = [wsOverview, wsMembers, wsTasks];
    sheets.forEach((ws) => {
      const refVal = ws['!ref'];
      if (!refVal) return;
      const range = XLSX.utils.decode_range(refVal);
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            maxLen = Math.max(maxLen, cell.v.toString().length);
          }
        }
        colWidths.push({ wch: maxLen + 3 });
      }
      ws['!cols'] = colWidths;
    });

    XLSX.writeFile(wb, `Squad_Report_${mission.id.slice(0, 8)}.xlsx`)
  }

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF()
    const reportTitle = isRTL ? 'تقرير تقدم الفريق - Growth Hub' : 'Squad Progress Report - Growth Hub'
    
    // Add Brand Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(20, 184, 166) // Teal Accent
    doc.text(reportTitle, 14, 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26)

    // Divider Line
    doc.setDrawColor(220, 220, 220)
    doc.line(14, 30, 196, 30)

    // Goal Details Block
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text(mission.title || 'Goal Title', 14, 40)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Overall Goal Progress: ${overallProgress}%`, 14, 48)
    doc.text(`Total Squad Tasks: ${totalTasksCount} (${completedTasksCount} completed)`, 14, 54)

    // Table of Members
    const tableHeaders = [
      isRTL ? 'الاسم' : 'Name',
      isRTL ? 'المهام المعينة' : 'Assigned',
      isRTL ? 'المهام المكتملة' : 'Completed',
      isRTL ? 'المهام المتأخرة' : 'Overdue',
      isRTL ? 'النسبة المئوية' : 'Completion Rate'
    ]

    const tableRows = memberStats.map(stat => [
      stat.member.full_name,
      stat.assignedCount.toString(),
      stat.completedCount.toString(),
      stat.overdueCount.toString(),
      `${stat.progressPercent}%`
    ])

    autoTable(doc, {
      startY: 62,
      head: [tableHeaders],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 }
    })

    doc.save(`Squad_Report_${mission.id.slice(0, 8)}.pdf`)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-4xl bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-teal-400" />
              <h2 className="font-space font-black text-sm text-white uppercase tracking-wider">
                {isRTL ? 'تقرير أداء الفريق' : 'Squad Performance Report'}
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Goal Banner */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">{isRTL ? 'الهدف الحالي' : 'Active Squad Goal'}</p>
                <h3 className="text-xl font-bold text-white font-space mt-1">{mission.title}</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">{isRTL ? 'التقدم الإجمالي' : 'Overall Progress'}</p>
                  <p className="text-2xl font-black text-teal-400 font-space mt-1">{overallProgress}%</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin-slow opacity-20" />
                  <span className="text-xs font-bold text-teal-400 font-mono">{completedTasksCount}/{totalTasksCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">{isRTL ? 'إجمالي الأعضاء' : 'Total Members'}</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span className="text-xl font-bold text-white font-space">{squadMembers.length}</span>
                </div>
              </div>

              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">{isRTL ? 'المهام المعينة' : 'Total Tasks'}</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 style={{ color: themeColor }}" />
                  <span className="text-xl font-bold text-white font-space">{totalTasksCount}</span>
                </div>
              </div>

              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">{isRTL ? 'المهام المكتملة' : 'Completed Tasks'}</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xl font-bold text-white font-space">{completedTasksCount}</span>
                </div>
              </div>

              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">{isRTL ? 'مهام متأخرة' : 'Overdue Tasks'}</span>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-xl font-bold text-white font-space">
                    {memberStats.reduce((acc, curr) => acc + curr.overdueCount, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Members Progress Table */}
            <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
                      <th className="py-3 px-4">{isRTL ? 'العضو' : 'Member'}</th>
                      <th className="py-3 px-4">{isRTL ? 'الدور' : 'Role'}</th>
                      <th className="py-3 px-4 text-center">{isRTL ? 'المعينة' : 'Assigned'}</th>
                      <th className="py-3 px-4 text-center">{isRTL ? 'المكتملة' : 'Completed'}</th>
                      <th className="py-3 px-4 text-center">{isRTL ? 'المتأخرة' : 'Overdue'}</th>
                      <th className="py-3 px-4 text-right">{isRTL ? 'التقدم' : 'Progress'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberStats.map(stat => (
                      <tr key={stat.member.id} className="border-b border-white/5 hover:bg-white/[0.02] text-xs font-space text-white/90">
                        <td className="py-3 px-4 flex items-center gap-2">
                          {stat.member.avatar_url ? (
                            <img src={stat.member.avatar_url} alt={stat.member.full_name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                              {stat.member.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="truncate max-w-[120px] font-medium">{stat.member.full_name}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[10px]">
                          {stat.member.role}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {stat.assignedCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-400">
                          {stat.completedCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-rose-500">
                          {stat.overdueCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-teal-400 font-bold">{stat.progressPercent}%</span>
                            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                              <div className="h-full bg-teal-500" style={{ width: `${stat.progressPercent}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="px-6 py-5 border-t border-white/5 bg-zinc-900/40 flex flex-wrap gap-3 justify-end items-center">
            <button
              onClick={handleExportExcel}
              className="h-10 px-4 rounded-xl border border-teal-500/30 hover:border-teal-500 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400 hover:text-teal-300 font-space text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isRTL ? 'تصدير إكسل' : 'Export Excel'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="h-10 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-space text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            >
              <FileText className="w-4 h-4 text-black" />
              <span>{isRTL ? 'تصدير PDF' : 'Export PDF'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
