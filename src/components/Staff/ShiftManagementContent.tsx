import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  Save,
  Sunrise,
  Sunset,
  Moon,
  Loader2,
  Download,
  Copy,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfWeek, addDays } from "date-fns";

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  grace_period_minutes: number;
  auto_clock_out_minutes: number;
  is_active: boolean;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
}

interface Assignment {
  id: string;
  staff_id: string;
  shift_id: string;
  day_of_week: number;
  is_active: boolean;
}

interface ShiftManagementContentProps {
  restaurantId: string | null;
}

const SHIFT_COLORS = [
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Shift Management Content Component
 * Can be embedded in Staff page or used standalone
 */
const ShiftManagementContent: React.FC<ShiftManagementContentProps> = ({
  restaurantId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "06:00",
    end_time: "14:00",
    color: "#3B82F6",
    grace_period_minutes: 15,
    auto_clock_out_minutes: 120,
  });

  // Bulk assignment state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [bulkShiftId, setBulkShiftId] = useState<string>("");
  const [bulkDays, setBulkDays] = useState<Set<number>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Fetch shifts
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ["shifts", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("start_time");
      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!restaurantId,
  });

  // Fetch staff
  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("staff")
        .select("id, first_name, last_name, position")
        .eq("restaurant_id", restaurantId)
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: !!restaurantId,
  });

  // Fetch assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["shift-assignments", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("staff_shift_assignments")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!restaurantId,
  });

  // Create/Update shift mutation
  const saveShiftMutation = useMutation({
    mutationFn: async (shiftData: typeof shiftForm & { id?: string }) => {
      if (shiftData.id) {
        const { error } = await supabase
          .from("shifts")
          .update({
            name: shiftData.name,
            start_time: shiftData.start_time,
            end_time: shiftData.end_time,
            color: shiftData.color,
            grace_period_minutes: shiftData.grace_period_minutes,
            auto_clock_out_minutes: shiftData.auto_clock_out_minutes,
          })
          .eq("id", shiftData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shifts").insert([
          {
            ...shiftData,
            restaurant_id: restaurantId,
            is_active: true,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingShift ? "Shift Updated" : "Shift Created" });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setIsShiftDialogOpen(false);
      resetShiftForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from("shifts")
        .update({ is_active: false })
        .eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Shift Deleted" });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });

  // Toggle assignment mutation
  const toggleAssignmentMutation = useMutation({
    mutationFn: async ({
      staffId,
      shiftId,
      dayOfWeek,
      isAssigned,
    }: {
      staffId: string;
      shiftId: string;
      dayOfWeek: number;
      isAssigned: boolean;
    }) => {
      if (isAssigned) {
        const { error } = await supabase
          .from("staff_shift_assignments")
          .delete()
          .eq("staff_id", staffId)
          .eq("shift_id", shiftId)
          .eq("day_of_week", dayOfWeek);
        if (error) throw error;
      } else {
        await supabase
          .from("staff_shift_assignments")
          .delete()
          .eq("staff_id", staffId)
          .eq("day_of_week", dayOfWeek);

        const { error } = await supabase
          .from("staff_shift_assignments")
          .insert([
            {
              staff_id: staffId,
              shift_id: shiftId,
              day_of_week: dayOfWeek,
              restaurant_id: restaurantId,
              is_active: true,
              effective_from: new Date().toISOString().split("T")[0],
            },
          ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetShiftForm = () => {
    setEditingShift(null);
    setShiftForm({
      name: "",
      start_time: "06:00",
      end_time: "14:00",
      color: "#3B82F6",
      grace_period_minutes: 15,
      auto_clock_out_minutes: 120,
    });
  };

  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      color: shift.color,
      grace_period_minutes: shift.grace_period_minutes,
      auto_clock_out_minutes: shift.auto_clock_out_minutes,
    });
    setIsShiftDialogOpen(true);
  };

  const getShiftIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("morning")) return <Sunrise className="h-4 w-4" />;
    if (n.includes("evening")) return <Sunset className="h-4 w-4" />;
    if (n.includes("night")) return <Moon className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const getAssignment = (staffId: string, dayOfWeek: number) => {
    return assignments.find(
      (a) => a.staff_id === staffId && a.day_of_week === dayOfWeek
    );
  };

  const getShiftForAssignment = (assignment?: Assignment) => {
    if (!assignment) return null;
    return shifts.find((s) => s.id === assignment.shift_id);
  };

  // Bulk assignment
  const handleBulkAssign = async () => {
    if (!bulkShiftId || selectedStaff.size === 0 || bulkDays.size === 0) {
      toast({
        title: "Please select staff, shift, and days",
        variant: "destructive",
      });
      return;
    }

    setBulkAssigning(true);
    try {
      const newAssignments = [];
      for (const staffId of selectedStaff) {
        for (const day of bulkDays) {
          await supabase
            .from("staff_shift_assignments")
            .delete()
            .eq("staff_id", staffId)
            .eq("day_of_week", day);

          newAssignments.push({
            staff_id: staffId,
            shift_id: bulkShiftId,
            day_of_week: day,
            restaurant_id: restaurantId,
            is_active: true,
            effective_from: new Date().toISOString().split("T")[0],
          });
        }
      }

      const { error } = await supabase
        .from("staff_shift_assignments")
        .insert(newAssignments);

      if (error) throw error;

      toast({
        title: `Assigned ${selectedStaff.size} staff to ${bulkDays.size} days`,
      });
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      setIsBulkDialogOpen(false);
      setSelectedStaff(new Set());
      setBulkDays(new Set());
      setBulkShiftId("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkAssigning(false);
    }
  };

  // Export schedule
  const exportSchedule = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    let scheduleText = `Staff Schedule - Week of ${format(
      weekStart,
      "MMMM d, yyyy"
    )}\n`;
    scheduleText += "=".repeat(60) + "\n\n";

    staff.forEach((member) => {
      scheduleText += `${member.first_name} ${member.last_name}`;
      if (member.position) scheduleText += ` (${member.position})`;
      scheduleText += "\n";

      [0, 1, 2, 3, 4, 5, 6].forEach((day) => {
        const assignment = getAssignment(member.id, day);
        const shift = getShiftForAssignment(assignment);
        const dayDate = format(addDays(weekStart, day), "EEE, MMM d");
        if (shift) {
          scheduleText += `  ${dayDate}: ${shift.name} (${formatTime(
            shift.start_time
          )} - ${formatTime(shift.end_time)})\n`;
        } else {
          scheduleText += `  ${dayDate}: Off\n`;
        }
      });
      scheduleText += "\n";
    });

    const blob = new Blob([scheduleText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${format(weekStart, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Schedule Exported" });
  };

  const toggleAllStaff = () => {
    if (selectedStaff.size === staff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(staff.map((s) => s.id)));
    }
  };

  const toggleAllDays = () => {
    if (bulkDays.size === 7) {
      setBulkDays(new Set());
    } else {
      setBulkDays(new Set([0, 1, 2, 3, 4, 5, 6]));
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="shifts" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Shifts
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Assignments
          </TabsTrigger>
        </TabsList>

        {/* Shifts Tab */}
        <TabsContent value="shifts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Shift Definitions</h2>
            <Button
              onClick={() => {
                resetShiftForm();
                setIsShiftDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> New Shift
            </Button>
          </div>

          {shiftsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : shifts.filter((s) => s.is_active).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Shifts Created</h3>
                <p className="text-gray-500 mb-4">
                  Create your first shift to start scheduling staff.
                </p>
                <Button onClick={() => setIsShiftDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Shift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts
                .filter((s) => s.is_active)
                .map((shift) => (
                  <Card
                    key={shift.id}
                    className="border-l-4"
                    style={{ borderLeftColor: shift.color }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getShiftIcon(shift.name)}
                          <span className="font-semibold text-lg">
                            {shift.name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditShift(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteShiftMutation.mutate(shift.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Hours:</span>
                          <Badge
                            style={{ backgroundColor: shift.color }}
                            className="text-white"
                          >
                            {formatTime(shift.start_time)} -{" "}
                            {formatTime(shift.end_time)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Grace Period:</span>
                          <span>{shift.grace_period_minutes} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Auto Clock-Out:</span>
                          <span>
                            {shift.auto_clock_out_minutes} min after end
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Weekly Shift Assignments</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDialogOpen(true)}
              >
                <Copy className="h-4 w-4 mr-2" /> Bulk Assign
              </Button>
              <Button variant="outline" size="sm" onClick={exportSchedule}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              {shifts
                .filter((s) => s.is_active)
                .map((s) => (
                  <Badge
                    key={s.id}
                    style={{ backgroundColor: s.color }}
                    className="text-white text-xs"
                  >
                    {s.name}
                  </Badge>
                ))}
            </div>
          </div>

          {staff.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Active Staff</h3>
                <p className="text-gray-500">
                  Add staff members first to assign shifts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 w-48">Staff Member</th>
                      {DAY_ABBR.map((day) => (
                        <th key={day} className="text-center p-2 w-24">
                          <div className="font-medium">{day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="p-2">
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.position}
                          </div>
                        </td>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                          const assignment = getAssignment(member.id, day);
                          const shift = getShiftForAssignment(assignment);

                          return (
                            <td key={day} className="p-1 text-center">
                              <Select
                                value={shift?.id || "off"}
                                onValueChange={(value) => {
                                  if (value === "off") {
                                    if (assignment) {
                                      toggleAssignmentMutation.mutate({
                                        staffId: member.id,
                                        shiftId: assignment.shift_id,
                                        dayOfWeek: day,
                                        isAssigned: true,
                                      });
                                    }
                                  } else {
                                    toggleAssignmentMutation.mutate({
                                      staffId: member.id,
                                      shiftId: value,
                                      dayOfWeek: day,
                                      isAssigned: false,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger
                                  className="h-8 text-xs border-0"
                                  style={
                                    shift
                                      ? {
                                          backgroundColor: shift.color + "20",
                                          borderColor: shift.color,
                                        }
                                      : {}
                                  }
                                >
                                  <SelectValue>
                                    {shift ? (
                                      <span
                                        style={{ color: shift.color }}
                                        className="font-medium"
                                      >
                                        {shift.name.slice(0, 3)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Off</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="off">
                                    <span className="text-gray-500">
                                      Day Off
                                    </span>
                                  </SelectItem>
                                  {shifts
                                    .filter((s) => s.is_active)
                                    .map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: s.color }}
                                          />
                                          {s.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Shift Create/Edit Dialog */}
      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Edit Shift" : "Create New Shift"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Shift Name</Label>
              <Input
                value={shiftForm.name}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, name: e.target.value })
                }
                placeholder="e.g., Morning, Evening, Night"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {SHIFT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      shiftForm.color === color
                        ? "ring-2 ring-offset-2 ring-gray-600 scale-110"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setShiftForm({ ...shiftForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grace Period (min)</Label>
                <Input
                  type="number"
                  value={shiftForm.grace_period_minutes}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      grace_period_minutes: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Auto Clock-Out After End (min)</Label>
                <Input
                  type="number"
                  value={shiftForm.auto_clock_out_minutes}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      auto_clock_out_minutes: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsShiftDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveShiftMutation.mutate({
                  ...shiftForm,
                  id: editingShift?.id,
                })
              }
              disabled={saveShiftMutation.isPending || !shiftForm.name}
            >
              {saveShiftMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingShift ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assignment Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Assign Shifts</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Assign to Shift</Label>
              <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift..." />
                </SelectTrigger>
                <SelectContent>
                  {shifts
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name} ({formatTime(s.start_time)} -{" "}
                          {formatTime(s.end_time)})
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Select Staff ({selectedStaff.size} selected)</Label>
                <Button variant="ghost" size="sm" onClick={toggleAllStaff}>
                  {selectedStaff.size === staff.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                    onClick={() => {
                      const newSelected = new Set(selectedStaff);
                      if (newSelected.has(member.id)) {
                        newSelected.delete(member.id);
                      } else {
                        newSelected.add(member.id);
                      }
                      setSelectedStaff(newSelected);
                    }}
                  >
                    <Checkbox checked={selectedStaff.has(member.id)} />
                    <span className="text-sm">
                      {member.first_name} {member.last_name}
                    </span>
                    {member.position && (
                      <span className="text-xs text-gray-500">
                        ({member.position})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Select Days ({bulkDays.size} selected)</Label>
                <Button variant="ghost" size="sm" onClick={toggleAllDays}>
                  {bulkDays.size === 7 ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, idx) => (
                  <Button
                    key={day}
                    type="button"
                    variant={bulkDays.has(idx) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newDays = new Set(bulkDays);
                      if (newDays.has(idx)) {
                        newDays.delete(idx);
                      } else {
                        newDays.add(idx);
                      }
                      setBulkDays(newDays);
                    }}
                  >
                    {DAY_ABBR[idx]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={
                bulkAssigning ||
                !bulkShiftId ||
                selectedStaff.size === 0 ||
                bulkDays.size === 0
              }
            >
              {bulkAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftManagementContent;
