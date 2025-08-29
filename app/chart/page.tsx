"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Plus, Edit2, Download, CalendarIcon, Trash2, Check, ArrowLeft, ArrowUpDown, GripVertical } from "lucide-react"
import Link from "next/link"
import { format, parseISO, addDays } from "date-fns"
import { GanttStorage, type GanttProject, type Task } from "@/lib/storage"
import { GanttTimeline } from "@/components/gantt-timeline"
import { ChartDialog } from "@/components/chart-dialog"
import { cn } from "@/lib/utils"
import Footer from "@/components/footer"

function ChartEditorContent() {
  const searchParams = useSearchParams()
  const chartId = searchParams.get("id")

  const [project, setProject] = useState<GanttProject | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState("")
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: addDays(new Date(), 30),
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [sort, setSort] = useState<{ key: "startDate" | "endDate"; direction: "asc" | "desc" } | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (chartId) {
      const existingProject = GanttStorage.getChart(chartId)
      if (existingProject) {
        setProject(existingProject)
        setTempTitle(existingProject.title)
      } else {
        const newProject: GanttProject = {
          id: chartId,
          title: "Untitled Project",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tasks: [],
          status: "draft",
        }
        setProject(newProject)
        setTempTitle(newProject.title)
        GanttStorage.saveChart(newProject)
      }
    }
  }, [chartId])

  const saveProject = (updatedProject: GanttProject) => {
    setProject(updatedProject)
    GanttStorage.saveChart(updatedProject)
  }

  const handleTitleSave = () => {
    if (project && tempTitle.trim()) {
      const updatedProject = { ...project, title: tempTitle.trim() }
      saveProject(updatedProject)
      setIsEditingTitle(false)
    }
  }

  const handleSaveTask = (task: Task) => {
    if (project) {
      const updatedProject = {
        ...project,
        tasks: editingTask
          ? project.tasks.map((t) => (t.id === task.id ? task : t))
          : [...project.tasks, task],
      }
      saveProject(updatedProject)
      setEditingTask(null)
    }
  }

  const handleDeleteTask = (taskId: string) => {
    if (project) {
      const updatedProject = {
        ...project,
        tasks: project.tasks.filter((task) => task.id !== taskId),
      }
      saveProject(updatedProject)
    }
  }

  const handleCompleteTask = (taskId: string) => {
    if (project) {
      const updatedProject = {
        ...project,
        tasks: project.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed, progress: task.completed ? 0 : 100 } : task,
        ),
      }
      saveProject(updatedProject)
    }
  }

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    if (project) {
      const updatedProject = {
        ...project,
        tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
      }
      saveProject(updatedProject)
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask({ ...task })
    setDialogOpen(true)
  }

  const handleExportJSON = () => {
    if (project) {
      const jsonData = GanttStorage.exportChart(project.id)
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.title.replace(/\s+/g, "_")}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleSort = (key: "startDate" | "endDate") => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" }
      if (prev.direction === "asc") return { key, direction: "desc" }
      // If already desc, clear sorting
      return null
    })
  }

  const sortedTasks = useMemo(() => {
    const baseTasks = project?.tasks ? [...project.tasks] : []
    if (!sort) return baseTasks
    return baseTasks.sort((a, b) => {
      const aTime = parseISO(a[sort.key]).getTime()
      const bTime = parseISO(b[sort.key]).getTime()
      if (aTime === bTime) return 0
      return sort.direction === "asc" ? aTime - bTime : bTime - aTime
    })
  }, [project, sort])

  const handleRowDrop = (targetTaskId: string) => {
    if (!project || !draggingTaskId) return
    // Reordering is only allowed when not sorted (avoids confusing UX)
    if (sort) return
    const fromIndex = project.tasks.findIndex((t) => t.id === draggingTaskId)
    const toIndex = project.tasks.findIndex((t) => t.id === targetTaskId)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      setDraggingTaskId(null)
      setDragOverTaskId(null)
      return
    }
    const newTasks = [...project.tasks]
    const [moved] = newTasks.splice(fromIndex, 1)
    newTasks.splice(toIndex, 0, moved)
    saveProject({ ...project, tasks: newTasks })
    setDraggingTaskId(null)
    setDragOverTaskId(null)
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-col gap-4 md:gap-0 md:flex-row md:h-9 group/title-edit">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSave()
                        if (e.key === "Escape") {
                          setTempTitle(project.title)
                          setIsEditingTitle(false)
                        }
                      }}
                      className="text-xl font-bold"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleTitleSave}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{project.title}</h1>
                    <Button variant="ghost" size="sm" className="md:hidden group-hover/title-edit:block" onClick={() => setIsEditingTitle(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Date Range Picker */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger className="cursor-pointer" asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(dateRange.start, "MMM dd")} - {format(dateRange.end, "MMM dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto" align="end">
                    <div className="p-4">
                      <div className="space-y-4 flex flex-col md:flex-row md:gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium">Start Date</label>
                          <Calendar
                            mode="single"
                            selected={dateRange.start}
                            onSelect={(date) => date && setDateRange((prev) => ({ ...prev, start: date }))}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium">End Date</label>
                          <Calendar
                            mode="single"
                            selected={dateRange.end}
                            onSelect={(date) => date && setDateRange((prev) => ({ ...prev, end: date }))}
                            className="rounded-md border"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={handleExportJSON} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Timeline View */}
        <div className="mb-6">
            <GanttTimeline tasks={project.tasks} dateRange={dateRange} onTaskUpdate={handleUpdateTask} />
        </div>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <div className="flex items-center gap-2">
                {sort && (
                  <Button variant="outline" size="sm" onClick={() => setSort(null)}>
                    Clear sort
                  </Button>
                )}
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          <ChartDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setEditingTask(null)
            }}
            onSave={handleSaveTask}
            editingTask={editingTask}
          />

            {project.tasks.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-muted-foreground mb-4">Add your first task to start building your timeline</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">Order</TableHead>
                        <TableHead>Task Name</TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort("startDate")} className="p-0 h-auto font-normal">
                            <span className="inline-flex items-center">Start Date
                              <span className="ml-2 text-muted-foreground">
                                {sort?.key === "startDate" ? (sort.direction === "asc" ? "▲" : "▼") : <ArrowUpDown className="h-3 w-3" />}
                              </span>
                            </span>
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort("endDate")} className="p-0 h-auto font-normal">
                            <span className="inline-flex items-center">End Date
                              <span className="ml-2 text-muted-foreground">
                                {sort?.key === "endDate" ? (sort.direction === "asc" ? "▲" : "▼") : <ArrowUpDown className="h-3 w-3" />}
                              </span>
                            </span>
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-32">Progress</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTasks.map((task) => (
                        <TableRow
                          key={task.id}
                          onDragOver={(e) => {
                            if (sort) return
                            e.preventDefault()
                            setDragOverTaskId(task.id)
                          }}
                          onDrop={() => handleRowDrop(task.id)}
                          className={dragOverTaskId === task.id && !sort ? "bg-muted/40" : ""}
                        >
                          <TableCell className="align-middle">
                            <button
                              aria-label="Drag to reorder"
                              draggable={!sort}
                              onDragStart={() => setDraggingTaskId(task.id)}
                              onDragEnd={() => {
                                setDraggingTaskId(null)
                                setDragOverTaskId(null)
                              }}
                              className={"p-0.5 text-muted-foreground " + (sort ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing")}
                              title={sort ? "Clear sorting to reorder" : "Drag to reorder"}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">{task.name}</TableCell>
                          <TableCell>{format(parseISO(task.startDate), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{format(parseISO(task.endDate), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={task.progress} className="w-16" />
                              <span className="text-sm text-muted-foreground">{task.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-6 h-6 rounded border" style={{ backgroundColor: task.color }} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.completed ? "default" : "secondary"}>
                              {task.completed ? "Completed" : "In Progress"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditTask(task)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCompleteTask(task.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile list */}
                <div className="md:hidden space-y-4">
                  {sortedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 flex flex-col items-center text-center gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: task.color }} />
                        <h4 className="font-medium">{task.name}</h4>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Badge>{format(parseISO(task.startDate), "MMM dd, yyyy")}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge>{format(parseISO(task.endDate), "MMM dd, yyyy")}</Badge>
                      </div>

                      <div className="flex items-center gap-2 w-full justify-center">
                        <Progress value={task.progress} className="w-40" />
                        <span className="text-sm text-muted-foreground">{task.progress}%</span>
                      </div>

                      <Badge variant={task.completed ? "default" : "secondary"}>
                        {task.completed ? "Completed" : "In Progress"}
                      </Badge>

                      <div className="flex items-center justify-center gap-2 pt-2 w-full">
                        <Button variant="outline" size="sm" onClick={() => handleEditTask(task)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCompleteTask(task.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* footer */}
      <Footer />
    </div>
  )
}

export default function ChartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ChartEditorContent />
    </Suspense>
  )
}
