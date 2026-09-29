"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { api, getErrorMessage, getWebSocketUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, Button, Badge, Alert, Modal, ProgressBar } from "@/components/UIComponents";
import {
  Eye,
  RefreshCw,
  AlertTriangle,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Activity,
  Search,
  Filter,
  Camera,
  VideoOff,
  Maximize2,
  AlertOctagon,
  ArrowUpRight,
  Check,
  X,
  FileText,
  UserCheck,
  Zap,
  Radio,
  ExternalLink,
} from "lucide-react";

export interface LiveCandidateSessionItem {
  session_id: number;
  exam_id: number;
  exam_name: string;
  subject: string;
  student_id: number;
  student_name: string;
  student_email: string;
  registration_number?: string;
  status: string;
  started_at: string;
  submitted_at?: string;
  remaining_seconds: number;
  total_questions: number;
  answered_count: number;
  marked_for_review_count: number;
  camera_active: boolean;
  face_detected: boolean;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  face_absent_count: number;
  multiple_faces_count: number;
  off_screen_gaze_count: number;
  total_violations: number;
  suspicion_score: number;
  last_heartbeat_at?: string;
  is_streaming_live?: boolean;
  latest_event?: {
    id: number;
    event_type: string;
    severity: string;
    created_at?: string;
    event_data?: any;
  };
}

export interface LiveMonitoringSummary {
  total_active_candidates: number;
  total_completed: number;
  total_violations_recorded: number;
  total_flagged_suspicious: number;
  sessions: LiveCandidateSessionItem[];
}

export interface ExamOption {
  id: number;
  name: string;
  subject: string;
}

export interface LiveProctorTelemetry {
  camera_active?: boolean;
  face_detected?: boolean;
  multiple_faces?: boolean;
  tab_switch_count?: number;
  total_violations?: number;
}

/**
 * Individual Candidate Live Video Card component.
 * Manages dedicated WebRTC peer connection, live video streaming, and real-time status.
 */
