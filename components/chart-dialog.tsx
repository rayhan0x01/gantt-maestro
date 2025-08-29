"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format, addDays } from "date-fns"
import { Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/storage"

interface ChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => void
  editingTask?: Task | null
}

export function ChartDialog({ open, onOpenChange, onSave, editingTask }: ChartDialogProps) {
  const [task, setTask] = useState<Partial<Task>>({
    name: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    progress: 0,
    color: "#3b82f6",
    completed: false,
  })

  const taskColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

  useEffect(() => {
    if (editingTask) {
      setTask(editingTask)
    } else {
      setTask({
        name: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        progress: 0,
        color: "#3b82f6",
        completed: false,
      })
    }
  }, [editingTask, open])

  const handleSave = () => {
    if (task.name?.trim()) {
      const finalTask: Task = {
        id: editingTask?.id || Date.now().toString(),
        name: task.name.trim(),
        startDate: task.startDate || format(new Date(), "yyyy-MM-dd"),
        endDate: task.endDate || format(addDays(new Date(), 7), "yyyy-MM-dd"),
        progress: task.progress || 0,
        color: task.color || "#3b82f6",
        completed: task.completed || false,
      }
      onSave(finalTask)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <label className="text-sm font-medium">Task Name</label>
            <Input
              value={task.name || ""}
              onChange={(e) => setTask((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter task name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={task.startDate || ""}
              onChange={(e) => setTask((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={task.endDate || ""}
              onChange={(e) => setTask((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Progress (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={task.progress || 0}
              onChange={(e) =>
                setTask((prev) => ({ ...prev, progress: Number.parseInt(e.target.value) || 0 }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-1 mt-1">
              {taskColors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-6 h-6 rounded border-2",
                    task.color === color ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setTask((prev) => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingTask ? "Save Changes" : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
