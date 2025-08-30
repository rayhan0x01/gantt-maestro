"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { format, parseISO, differenceInCalendarDays, isWithinInterval } from "date-fns"
import type { Task } from "@/lib/storage"

interface GanttTimelineProps {
  tasks: Task[]
  dateRange: { start: Date; end: Date }
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
}

interface TaskBar {
  task: Task
  x: number
  width: number
  y: number
  visible: boolean
}

export function GanttTimeline({ tasks, dateRange, onTaskUpdate }: GanttTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragState, setDragState] = useState<{
    taskId: string
    type: "move" | "resize-start" | "resize-end" | "progress"
    startX: number
    originalTask: Task
  } | null>(null)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null)

  const TIMELINE_HEIGHT = 300
  const TASK_HEIGHT = 32
  const TASK_SPACING = 46
  const HEADER_HEIGHT = 56
  const PADDING = 20
  const TRACK_HEIGHT = 6
  const TRACK_GAP = 1

  // Calculate timeline dimensions
  const totalDays = differenceInCalendarDays(dateRange.end, dateRange.start) + 1
  const dayWidth = Math.max(36, (800 - PADDING * 2) / totalDays)
  const timelineWidth = totalDays * dayWidth

  // Generate task bars
  const taskBars: TaskBar[] = tasks.map((task, index) => {
    const taskStart = parseISO(task.startDate)
    const taskEnd = parseISO(task.endDate)

    // Check if task is visible in current date range
    const visible =
      isWithinInterval(taskStart, { start: dateRange.start, end: dateRange.end }) ||
      isWithinInterval(taskEnd, { start: dateRange.start, end: dateRange.end }) ||
      (taskStart < dateRange.start && taskEnd > dateRange.end)

    // Clamp to visible range and calculate calendar-day aligned position/width
    const clampedStart = taskStart < dateRange.start ? dateRange.start : taskStart
    const clampedEnd = taskEnd > dateRange.end ? dateRange.end : taskEnd

    const startDayOffset = Math.max(0, differenceInCalendarDays(clampedStart, dateRange.start))
    const durationDays = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart) + 1)

    const x = startDayOffset * dayWidth
    const width = Math.max(dayWidth * 0.8, durationDays * dayWidth)
    const y = HEADER_HEIGHT + index * TASK_SPACING

    return {
      task,
      x,
      width,
      y,
      visible,
    }
  })

  // Generate date headers
  const dateHeaders = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(dateRange.start)
    date.setDate(date.getDate() + i)
    return {
      date,
      x: i * dayWidth,
      label: format(date, totalDays > 14 ? "dd,MMM" : "MMM dd"),
    }
  })

  // Helper function to get darker shade of color
  const getLighterShade = (color: string, factor = 0.9): string => {
    const hex = color.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)

    return `rgb(${Math.floor(r / factor)}, ${Math.floor(g / factor)}, ${Math.floor(b / factor)})`
  }

  // Pointer event handlers (work for mouse, touch, pen)
  const handlePointerDown = (
    e: React.PointerEvent,
    taskId: string,
    type: "move" | "resize-start" | "resize-end" | "progress",
  ) => {
    e.preventDefault()
    ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Show hover affordances on touch
    setHoveredTask(taskId)

    setDragState({
      taskId,
      type,
      startX: e.clientX,
      originalTask: { ...task },
    })
  }

  const handlePointerMove = (e: MouseEvent | PointerEvent | React.PointerEvent) => {
    if (!dragState || !onTaskUpdate) return

    const clientX = (e as PointerEvent).clientX ?? (e as any).clientX
    const deltaX = clientX - dragState.startX
    const deltaDays = Math.round(deltaX / dayWidth)
    const task = dragState.originalTask

    switch (dragState.type) {
      case "move": {
        const newStartDate = new Date(parseISO(task.startDate))
        const newEndDate = new Date(parseISO(task.endDate))
        newStartDate.setDate(newStartDate.getDate() + deltaDays)
        newEndDate.setDate(newEndDate.getDate() + deltaDays)

        onTaskUpdate(dragState.taskId, {
          startDate: format(newStartDate, "yyyy-MM-dd"),
          endDate: format(newEndDate, "yyyy-MM-dd"),
        })
        break
      }
      case "resize-start": {
        const newStartDate = new Date(parseISO(task.startDate))
        newStartDate.setDate(newStartDate.getDate() + deltaDays)

        if (newStartDate < parseISO(task.endDate)) {
          onTaskUpdate(dragState.taskId, {
            startDate: format(newStartDate, "yyyy-MM-dd"),
          })
        }
        break
      }
      case "resize-end": {
        const newEndDate = new Date(parseISO(task.endDate))
        newEndDate.setDate(newEndDate.getDate() + deltaDays)

        if (newEndDate > parseISO(task.startDate)) {
          onTaskUpdate(dragState.taskId, {
            endDate: format(newEndDate, "yyyy-MM-dd"),
          })
        }
        break
      }
      case "progress": {
        const taskBar = taskBars.find((tb) => tb.task.id === dragState.taskId)
        if (taskBar) {
          const rect = svgRef.current?.getBoundingClientRect()
          if (rect) {
            const relativeX = clientX - rect.left - taskBar.x
            const progress = Math.max(0, Math.min(100, (relativeX / taskBar.width) * 100))
            onTaskUpdate(dragState.taskId, { progress: Math.round(progress) })
          }
        }
        break
      }
    }
  }

  const handlePointerUp = () => {
    setDragState(null)
  }

  useEffect(() => {
    // detect touch-capable/coarse pointers
    const mql = window.matchMedia("(pointer: coarse)")
    const updatePointer = () => setIsTouch(mql.matches || navigator.maxTouchPoints > 0)
    updatePointer()
    mql.addEventListener("change", updatePointer)

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (dragState) {
        handlePointerMove(e)
      }
    }

    const handleGlobalPointerUp = () => {
      setDragState(null)
    }

    if (dragState) {
      document.addEventListener("pointermove", handleGlobalPointerMove)
      document.addEventListener("pointerup", handleGlobalPointerUp)
      document.addEventListener("pointercancel", handleGlobalPointerUp)
    }

    return () => {
      mql.removeEventListener("change", updatePointer)
      document.removeEventListener("pointermove", handleGlobalPointerMove)
      document.removeEventListener("pointerup", handleGlobalPointerUp)
      document.removeEventListener("pointercancel", handleGlobalPointerUp)
    }
  }, [dragState])

  return (
    <div className="w-full overflow-x-auto" ref={containerRef}>
      <svg
        ref={svgRef}
        width={Math.max(containerRef.current?.clientWidth || 1600, timelineWidth + PADDING * 2)} 
        height={TIMELINE_HEIGHT}
        className="border rounded-lg bg-card overflow-x-scroll"
        style={{ touchAction: "none" }}
        onPointerMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect()
          if (!rect) return
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const withinX = x >= PADDING && x <= PADDING + timelineWidth
          const withinY = y >= 0 && y <= TIMELINE_HEIGHT
          if (!withinX || !withinY) {
            setHoveredDayIndex(null)
            return
          }
          const idx = Math.floor((x - PADDING) / dayWidth)
          const clampedIdx = Math.max(0, Math.min(totalDays - 1, idx))
          setHoveredDayIndex(clampedIdx)
        }}
        onPointerLeave={() => setHoveredDayIndex(null)}
      >
        {/* Hovered day background highlight (behind tasks) */}
        {hoveredDayIndex !== null && (
          <rect
            x={PADDING + hoveredDayIndex * dayWidth}
            y={0}
            width={dayWidth}
            height={TIMELINE_HEIGHT}
            fill="hsl(var(--primary))"
            opacity={0.08}
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* Date headers Days */}
        <g>
          {dateHeaders.map((header, i) => (
            <g key={i}>
              <line
                x1={PADDING + header.x}
                y1={0}
                x2={PADDING + header.x}
                y2={TIMELINE_HEIGHT}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                opacity={0.3}
              />
              <text
                x={PADDING + header.x + dayWidth / 2}
                y={20}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                {header.label.split(",")[0]}
              </text>
            </g>
          ))}
        </g>

        {/* Date headers Months */}
        <g>
          {dateHeaders.map((header, i) => (
            <g key={i}>
              <text
                x={PADDING + header.x + dayWidth / 2}
                y={36}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                {header.label.split(",")[1]}
              </text>
            </g>
          ))}
        </g>

        {/* Task bars */}
        <g>
          {taskBars
            .filter((taskBar) => taskBar.visible)
            .map((taskBar) => {
              const progressWidth = Math.max(
                0,
                Math.min(taskBar.width, (taskBar.width * taskBar.task.progress) / 100),
              )
              const isBeingDragged = dragState?.taskId === taskBar.task.id
              const isHovered = hoveredTask === taskBar.task.id

              return (
                <g
                  key={taskBar.task.id}
                  className={isBeingDragged ? "opacity-80" : ""}
                  onPointerEnter={() => setHoveredTask(taskBar.task.id)}
                  onPointerLeave={() => setHoveredTask(null)}
                >
                  {/* Unified hover area covering bar and seek track */}
                  <rect
                    x={PADDING + taskBar.x}
                    y={taskBar.y - 4}
                    width={taskBar.width}
                    height={TASK_HEIGHT + TRACK_GAP + TRACK_HEIGHT + 8}
                    fill="transparent"
                  />
                  {/* Task background bar */}
                  <rect
                    x={PADDING + taskBar.x}
                    y={taskBar.y}
                    width={taskBar.width}
                    height={TASK_HEIGHT}
                    fill={taskBar.task.color}
                    rx={4}
                    className="cursor-move"
                    onPointerDown={(e) => handlePointerDown(e, taskBar.task.id, "move")}
                  />

                  {/* Progress overlay */}
                  <rect
                    x={PADDING + taskBar.x}
                    y={taskBar.y}
                    width={progressWidth}
                    height={TASK_HEIGHT}
                    fill={getLighterShade(taskBar.task.color)}
                    rx={4}
                    className="pointer-events-none"
                  />

                  {/* Progress seek track below the bar (appears on hover) */}
                  {(() => {
                    const trackY = taskBar.y + TASK_HEIGHT + TRACK_GAP
                    const trackHeight = TRACK_HEIGHT
                    const knobCX = PADDING + taskBar.x + Math.min(taskBar.width, (taskBar.width * taskBar.task.progress) / 100)
                    const knobCY = trackY + trackHeight / 2
                    const showTrack = isTouch || isHovered
                    return (
                      <g>
                        <rect
                          x={PADDING + taskBar.x}
                          y={trackY}
                          width={taskBar.width}
                          height={trackHeight}
                          rx={3}
                          fill={getLighterShade(taskBar.task.color)}
                          opacity={showTrack ? 0.35 : 0}
                          className={showTrack ? "cursor-pointer" : "pointer-events-none"}
                          onPointerDown={(e) => handlePointerDown(e, taskBar.task.id, "progress")}
                        />
                        {showTrack && (
                          <circle
                            cx={knobCX}
                            cy={knobCY}
                            r={8}
                            fill="white"
                            stroke={getLighterShade(taskBar.task.color)}
                            strokeWidth={2}
                            className="cursor-ew-resize"
                            onPointerDown={(e) => handlePointerDown(e, taskBar.task.id, "progress")}
                          />)
                        }
                      </g>
                    )
                  })()}



                  {/* Task name label */}
                  <foreignObject
                    x={PADDING + taskBar.x}
                    y={taskBar.y}
                    width={taskBar.width}
                    height={TASK_HEIGHT}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="flex items-center justify-center overflow-hidden" style={{ width: taskBar.width - 30, height: TASK_HEIGHT }}>
                      <p className="px-2 text-xs text-white font-medium pointer-events-none truncate">{taskBar.task.name}</p>
                    </div>
                  </foreignObject>


                  {/* Progress percentage */}
                  {taskBar.task.progress > 0 && (
                    <text
                      x={PADDING + taskBar.x + taskBar.width - 8}
                      y={taskBar.y + TASK_HEIGHT / 2 + 4}
                      textAnchor="end"
                      className="text-xs fill-white font-medium pointer-events-none"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {taskBar.task.progress}%
                    </text>
                  )}

                  {/* Resize handles */}
                  <rect
                    x={PADDING + taskBar.x - 2}
                    y={taskBar.y}
                    width={4}
                    height={TASK_HEIGHT}
                    fill="transparent"
                    className="cursor-w-resize"
                    onPointerDown={(e) => handlePointerDown(e, taskBar.task.id, "resize-start")}
                  />
                  <rect
                    x={PADDING + taskBar.x + taskBar.width - 2}
                    y={taskBar.y}
                    width={4}
                    height={TASK_HEIGHT}
                    fill="transparent"
                    className="cursor-e-resize"
                    onPointerDown={(e) => handlePointerDown(e, taskBar.task.id, "resize-end")}
                  />
                </g>
              )
            })}
        </g>

        {/* Hovered day indicator line (on top) */}
        {hoveredDayIndex !== null && (
          <line
            x1={PADDING + hoveredDayIndex * dayWidth + dayWidth / 2}
            y1={0}
            x2={PADDING + hoveredDayIndex * dayWidth + dayWidth / 2}
            y2={TIMELINE_HEIGHT}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
        )}
      </svg>
    </div>
  )
}
