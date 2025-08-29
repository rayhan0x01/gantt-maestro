export interface Task {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  color: string
  completed: boolean
}

export interface GanttProject {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  tasks: Task[]
  status: "active" | "completed" | "draft"
}

export class GanttStorage {
  private static CHARTS_KEY = "gantt-charts"
  private static TASKS_KEY = "gantt-tasks"

  static getCharts(): GanttProject[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(this.CHARTS_KEY)
    return data ? JSON.parse(data) : []
  }

  static saveCharts(charts: GanttProject[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.CHARTS_KEY, JSON.stringify(charts))
  }

  static getChart(id: string): GanttProject | null {
    const charts = this.getCharts()
    return charts.find((chart) => chart.id === id) || null
  }

  static saveChart(chart: GanttProject): void {
    const charts = this.getCharts()
    const index = charts.findIndex((c) => c.id === chart.id)

    if (index >= 0) {
      charts[index] = { ...chart, updatedAt: new Date().toISOString() }
    } else {
      charts.push(chart)
    }

    this.saveCharts(charts)
  }

  static deleteChart(id: string): void {
    const charts = this.getCharts().filter((chart) => chart.id !== id)
    this.saveCharts(charts)
  }

  static exportChart(id: string): string {
    const chart = this.getChart(id)
    return chart ? JSON.stringify(chart, null, 2) : ""
  }

  static importChart(jsonData: string): GanttProject | null {
    try {
      const chart = JSON.parse(jsonData) as GanttProject
      // Validate required fields
      if (!chart.id || !chart.title || !Array.isArray(chart.tasks)) {
        throw new Error("Invalid chart format")
      }
      return chart
    } catch (error) {
      console.error("Failed to import chart:", error)
      return null
    }
  }
}