function CandidateLiveVideoCard({
  session,
  role,
  countdownSeconds,
  signalingWs,
  isSignalingReady,
  isOnlineInSignaling,
  liveProctor,
  onInspect,
  formatCountdown,
  registerCardListener,
  unregisterCardListener,
  t,
}: {
  session: LiveCandidateSessionItem;
  role: "EXAMINER" | "ADMIN";
  countdownSeconds: number;
  signalingWs: WebSocket | null;
  isSignalingReady: boolean;
  isOnlineInSignaling: boolean;
  liveProctor?: LiveProctorTelemetry;
  onInspect: (s: LiveCandidateSessionItem) => void;
  formatCountdown: (sec: number) => string;
  registerCardListener: (sessionId: number, fn: (data: any) => void) => void;
  unregisterCardListener: (sessionId: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<
    "LIVE" | "CONNECTING" | "CAMERA_DISCONNECTED" | "CONNECTION_LOST" | "EXAM_ENDED"
  >(
    session.status !== "ACTIVE" && session.status !== "CAMERA_PAUSED"
      ? "EXAM_ENDED"
      : session.status === "CAMERA_PAUSED" || session.camera_active === false
      ? "CAMERA_DISCONNECTED"
      : "CONNECTING"
  );
  const [isEnlarged, setIsEnlarged] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const enlargedVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Derive effective camera & face status from real-time signaling telemetry or session payload
  const effectiveCameraActive =
    liveProctor?.camera_active !== undefined ? liveProctor.camera_active : session.camera_active;
  const effectiveFaceDetected =
    liveProctor?.face_detected !== undefined ? liveProctor.face_detected : session.face_detected;
  const effectiveMultipleFaces =
    liveProctor?.multiple_faces !== undefined ? liveProctor.multiple_faces : session.multiple_faces_count > 0;
  const effectiveTabSwitches =
    liveProctor?.tab_switch_count !== undefined ? liveProctor.tab_switch_count : session.tab_switch_count;

  // Sync stream to video elements whenever stream or enlarged state changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    if (enlargedVideoRef.current && stream) {
      enlargedVideoRef.current.srcObject = stream;
    }
  }, [stream, isEnlarged]);

  // WebRTC Peer Connection negotiation and live video stream reception
  useEffect(() => {
    if (session.status !== "ACTIVE" && session.status !== "CAMERA_PAUSED") {
      setConnectionState("EXAM_ENDED");
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setStream(null);
      return;
    }

    if (session.status === "CAMERA_PAUSED" || !effectiveCameraActive) {
      setConnectionState("CAMERA_DISCONNECTED");
      return;
    }

    if (!signalingWs || !isSignalingReady) {
      setConnectionState("CONNECTING");
      return;
    }

    let isSubscribed = true;

    const handleSignalingMessage = async (data: any) => {
      if (!isSubscribed) return;
      try {
        if (data.type === "offer") {
          // Candidate initiated SDP Offer, examiner creates Answer
          if (pcRef.current) {
            pcRef.current.close();
          }

          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
          });
          pcRef.current = pc;

          pc.ontrack = (event) => {
            if (!isSubscribed) return;
            const remoteStream = event.streams[0];
            setStream(remoteStream);
            setConnectionState("LIVE");
          };

          pc.onicecandidate = (event) => {
            if (event.candidate && signalingWs.readyState === WebSocket.OPEN) {
              signalingWs.send(
                JSON.stringify({
                  type: "ice_candidate",
                  session_id: session.session_id,
                  candidate: event.candidate,
                })
              );
            }
          };

          pc.oniceconnectionstatechange = () => {
            if (!isSubscribed) return;
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
              setConnectionState("CONNECTION_LOST");
            } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
              setConnectionState("LIVE");
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (signalingWs.readyState === WebSocket.OPEN) {
            signalingWs.send(
              JSON.stringify({
                type: "answer",
                session_id: session.session_id,
                sdp: answer,
              })
            );
          }
        } else if (data.type === "ice_candidate") {
          if (pcRef.current && data.candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err) {
        console.warn(`WebRTC negotiation error for session ${session.session_id}:`, err);
        setConnectionState("CONNECTION_LOST");
      }
    };

    registerCardListener(session.session_id, handleSignalingMessage);

    // Request stream from candidate
    setConnectionState("CONNECTING");
    if (signalingWs.readyState === WebSocket.OPEN) {
      signalingWs.send(
        JSON.stringify({
          type: "request_stream",
          session_id: session.session_id,
        })
      );
    }

    return () => {
      isSubscribed = false;
      unregisterCardListener(session.session_id);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setStream(null);
    };
  }, [
    session.session_id,
    session.status,
    signalingWs,
    isSignalingReady,
    effectiveCameraActive,
    registerCardListener,
    unregisterCardListener,
  ]);

  const isFinished = session.status !== "ACTIVE";
  const isViolationSub = session.status === "SUBMITTED_VIOLATION";
  const progressPct =
    session.total_questions > 0
      ? Math.min(100, Math.round((session.answered_count / session.total_questions) * 100))
      : 0;

  let riskColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  let riskLabel = t("low_risk");
  if (session.suspicion_score >= 60 || isViolationSub) {
    riskColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    riskLabel = t("high_risk");
  } else if (session.suspicion_score >= 30) {
    riskColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    riskLabel = t("medium_risk");
  }

  return (
    <Card className="border-slate-800 bg-[#0D1322]/80 backdrop-blur-md hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all shadow-sm flex flex-col justify-between overflow-hidden">
      {/* Card Header: Candidate Info & Status */}
      <div className="p-5 border-b border-slate-800/80 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/20 shadow-sm font-mono text-sm">
              {session.student_name ? session.student_name.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                {session.student_name}
              </h4>
              <div className="text-[11px] text-slate-400 font-mono">
                {session.registration_number || session.student_email}
              </div>
            </div>
          </div>

          {/* Connection State Badge */}
          <div>
            {connectionState === "LIVE" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                ● LIVE
              </span>
            ) : connectionState === "CONNECTING" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                ● CONNECTING
              </span>
            ) : connectionState === "CAMERA_DISCONNECTED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                ⚠ {session.status === "CAMERA_PAUSED" ? "PAUSED (CAMERA)" : "CAMERA OFF"}
              </span>
            ) : connectionState === "EXAM_ENDED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                ○ ENDED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ⚠ OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* Exam Name & Subject */}
        <div className="bg-[#080C14]/60 px-3 py-2 rounded-xl text-xs flex items-center justify-between border border-slate-800">
          <span className="font-semibold text-slate-200 truncate pr-2">
            {session.exam_name}
          </span>
          <span className="text-[11px] text-cyan-400 font-mono shrink-0">
            {session.subject}
          </span>
        </div>
      </div>

      {/* Live Video Preview Box */}
      <div className="px-5 pt-4">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#050811] border border-slate-800/90 shadow-inner group flex items-center justify-center">
          {connectionState === "LIVE" && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center select-none">
              {connectionState === "CONNECTING" ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-400 mx-auto" />
                  <span className="text-[11px] font-mono font-semibold text-cyan-300">
                    Connecting Live Video...
                  </span>
                </div>
              ) : connectionState === "CAMERA_DISCONNECTED" ? (
                <div className="space-y-1.5 text-rose-400">
                  <VideoOff className="h-7 w-7 mx-auto opacity-80" />
                  <span className="text-[11px] font-bold">
                    {session.status === "CAMERA_PAUSED" ? "Camera Disconnected - Exam Paused" : "Camera Disconnected"}
                  </span>
                </div>
              ) : connectionState === "EXAM_ENDED" ? (
                <div className="space-y-1.5 text-slate-500">
                  <CheckCircle2 className="h-7 w-7 mx-auto opacity-70" />
                  <span className="text-[11px] font-bold">Exam Session Completed</span>
                </div>
              ) : (
                <div className="space-y-1.5 text-amber-400">
                  <AlertTriangle className="h-7 w-7 mx-auto opacity-80" />
                  <span className="text-[11px] font-bold">Connection Lost</span>
                </div>
              )}
            </div>
          )}

          {/* Enlarge Stream Overlay Button */}
          {connectionState === "LIVE" && stream && (
            <button
              type="button"
              onClick={() => setIsEnlarged(true)}
              title="Enlarge Video Feed"
              className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/70 hover:bg-black text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Bottom Feed Status Pill */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
            <Radio className={`h-3 w-3 ${connectionState === "LIVE" ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
            <span>WebRTC {connectionState}</span>
          </div>
        </div>
      </div>

      {/* Card Body: Live Telemetry Metrics */}
      <div className="p-5 space-y-4 text-xs">
        {/* Countdown Timer & Progress */}
        <div className="grid grid-cols-2 gap-3 bg-[#080C14]/60 p-3 rounded-xl border border-slate-800">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-cyan-400" />
              {t("time_left")}
            </span>
            <span
              className={`text-sm font-black font-mono mt-0.5 block ${
                isFinished
                  ? "text-slate-500"
                  : countdownSeconds < 300
                  ? "text-rose-400 animate-pulse"
                  : "text-white"
              }`}
            >
              {formatCountdown(countdownSeconds)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="h-3 w-3 text-indigo-400" />
              {t("progress")}
            </span>
            <span className="text-sm font-bold font-mono mt-0.5 block text-white">
              {session.answered_count} / {session.total_questions} ({progressPct}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Camera & Face Real Telemetry Chips */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* Camera Status */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border ${
              effectiveCameraActive
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {effectiveCameraActive ? (
              <Camera className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <VideoOff className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-semibold">{t("camera_status")}</div>
              <div className="text-[10px] opacity-80">
                {effectiveCameraActive ? t("camera_active") : t("camera_inactive")}
              </div>
            </div>
          </div>

          {/* Face Detection Status */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border ${
              effectiveMultipleFaces
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold"
                : effectiveFaceDetected
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <UserCheck
              className={`h-3.5 w-3.5 shrink-0 ${
                effectiveMultipleFaces
                  ? "text-rose-400"
                  : effectiveFaceDetected
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            />
            <div>
              <div className="font-semibold">{t("face_status")}</div>
              <div className="text-[10px] opacity-80">
                {effectiveMultipleFaces
                  ? "Multiple Faces"
                  : effectiveFaceDetected
                  ? t("face_normal")
                  : t("face_warning")}
              </div>
            </div>
          </div>
        </div>

        {/* Violations Counter Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t("security_events")}
          </span>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-lg border ${
                effectiveTabSwitches > 0
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold"
                  : "bg-[#080C14] text-slate-400 border-slate-800"
              }`}
            >
              {t("tab_switches")}: {effectiveTabSwitches}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg border ${
                session.fullscreen_exit_count > 0
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold"
                  : "bg-[#080C14] text-slate-400 border-slate-800"
              }`}
            >
              {t("fullscreen_exits")}: {session.fullscreen_exit_count}
            </span>
            {session.multiple_faces_count > 0 && (
              <span className="px-2 py-0.5 rounded-lg border bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold">
                {t("multiple_faces")}: {session.multiple_faces_count}
              </span>
            )}
            {session.face_absent_count > 0 && (
              <span className="px-2 py-0.5 rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">
                {t("face_absent")}: {session.face_absent_count}
              </span>
            )}
          </div>
        </div>

        {/* Suspicion Score Gauge */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t("suspicion_score")}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${riskColor}`}>
            {session.suspicion_score}% • {riskLabel}
          </span>
        </div>
      </div>

      {/* Card Footer: Action */}
      <div className="p-4 bg-[#080C14]/60 border-t border-slate-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onInspect(session)}
          className="w-full text-xs py-2 bg-[#0D1322] hover:bg-slate-800 text-slate-200 border-slate-800 shadow-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5 text-indigo-400" />
          <span>{t("inspect_telemetry")}</span>
        </Button>
      </div>

      {/* Enlarged Live Video Modal */}
      {isEnlarged && (
        <Modal
          isOpen={isEnlarged}
          onClose={() => setIsEnlarged(false)}
          title={`Live Candidate Video — ${session.student_name}`}
        >
          <div className="space-y-4">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              <video
                ref={enlargedVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain transform scale-x-[-1]"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/90 text-white shadow-lg flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  ● LIVE WEBCAM STREAM
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#080C14] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Candidate</span>
                <span className="font-bold text-white truncate block">{session.student_name}</span>
              </div>
              <div className="bg-[#080C14] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Exam</span>
                <span className="font-semibold text-white truncate block">{session.exam_name}</span>
              </div>
              <div className="bg-[#080C14] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Time Left</span>
                <span className="font-mono font-bold text-cyan-400 block">{formatCountdown(countdownSeconds)}</span>
              </div>
              <div className="bg-[#080C14] p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Risk Level</span>
                <span className="font-bold text-amber-400 block">{session.suspicion_score}%</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEnlarged(false)}
                className="border-slate-800 text-slate-300 hover:text-white"
              >
                {t("close")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

/**
 * Main Live Monitoring Workspace for Examiner and Administrator.
 */
export default function LiveMonitoringWorkspace({ role }: { role: "EXAMINER" | "ADMIN" }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  // Data states
  const [summary, setSummary] = useState<LiveMonitoringSummary | null>(null);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter states
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10);

  // Inspection Modal state
  const [inspectedSession, setInspectedSession] = useState<LiveCandidateSessionItem | null>(null);
  const [inspectedEvents, setInspectedEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Countdown timers local state (updates tick every second)
  const [localSecondsMap, setLocalSecondsMap] = useState<Record<number, number>>({});

  // WebRTC Examiner Signaling State
  const [signalingWs, setSignalingWs] = useState<WebSocket | null>(null);
  const [isSignalingReady, setIsSignalingReady] = useState<boolean>(false);
  const [onlineSessionIds, setOnlineSessionIds] = useState<Set<number>>(new Set());
  const [liveProctorMap, setLiveProctorMap] = useState<Record<number, LiveProctorTelemetry>>({});

  // Registry for candidate card signaling message listeners: session_id -> callback
  const cardMessageListenersRef = useRef<Map<number, (data: any) => void>>(new Map());

  const registerCardListener = useCallback((sessionId: number, fn: (data: any) => void) => {
    cardMessageListenersRef.current.set(sessionId, fn);
  }, []);

  const unregisterCardListener = useCallback((sessionId: number) => {
    cardMessageListenersRef.current.delete(sessionId);
  }, []);

  // 1. Establish Examiner WebRTC Signaling Channel
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    let ws: WebSocket | null = null;
    let pingTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    try {
      const wsUrl = getWebSocketUrl(`/monitoring/ws/examiner?token=${encodeURIComponent(token)}`);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) return;
        setSignalingWs(ws);
        setIsSignalingReady(true);
        // Ping every 15s to keep WebSocket connection open
        pingTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 15000);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);

          if (data.type === "INITIAL_ONLINE_CANDIDATES") {
            const sids = new Set<number>((data.candidates || []).map((c: any) => c.session_id));
            setOnlineSessionIds(sids);
          } else if (data.type === "CANDIDATE_ONLINE") {
            setOnlineSessionIds((prev) => {
              const next = new Set(prev);
              next.add(data.session_id);
              return next;
            });
            // Trigger background telemetry refresh so card appears in list
            fetchData(false);
          } else if (data.type === "CANDIDATE_OFFLINE") {
            setOnlineSessionIds((prev) => {
              const next = new Set(prev);
              next.delete(data.session_id);
              return next;
            });
          } else if (data.type === "CANDIDATE_CAMERA_UPDATE") {
            setLiveProctorMap((prev) => ({
              ...prev,
              [data.session_id]: {
                ...prev[data.session_id],
                camera_active: data.data?.camera_active,
              },
            }));
          } else if (data.type === "CANDIDATE_PROCTOR_UPDATE") {
            setLiveProctorMap((prev) => ({
              ...prev,
              [data.session_id]: {
                ...prev[data.session_id],
                face_detected: data.data?.face_detected,
                multiple_faces: data.data?.multiple_faces,
                tab_switch_count: data.data?.tab_switch_count,
              },
            }));
          } else if (data.type === "offer" || data.type === "ice_candidate") {
            const listener = cardMessageListenersRef.current.get(data.session_id);
            if (listener) {
              listener(data);
            }
          }
        } catch (e) {
          console.warn("Signaling dispatch error:", e);
        }
      };

      ws.onerror = (e) => {
        console.warn("Examiner signaling connection error:", e);
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsSignalingReady(false);
          setSignalingWs(null);
        }
      };
    } catch (err) {
      console.warn("Failed to create examiner signaling WebSocket:", err);
    }

    return () => {
      isMounted = false;
      if (pingTimer) clearInterval(pingTimer);
      if (ws) {
        ws.close();
      }
      setSignalingWs(null);
      setIsSignalingReady(false);
    };
  }, []);

  // 2. Fetch Exams for dropdown filter
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get<any[]>("/exams");
        setExams(res.data.map((e) => ({ id: e.id, name: e.name, subject: e.subject })));
      } catch (err) {
        console.error("Failed to fetch exams:", err);
      }
    };
    fetchExams();
  }, []);

  // 3. Fetch Live Monitoring Data
  const fetchData = useCallback(
    async (showRefreshingSpinner = false) => {
      if (showRefreshingSpinner) setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (selectedExamId) params.append("exam_id", selectedExamId);
        if (statusFilter !== "ALL") params.append("status_filter", statusFilter);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());

        const res = await api.get<LiveMonitoringSummary>(`/monitoring/live?${params.toString()}`);
        setSummary(res.data);

        // Sync local seconds map
        const newMap: Record<number, number> = {};
        res.data.sessions.forEach((s) => {
          newMap[s.session_id] = s.remaining_seconds;
        });
        setLocalSecondsMap(newMap);
      } catch (err: any) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
        if (showRefreshingSpinner) setIsRefreshing(false);
      }
    },
    [selectedExamId, statusFilter, searchQuery]
  );

  // Initial and param change fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval polling for background database telemetry
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchData]);

  // Local second-by-second countdown ticker for active sessions
  useEffect(() => {
    const ticker = setInterval(() => {
      setLocalSecondsMap((prev) => {
        const updated = { ...prev };
        let hasActive = false;
        for (const [idStr, sec] of Object.entries(updated)) {
          const id = Number(idStr);
          if (sec > 0) {
            updated[id] = sec - 1;
            hasActive = true;
          }
        }
        return hasActive ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Format seconds to HH:MM:SS
  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return "00:00:00";
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Open detailed proctor telemetry modal
  const handleInspectSession = async (sessionItem: LiveCandidateSessionItem) => {
    setInspectedSession(sessionItem);
    setModalOpen(true);
    setIsLoadingEvents(true);
    try {
      const res = await api.get<any>(`/monitoring/session/${sessionItem.session_id}`);
      setInspectedEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to load session details:", err);
      setInspectedEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const sessions = summary?.sessions || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-sm">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {t("live_monitoring")}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  WebRTC Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("monitoring_subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Polling & Refresh Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D1322] border border-slate-800 rounded-xl text-xs text-slate-300 shadow-sm">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-medium hidden sm:inline">{t("auto_refresh")}:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value={5} className="bg-[#0D1322]">5s</option>
              <option value={10} className="bg-[#0D1322]">10s</option>
              <option value={30} className="bg-[#0D1322]">30s</option>
              <option value={0} className="bg-[#0D1322]">Off</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs bg-[#0D1322] hover:bg-slate-800 border-slate-800 text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : "text-indigo-400"}`} />
            <span>{t("refresh_now")}</span>
          </Button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Candidates */}
        <Card className="p-5 border-slate-800 bg-[#0D1322]/80 backdrop-blur-md shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("active_candidates")}
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {summary?.total_active_candidates ?? 0}
            </span>
            <span className="text-xs text-emerald-400 font-medium font-mono">
              ● {t("active_status")}
            </span>
          </div>
        </Card>

        {/* Completed Submissions */}
        <Card className="p-5 border-slate-800 bg-[#0D1322]/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("completed_submissions")}
            </span>
            <CheckCircle2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {summary?.total_completed ?? 0}
            </span>
            <span className="text-xs text-slate-400">{t("total")}</span>
          </div>
        </Card>

        {/* Violations Recorded */}
        <Card className="p-5 border-slate-800 bg-[#0D1322]/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("violations_detected")}
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-rose-400">
              {summary?.total_violations_recorded ?? 0}
            </span>
            <span className="text-xs text-slate-400">{t("security_events")}</span>
          </div>
        </Card>

        {/* Flagged Suspicious */}
        <Card className="p-5 border-slate-800 bg-[#0D1322]/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("flagged_suspicious")}
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">
              {summary?.total_flagged_suspicious ?? 0}
            </span>
            <span className="text-xs text-slate-400">&ge; 30% risk</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-800 bg-[#0D1322]/80 backdrop-blur-md shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder={t("search_candidates_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#080C14] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Exam Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-2 text-xs bg-[#080C14] border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">{t("all_exams")}</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.subject})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Segment Filter Buttons */}
            <div className="flex items-center p-0.5 bg-[#080C14] rounded-xl border border-slate-800">
              {[
                { key: "ALL", label: t("status_all") },
                { key: "ACTIVE", label: t("status_active") },
                { key: "SUBMITTED_VIOLATION", label: t("status_violation") },
                { key: "SUBMITTED", label: t("status_completed") },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setStatusFilter(btn.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === btn.key
                      ? "bg-indigo-600 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="danger" title={t("error")}>
          {errorMessage}
        </Alert>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-xs font-semibold tracking-wide text-slate-400">
            {t("loading")}
          </p>
        </div>
      ) : sessions.length === 0 ? (
        /* Empty State */
        <Card className="py-16 px-6 text-center border-slate-800 bg-[#0D1322]/50 shadow-sm">
          <div className="p-4 bg-indigo-500/10 rounded-2xl w-fit mx-auto text-indigo-400 mb-3 border border-indigo-500/20">
            <Eye className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-white">{t("no_active_candidates")}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedExamId || statusFilter !== "ALL"
              ? "Try clearing filters to display more candidate sessions."
              : "When candidates start exams, their live video streams and telemetry appear here automatically."}
          </p>
        </Card>
      ) : (
        /* Candidates Live Video & Telemetry Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sessions.map((s) => {
            const currentSeconds = localSecondsMap[s.session_id] ?? s.remaining_seconds;
            const isOnline = onlineSessionIds.has(s.session_id) || Boolean(s.is_streaming_live);
            const liveProctor = liveProctorMap[s.session_id];

            return (
              <CandidateLiveVideoCard
                key={s.session_id}
                session={s}
                role={role}
                countdownSeconds={currentSeconds}
                signalingWs={signalingWs}
                isSignalingReady={isSignalingReady}
                isOnlineInSignaling={isOnline}
                liveProctor={liveProctor}
                onInspect={handleInspectSession}
                formatCountdown={formatCountdown}
                registerCardListener={registerCardListener}
                unregisterCardListener={unregisterCardListener}
                t={t}
              />
            );
          })}
        </div>
      )}

      {/* Real Proctoring Audit Log Modal */}
      {inspectedSession && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`${t("proctor_audit_log")} — ${inspectedSession.student_name}`}
        >
          <div className="space-y-5 text-xs text-slate-200">
            {/* Candidate & Exam Summary Header */}
            <div className="bg-[#080C14] p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">{t("candidate")}:</span>
                <span className="font-bold text-white">
                  {inspectedSession.student_name} ({inspectedSession.registration_number || inspectedSession.student_email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("exam")}:</span>
                <span className="font-semibold text-white">
                  {inspectedSession.exam_name} • {inspectedSession.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("suspicion_score")}:</span>
                <span className="font-bold font-mono text-amber-400">
                  {inspectedSession.suspicion_score}% ({inspectedSession.total_violations} {t("violations_detected")})
                </span>
              </div>
            </div>

            {/* Event Audit Trail */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                {t("proctor_audit_log")}
              </h4>

              {isLoadingEvents ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-400 mb-1" />
                  <span>Loading proctoring event log...</span>
                </div>
              ) : inspectedEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-[#080C14] rounded-xl border border-slate-800">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                  <span>{t("no_events_recorded")}</span>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {inspectedEvents.map((evt, idx) => {
                    const isHigh = evt.severity === "HIGH" || evt.severity === "CRITICAL";
                    const isMed = evt.severity === "MEDIUM";

                    return (
                      <div
                        key={evt.id || idx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                          isHigh
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                            : isMed
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                            : "bg-[#080C14] border-slate-800 text-slate-200"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono">{evt.event_type}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isHigh
                                  ? "bg-rose-500/20 text-rose-400"
                                  : isMed
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {evt.severity}
                            </span>
                          </div>
                          {evt.event_data && Object.keys(evt.event_data).length > 0 && (
                            <pre className="text-[10px] text-slate-300 bg-[#080C14] p-1.5 rounded border border-slate-800 overflow-x-auto font-mono">
                              {JSON.stringify(evt.event_data, null, 2)}
                            </pre>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
              >
                {t("close")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
