"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarDays,
  Camera,
  MapPin,
  LogIn,
  LogOut,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceRecord = {
  id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: "present" | "absent" | "late" | "half_day";
};

type TodayStatus = {
  clocked_in: boolean;
  clocked_out: boolean;
  record: {
    id: number;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    selfie_url: string | null;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<
  AttendanceRecord["status"],
  { label: string; classes: string; icon: React.ReactNode }
> = {
  present: {
    label: "Present",
    classes: "bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  absent: {
    label: "Absent",
    classes: "bg-red-50 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  late: {
    label: "Late",
    classes: "bg-amber-50 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  half_day: {
    label: "Half Day",
    classes: "bg-violet-50 text-violet-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  }
  return options;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    const json = await res.json();
    return (json.display_name as string) ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmployeeAttendancePage() {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Today status
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);

  // Clock-in dialog state
  const [clockInOpen, setClockInOpen] = useState(false);
  const [step, setStep] = useState<"camera" | "preview">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Clock-out
  const [clockingOut, setClockingOut] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await api.get<TodayStatus>("/employee/attendance/today");
      setToday(res.data);
    } catch {
      setToday(null);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    setLoading(true);
    api
      .get<AttendanceRecord[]>("/employee/attendance", { params: { month: selectedMonth } })
      .then((r) => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  // ── Camera ───────────────────────────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setSubmitError("Camera access denied. Please allow camera access and try again.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
    setStep("preview");
  }

  function retake() {
    setCapturedImage(null);
    setStep("camera");
    setTimeout(startCamera, 100);
  }

  // ── Location ─────────────────────────────────────────────────────────────
  const detectLocation = useCallback((): Promise<{ lat: number; lng: number; address: string }> => {
    setLocLoading(true);
    setLocError("");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setLocError("Geolocation is not supported by your browser.");
        setLocLoading(false);
        reject();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const address = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, address });
          setLocLoading(false);
          resolve({ lat, lng, address });
        },
        (err) => {
          setLocError(
            err.code === 1
              ? "Location access denied. Please allow location."
              : "Unable to detect location. Try again."
          );
          setLocLoading(false);
          reject();
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, []);

  // ── Open clock-in dialog ─────────────────────────────────────────────────
  function openClockIn() {
    setCapturedImage(null);
    setLocation(null);
    setLocError("");
    setSubmitError("");
    setStep("camera");
    setClockInOpen(true);
    setTimeout(startCamera, 300);
    detectLocation();
  }

  function closeClockIn() {
    stopCamera();
    setClockInOpen(false);
  }

  // ── Submit clock-in ──────────────────────────────────────────────────────
  async function handleClockIn() {
    if (!capturedImage) return;

    let loc = location;
    if (!loc) {
      try {
        loc = await detectLocation();
      } catch {
        setSubmitError("Location is required to clock in.");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/employee/attendance/clock-in", {
        selfie: capturedImage,
        latitude: loc.lat,
        longitude: loc.lng,
        address: loc.address,
      });
      setClockInOpen(false);
      await fetchToday();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to clock in.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Clock out ────────────────────────────────────────────────────────────
  async function handleClockOut() {
    setClockingOut(true);
    try {
      await api.post("/employee/attendance/clock-out");
      await fetchToday();
    } catch {
      /* silent */
    } finally {
      setClockingOut(false);
    }
  }

  const present = records.filter((r) => r.status === "present").length;
  const absent  = records.filter((r) => r.status === "absent").length;
  const late    = records.filter((r) => r.status === "late").length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            My Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your attendance records by month.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Time In / Out Card ───────────────────────────────────────────── */}
      <Card className="border border-blue-100 bg-blue-50/40 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Today&apos;s Attendance
            <span className="text-xs font-normal text-gray-400 ml-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading status…
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Status info */}
              <div className="flex-1 space-y-1">
                {today?.record ? (
                  <>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <p className="text-xs text-gray-500">Clock In</p>
                        <p className="text-lg font-bold text-gray-900">
                          {today.record.clock_in ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Clock Out</p>
                        <p className="text-lg font-bold text-gray-900">
                          {today.record.clock_out ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            statusConfig[today.record.status as AttendanceRecord["status"]]
                              ?.classes ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {today.record.status}
                        </span>
                      </div>
                    </div>
                    {today.record.address && (
                      <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                        {today.record.address}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    You haven&apos;t clocked in yet today.
                  </p>
                )}
              </div>

              {/* Selfie thumbnail */}
              {today?.record?.selfie_url && (
                <img
                  src={today.record.selfie_url}
                  alt="Clock-in selfie"
                  className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
              )}

              {/* Action buttons */}
              <div className="flex gap-2 shrink-0">
                {!today?.clocked_in && (
                  <Button onClick={openClockIn} className="gap-2">
                    <LogIn className="h-4 w-4" /> Clock In
                  </Button>
                )}
                {today?.clocked_in && !today?.clocked_out && (
                  <Button
                    variant="outline"
                    onClick={handleClockOut}
                    disabled={clockingOut}
                    className="gap-2"
                  >
                    {clockingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Clock Out
                  </Button>
                )}
                {today?.clocked_in && today?.clocked_out && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Attendance complete
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary chips ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <span className="flex items-center gap-1.5 text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" /> Present: {present}
        </span>
        <span className="flex items-center gap-1.5 text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium">
          <XCircle className="h-3.5 w-3.5" /> Absent: {absent}
        </span>
        <span className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
          <Clock className="h-3.5 w-3.5" /> Late: {late}
        </span>
      </div>

      {/* ── Records Table ────────────────────────────────────────────────── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-16">
              No attendance records found for this month.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold text-gray-500">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500">Clock In</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500">Clock Out</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => {
                  const cfg = statusConfig[rec.status];
                  return (
                    <TableRow key={rec.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-sm text-gray-800">
                        {new Date(rec.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {rec.clock_in ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {rec.clock_out ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.classes}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Clock-In Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={clockInOpen}
        onOpenChange={(open) => {
          if (!open) closeClockIn();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Clock In — Take a Selfie
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Camera / Preview */}
            <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
              {step === "camera" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Selfie preview"
                  className="w-full h-full object-cover"
                />
              ) : null}

              {step === "camera" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-40 rounded-full border-2 border-white/60 border-dashed" />
                </div>
              )}
            </div>

            {/* Camera action */}
            <div className="flex justify-center gap-3">
              {step === "camera" ? (
                <Button onClick={capturePhoto} className="gap-2 px-6" type="button">
                  <Camera className="h-4 w-4" /> Capture Photo
                </Button>
              ) : (
                <Button variant="outline" onClick={retake} className="gap-2" type="button">
                  <RotateCcw className="h-4 w-4" /> Retake
                </Button>
              )}
            </div>

            {/* Location */}
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-500" /> Location
              </p>
              {locLoading ? (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Detecting location…
                </p>
              ) : locError ? (
                <div>
                  <p className="text-xs text-red-500">{locError}</p>
                  <button
                    type="button"
                    className="text-xs text-blue-500 hover:underline mt-1"
                    onClick={detectLocation}
                  >
                    Retry
                  </button>
                </div>
              ) : location ? (
                <p className="text-xs text-gray-700 leading-relaxed">{location.address}</p>
              ) : (
                <p className="text-xs text-gray-400">Location not yet detected.</p>
              )}
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            {/* Submit */}
            <Button
              className="w-full gap-2"
              disabled={!capturedImage || !location || submitting}
              onClick={handleClockIn}
              type="button"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {submitting ? "Clocking In…" : "Confirm Clock In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
