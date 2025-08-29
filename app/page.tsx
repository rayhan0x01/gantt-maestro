"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Calendar, FileText, Trash2, Edit, Upload, AlertCircle, Folder, CheckCircle, Play, Activity, HardDrive, UserX, Download, ChartGantt } from "lucide-react"
import Link from "next/link"
import { GanttStorage, type GanttProject } from "@/lib/storage"
import Footer from "@/components/footer"

interface GanttChart {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  taskCount: number
  status: "active" | "completed" | "draft"
}

export default function Dashboard() {
  const [charts, setCharts] = useState<GanttChart[]>([])
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importError, setImportError] = useState<string>("")
  const [importSuccess, setImportSuccess] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [currentChart, setCurrentChart] = useState<GanttChart | null>(null)

  useEffect(() => {
    loadCharts()
  }, [])

  const loadCharts = () => {
    const savedProjects = GanttStorage.getCharts()
    const chartSummaries: GanttChart[] = savedProjects.map((project) => ({
      id: project.id,
      title: project.title,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount: project.tasks.length,
      status: project.status,
    }))
    setCharts(chartSummaries)
  }

  const createNewChart = () => {
    const newChart: GanttProject = {
      id: Date.now().toString(),
      title: "Untitled Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [],
      status: "draft",
    }

    GanttStorage.saveChart(newChart)
    loadCharts()

    // Navigate to the new chart
    window.location.href = `/chart?id=${newChart.id}`
  }

  const deleteChart = (id: string) => {
    GanttStorage.deleteChart(id)
    loadCharts()
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError("")
    setImportSuccess("")

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string
        const importedProject = GanttStorage.importChart(jsonData)

        if (!importedProject) {
          setImportError("Invalid JSON format. Please check your file and try again.")
          return
        }

        // Generate new ID to avoid conflicts
        const newProject: GanttProject = {
          ...importedProject,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: `${importedProject.title} (Imported)`,
        }

        GanttStorage.saveChart(newProject)
        loadCharts()
        setImportSuccess(`Successfully imported "${newProject.title}"`)

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (error) {
        setImportError("Failed to parse JSON file. Please check the file format.")
      }
    }
    reader.readAsText(file)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const openEditFor = (chart: GanttChart) => {
    setCurrentChart(chart)
    setIsEditOpen(true)
  }

  const closeEdit = () => {
    setIsEditOpen(false)
  }

  const saveChartMeta = () => {
    if (!currentChart) return
    const project = GanttStorage.getChart(currentChart.id)
    if (!project) return
    const updatedProject = {
      ...project,
      title: currentChart.title.trim() || project.title,
      status: currentChart.status,
    }
    GanttStorage.saveChart(updatedProject)
    loadCharts()
    setIsEditOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center flex-wrap gap-4 justify-between mb-8">
          <div className="flex flex-col flex-wrap">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">Gantt Maestro</h1>
                <p className="text-sm md:text-base text-muted-foreground">Free offline Gantt chart generator and project manager</p>
            </div>
            <div className="flex items-center gap-2">
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                    <Upload className="h-4 w-4" />
                  Import JSON
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Gantt Chart</DialogTitle>
                  <DialogDescription>
                    Upload a JSON file exported from Gantt Maestro to import a project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Select JSON File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleFileImport}
                      className="mt-1"
                    />
                  </div>

                  {importError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{importError}</AlertDescription>
                    </Alert>
                  )}

                  {importSuccess && (
                    <Alert>
                      <AlertDescription className="text-green-700">{importSuccess}</AlertDescription>
                    </Alert>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Supported format:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>JSON files exported from Gantt Maestro</li>
                      <li>Must contain valid project structure with tasks</li>
                      <li>Imported projects will get a new ID and "(Imported)" suffix</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={createNewChart} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid-cols-1 md:grid-cols-3 gap-6 mb-8 hidden md:grid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{charts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{charts.filter((chart) => chart.status === "active").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{charts.filter((chart) => chart.status === "completed").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Projects</CardTitle>
            <CardDescription>Manage your Gantt chart projects</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">Create your first Gantt chart or import an existing one</p>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={createNewChart}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import JSON
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile list view */}
                <div className="block md:hidden">
                  <div className="space-y-4">
                    {charts.map((chart) => (
                      <div key={chart.id} className="rounded-md border p-4">
                        <div className="flex flex-col items-center justify-center w-full gap-3">
                            <Link
                              href={`/chart?id=${chart.id}`}
                              className="font-medium hover:text-primary transition-colors line-clamp-2 break-words"
                            >
                              {chart.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Badge className={getStatusColor(chart.status)}>{chart.status}</Badge>
                              <span>Tasks: {chart.taskCount}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-grow items-center">
                              <Badge variant="secondary" className="text-muted-foreground">Created: {new Date(chart.createdAt).toLocaleDateString()}</Badge>
                              <Badge variant="secondary" className="text-muted-foreground">Updated: {new Date(chart.updatedAt).toLocaleDateString()}</Badge>
                            </div>
                          
                          <div className="flex shrink-0 items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild aria-label={`Open ${chart.title}`}>
                              <Link href={`/chart?id=${chart.id}`}>
                                <ChartGantt className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                                variant="ghost" 
                                size="icon" 
                                aria-label={`Edit ${chart.title}`}
                                onClick={() => openEditFor(chart)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteChart(chart.id)}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${chart.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                  
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tasks</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charts.map((chart) => (
                        <TableRow key={chart.id}>
                          <TableCell className="font-medium">
                            <Link href={`/chart?id=${chart.id}`} className="hover:text-primary transition-colors">
                              {chart.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(chart.status)}>{chart.status}</Badge>
                          </TableCell>
                          <TableCell>{chart.taskCount}</TableCell>
                          <TableCell>{new Date(chart.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(chart.updatedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild aria-label={`Open ${chart.title}`}>
                                <Link href={`/chart?id=${chart.id}`}>
                                  <ChartGantt className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    aria-label={`Edit ${chart.title}`}
                                    onClick={() => openEditFor(chart)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteChart(chart.id)}
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="mt-12">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">100% Offline and Private</CardTitle>
                <HardDrive className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Everything runs locally in your browser using Local Storage. No servers, no syncing, just instant performance.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">No Login or Signup</CardTitle>
                <UserX className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Start immediately without login or signup, your projects never leave your browser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Import & Export Data</CardTitle>
                <Download className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Move your data anywhere with simple JSON import/export, perfect for backups or switching browsers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* footer */}
        <Footer />

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Edit the project details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Project Name</Label>
                <Input
                  id="edit-title"
                  value={currentChart?.title || ""}
                  onChange={(e) => setCurrentChart(prev => prev ? {...prev, title: e.target.value} : null)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={currentChart?.status || "draft"}
                  onValueChange={(v) => setCurrentChart(prev => prev ? {...prev, status: v as any} : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={closeEdit}>Cancel</Button>
                <Button size="sm" onClick={saveChartMeta}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
