"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage, getWebSocketUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { StudentQuestion, ExamSession } from "@/types";
import { Badge, Button, Alert } from "@/components/UIComponents";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  Video,
  VideoOff,
  Maximize2,
  LogOut,
  Send,
  HelpCircle,
  XCircle,
  Sparkles,
  Lock,
  Eye,
  LayoutGrid,
  Upload,
  Camera,
  RotateCcw,
  Check,
  X
} from "lucide-react";

interface QuestionAnswerState {
  selectedOptionIds: number[];
  textAnswer: string;
  imagePath?: string;
  thumbnailPath?: string;
  isMarkedForReview: boolean;
}

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const { user } = useAuth();
  const { t } = useLanguage();

  // Session & Questions State
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswerState>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("Synced with Server");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fullscreen Pre-flight State
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState<boolean>(false);
  const [isFullscreenExitModalOpen, setIsFullscreenExitModalOpen] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Timer State (Server-Authoritative)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Anti-Cheat & Warnings State
  const [tabWarnings, setTabWarnings] = useState<number>(0);
  const [maxWarnings, setMaxWarnings] = useState<number>(3);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningModalMessage, setWarningModalMessage] = useState<string>("");
  const [isAutoSubmitted, setIsAutoSubmitted] = useState<boolean>(false);
  const [autoSubmitResultUrl, setAutoSubmitResultUrl] = useState<string>("");
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Webcam State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preflightVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Active session and interval refs
  const sessionActiveRef = useRef<boolean>(false);
  const lastViolationTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Exam Session from Server
  useEffect(() => {
    let isMounted = true;

    const startExamSession = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await api.post<ExamSession>(`/exams/${examId}/start-session`);
        if (!isMounted) return;

        const sessionData = res.data;
        setSession(sessionData);
        setQuestions(sessionData.questions || []);
        setRemainingSeconds(sessionData.remaining_seconds);
        const curWarn = sessionData.current_tab_warnings ?? sessionData.tab_switch_count ?? 0;
        setTabWarnings(curWarn);
        if (sessionData.maximum_tab_switch_warnings !== undefined) {
          setMaxWarnings(sessionData.maximum_tab_switch_warnings);
        }

        // Initialize answer states from server session and any saved drafts
        const initialAnswers: Record<number, QuestionAnswerState> = {};
        const savedMap = new Map<number, any>();
        (sessionData.saved_answers || []).forEach((sa) => {
          savedMap.set(sa.question_id, sa);
        });

        (sessionData.questions || []).forEach((q) => {
          const sa = savedMap.get(q.id);
          initialAnswers[q.id] = {
            selectedOptionIds: sa?.selected_option_ids || [],
            textAnswer: sa?.answer_text || "",
            imagePath: sa?.image_path || undefined,
            thumbnailPath: sa?.thumbnail_path || undefined,
            isMarkedForReview: Boolean(sa?.is_marked_for_review),
          };
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (examId) {
      startExamSession();
    }

    return () => {
      isMounted = false;
      sessionActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [examId]);

  // 2. Setup Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const enableWebcam = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 } },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          if (preflightVideoRef.current) {
            preflightVideoRef.current.srcObject = stream;
          }
          setCameraActive(true);
        }
      } catch (err) {
        console.warn("Webcam access denied or unavailable:", err);
        setCameraError("Webcam stream unavailable. Proctoring logged.");
      }
    };

    if (session) {
      enableWebcam();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [session]);

  // 3. User Enters Fullscreen Mode
  const handleEnterFullscreenAndBegin = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
    setHasEnteredFullscreen(true);
    setIsFullscreenExitModalOpen(false);
    sessionActiveRef.current = true;
  };

  // 4. Server-Authoritative Timer & Periodic Heartbeat
  useEffect(() => {
    if (!hasEnteredFullscreen || !session || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmit("TIME_EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = timer;

    // 30-second Server Heartbeat sync
    const heartbeat = setInterval(async () => {
      if (!sessionActiveRef.current || !session) return;
      try {
        const res = await api.get<{
          session_id: number;
          status: string;
          remaining_seconds: number;
          tab_switch_count: number;
          auto_submitted: boolean;
          result_id?: number;
          submission_reason?: string;
        }>(`/sessions/${session.session_id}/heartbeat`);

        if (res.data.status !== "ACTIVE" || res.data.auto_submitted) {
          sessionActiveRef.current = false;
          if (timerRef.current) clearInterval(timerRef.current);
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
          setIsAutoSubmitted(true);
          setShowWarningModal(true);
          const reasonMsg = res.data.submission_reason || (
            res.data.status === "TIME_EXPIRED"
              ? "Examination time expired."
              : "Maximum allowed proctoring violations reached."
          );
          setWarningModalMessage(reasonMsg);
          const targetUrl = res.data.result_id
            ? `/student/results?result_id=${res.data.result_id}&auto_submitted=${res.data.status}`
            : `/student/results?session_id=${session.session_id}&auto_submitted=${res.data.status}`;
          setAutoSubmitResultUrl(targetUrl);
          setTimeout(() => {
            router.push(targetUrl);
          }, 3500);
        } else {
          setRemainingSeconds(res.data.remaining_seconds);
          setTabWarnings(res.data.tab_switch_count);
        }
      } catch (err) {
        console.error("Heartbeat sync error:", err);
      }
    }, 30000);
    heartbeatRef.current = heartbeat;

    return () => {
      if (timer) clearInterval(timer);
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [hasEnteredFullscreen, session]);

  const stopWebcamTracks = useCallback(() => {
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (preflightVideoRef.current?.srcObject) {
        (preflightVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        preflightVideoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } catch (e) {}
  }, []);

  // 5. Anti-Cheat Security Violation Handler (Debounced)
  const logSecurityViolation = useCallback(
    async (eventType: "TAB_SWITCH" | "WINDOW_BLUR" | "FULLSCREEN_EXIT" | "FACE_ABSENT" | "MULTIPLE_FACES_DETECTED" | "OFF_SCREEN_GAZE" | string) => {
      if (!sessionActiveRef.current || !session) return;

      // Debounce violations within 1.5 seconds so same event doesn't fire duplicate
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1500) return;
      lastViolationTimeRef.current = now;

      try {
        const res = await api.post<{
          id: number;
          session_id: number;
          event_type: string;
          warning_issued: boolean;
          current_warnings: number;
          maximum_allowed: number;
          auto_submitted: boolean;
          session_status: string;
          submission_reason?: string;
          result_id?: number;
          message: string;
        }>(`/sessions/${session.session_id}/proctor-event`, {
          event_type: eventType,
          event_data: { type: eventType, timestamp: new Date().toISOString() },
          severity: "HIGH",
        });

        const data = res.data;
        setTabWarnings(data.current_warnings);
        setMaxWarnings(data.maximum_allowed);

        if (data.auto_submitted) {
          // 1. Stop exam interaction immediately
          sessionActiveRef.current = false;
          // 2. Stop countdown & heartbeat
          if (timerRef.current) clearInterval(timerRef.current);
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          // 3. Stop webcam tracks immediately
          stopWebcamTracks();
          // 4. Exit fullscreen if active
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
          // 5. Show clear auto-submit modal
          setIsAutoSubmitted(true);
          setShowWarningModal(true);
          const reasonMsg = data.submission_reason || "Maximum allowed proctoring violations reached.";
          setWarningModalMessage(reasonMsg);

          const targetUrl = data.result_id
            ? `/student/results?result_id=${data.result_id}&auto_submitted=${data.session_status}`
            : `/student/results?session_id=${session.session_id}&auto_submitted=${data.session_status}`;
          setAutoSubmitResultUrl(targetUrl);

          setTimeout(() => {
            router.push(targetUrl);
          }, 3500);
        } else if (data.warning_issued) {
          setShowWarningModal(true);
          setWarningModalMessage(
            `SECURITY VIOLATION DETECTED (${eventType}): Suspicious activity recorded. (${data.current_warnings} of ${data.maximum_allowed} warnings used). Exceeding this limit will trigger automatic disqualification.`
          );
        }
      } catch (err) {
        console.error("Proctor event logging failed:", err);
      }
    },
    [session, router, stopWebcamTracks]
  );

  // Listeners for Fullscreen Exit, Tab Switch & Window Blur
  useEffect(() => {
    if (!hasEnteredFullscreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && sessionActiveRef.current) {
        setIsFullscreenExitModalOpen(true);
        logSecurityViolation("FULLSCREEN_EXIT");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && sessionActiveRef.current) {
        logSecurityViolation("TAB_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      if (sessionActiveRef.current) {
        logSecurityViolation("WINDOW_BLUR");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [hasEnteredFullscreen, logSecurityViolation]);

  // 5b. Real-time Client-Side Face & Gaze Detection (TensorFlow.js MediaPipe)
  useEffect(() => {
    if (!cameraActive || !session || !hasEnteredFullscreen) return;

    let detector: any = null;
    let isCancelled = false;
    let faceAbsentStart: number | null = null;
    let checkTimer: NodeJS.Timeout | null = null;

    const setupFaceDetector = async () => {
      try {
        await import("@tensorflow/tfjs");
        const faceDetection = await import("@tensorflow-models/face-detection");
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        detector = await faceDetection.createDetector(model, {
          runtime: "tfjs",
          modelType: "short"
        });

        if (isCancelled) return;

        checkTimer = setInterval(async () => {
          if (!videoRef.current || !sessionActiveRef.current || videoRef.current.readyState < 2) return;
          try {
            const faces = await detector.estimateFaces(videoRef.current, { flipHorizontal: false });
            const now = Date.now();

            if (!faces || faces.length === 0) {
              if (!faceAbsentStart) {
                faceAbsentStart = now;
              } else if (now - faceAbsentStart >= 5000) {
                // 5 seconds continuous face absence recorded
                logSecurityViolation("FACE_ABSENT");
                faceAbsentStart = now;
              }
            } else {
              faceAbsentStart = null;
              if (faces.length > 1) {
                logSecurityViolation("MULTIPLE_FACES_DETECTED");
              } else if (faces.length === 1) {
                const face = faces[0];
                if (face.keypoints && face.keypoints.length >= 6) {
                  const nose = face.keypoints.find((k: any) => k.name === "noseTip");
                  const leftEye = face.keypoints.find((k: any) => k.name === "leftEye");
                  const rightEye = face.keypoints.find((k: any) => k.name === "rightEye");
                  if (nose && leftEye && rightEye) {
                    const eyeDist = Math.abs(rightEye.x - leftEye.x);
                    const noseOffset = nose.x - (leftEye.x + rightEye.x) / 2;
                    if (Math.abs(noseOffset) > eyeDist * 0.35) {
                      logSecurityViolation("OFF_SCREEN_GAZE");
                    }
                  }
                }
              }
            }
          } catch (e) {}
        }, 1500);
      } catch (err) {
        console.warn("TensorFlow face detection fallback:", err);
      }
    };

    setupFaceDetector();

    return () => {
      isCancelled = true;
      if (checkTimer) clearInterval(checkTimer);
      if (detector && typeof detector.dispose === "function") {
        try {
          detector.dispose();
        } catch (e) {}
      }
    };
  }, [cameraActive, session, hasEnteredFullscreen, logSecurityViolation]);

  // 5c. WebSocket Bi-Directional Heartbeat Connection (/ws/sessions/{id}/heartbeat)
  useEffect(() => {
    if (!session?.session_id || !hasEnteredFullscreen) return;

    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectWebSocket = () => {
      try {
        const wsUrl = getWebSocketUrl(`/ws/sessions/${session.session_id}/heartbeat`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.remaining_seconds !== undefined) {
              setRemainingSeconds(data.remaining_seconds);
            }
            if (data.violation_count !== undefined) {
              setTabWarnings(data.violation_count);
            }
            if (data.auto_submitted) {
              sessionActiveRef.current = false;
              setIsAutoSubmitted(true);
              setShowWarningModal(true);
              setWarningModalMessage("Auto-submitted due to session expiry or violation threshold.");
              const targetUrl = data.result_id
                ? `/student/results?result_id=${data.result_id}&auto_submitted=${data.status}`
                : `/student/results?session_id=${session.session_id}&auto_submitted=${data.status}`;
              setAutoSubmitResultUrl(targetUrl);
              setTimeout(() => {
                router.push(targetUrl);
              }, 3500);
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (!isDisposed && sessionActiveRef.current) {
            setTimeout(connectWebSocket, 5000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        console.warn("WebSocket heartbeat initialization:", err);
      }
    };

    connectWebSocket();

    return () => {
      isDisposed = true;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [session?.session_id, hasEnteredFullscreen]);

  // Anti-Cheat Security: Prevent context menu, copy, cut, paste, and common copy shortcuts
  useEffect(() => {
    if (!hasEnteredFullscreen || !sessionActiveRef.current) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "a", "u", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      if (e.key === "F12") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasEnteredFullscreen]);

  // Helper for counting words in text response
  const countWords = (text?: string): number => {
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  // Image Upload State & Handlers
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // Direct Camera Capture for IMAGE_UPLOAD questions
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [activeQuestionForCamera, setActiveQuestionForCamera] = useState<number | null>(null);
  const [isCameraCapturing, setIsCameraCapturing] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedPhotoFile, setCapturedPhotoFile] = useState<File | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);

  const openDirectCameraModal = async (questionId: number) => {
    setActiveQuestionForCamera(questionId);
    setCapturedPhotoUrl(null);
    setCapturedPhotoFile(null);
    setCameraModalOpen(true);
    setIsCameraCapturing(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
          audio: false,
        });
        captureStreamRef.current = stream;
        if (captureVideoRef.current) {
          captureVideoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn("Camera capture stream error:", err);
      alert("Unable to access camera. Please check camera permissions or use normal file upload.");
      closeDirectCameraModal();
    }
  };

  const closeDirectCameraModal = () => {
    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach((t) => t.stop());
      captureStreamRef.current = null;
    }
    setCameraModalOpen(false);
    setIsCameraCapturing(false);
    setCapturedPhotoUrl(null);
    setCapturedPhotoFile(null);
    setActiveQuestionForCamera(null);
  };

  const handleCapturePhoto = () => {
    if (!captureVideoRef.current || !captureCanvasRef.current) return;
    const video = captureVideoRef.current;
    const canvas = captureCanvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `solution_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setCapturedPhotoUrl(url);
      setCapturedPhotoFile(file);
      setIsCameraCapturing(false);
      if (captureStreamRef.current) {
        captureStreamRef.current.getTracks().forEach((t) => t.stop());
        captureStreamRef.current = null;
      }
    }, "image/jpeg", 0.92);
  };

  const handleRetakePhoto = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedPhotoFile(null);
    if (activeQuestionForCamera) {
      openDirectCameraModal(activeQuestionForCamera);
    }
  };

  const handleUseCapturedPhoto = async () => {
    if (!capturedPhotoFile || !activeQuestionForCamera) return;
    await handleImageUpload(activeQuestionForCamera, capturedPhotoFile);
    closeDirectCameraModal();
  };

  const handleImageUpload = async (questionId: number, file?: File) => {
    if (!file || !session) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Please upload a valid PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("question_id", questionId.toString());
      formData.append("file", file);

      const res = await api.post(`/sessions/${session.session_id}/upload-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const data = res.data;
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { selectedOptionIds: [], textAnswer: "", isMarkedForReview: false }),
          imagePath: data.image_path,
          thumbnailPath: data.thumbnail_path
        }
      }));
      setSaveStatus("Image Uploaded & Synced");
    } catch (err: any) {
      alert("Failed to upload image: " + getErrorMessage(err));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (questionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { selectedOptionIds: [], textAnswer: "", isMarkedForReview: false }),
        imagePath: undefined,
        thumbnailPath: undefined
      }
    }));
    saveCurrentAnswerToServer(
      questionId,
      answers[questionId]?.selectedOptionIds || [],
      answers[questionId]?.textAnswer || "",
      answers[questionId]?.isMarkedForReview,
      null
    );
  };

  // 6. Draft Answer Persistence to PostgreSQL
  const saveCurrentAnswerToServer = async (
    qId: number,
    optionIds: number[],
    text: string,
    markedForReview?: boolean,
    imagePathOverride?: string | null
  ) => {
    if (!session) return;
    setSaveStatus("Saving to cloud...");
    const isReview = markedForReview !== undefined ? markedForReview : Boolean(answers[qId]?.isMarkedForReview);
    const imgPath = imagePathOverride !== undefined ? imagePathOverride : answers[qId]?.imagePath || null;
    try {
      await api.post(`/sessions/${session.session_id}/save-answer`, {
        question_id: qId,
        selected_option_ids: optionIds,
        answer_text: text || null,
        text_answer: text || null,
        image_path: imgPath,
        is_marked_for_review: isReview
      });
      setSaveStatus("Saved to Cloud");
    } catch (err) {
      setSaveStatus("Offline draft");
    }
  };

  // Option selection
  const handleSelectOption = (questionId: number, optionId: number, isMulti: boolean) => {
    const current = answers[questionId] || {
      selectedOptionIds: [],
      textAnswer: "",
      isMarkedForReview: false,
    };

    let updatedOptionIds: number[] = [];
    if (isMulti) {
      updatedOptionIds = current.selectedOptionIds.includes(optionId)
        ? current.selectedOptionIds.filter((id) => id !== optionId)
        : [...current.selectedOptionIds, optionId];
    } else {
      updatedOptionIds = [optionId];
    }

    const updated = { ...current, selectedOptionIds: updatedOptionIds };
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    saveCurrentAnswerToServer(questionId, updatedOptionIds, current.textAnswer, current.isMarkedForReview);
  };

  // Text answer
  const handleTextAnswerChange = (questionId: number, val: string) => {
    const current = answers[questionId] || {
      selectedOptionIds: [],
      textAnswer: "",
      isMarkedForReview: false,
    };
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...current, textAnswer: val },
    }));
  };

  const handleBlurTextAnswer = (questionId: number) => {
    const current = answers[questionId];
    if (current) {
      saveCurrentAnswerToServer(questionId, current.selectedOptionIds, current.textAnswer, current.isMarkedForReview);
    }
  };

  // Clear answer
  const handleClearAnswer = (questionId: number) => {
    const current = answers[questionId] || {
      selectedOptionIds: [],
      textAnswer: "",
      isMarkedForReview: false,
    };
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...current, selectedOptionIds: [], textAnswer: "", imagePath: undefined, thumbnailPath: undefined },
    }));
    saveCurrentAnswerToServer(questionId, [], "", current.isMarkedForReview, null);
  };

  // Toggle Mark for Review
  const handleToggleMarkReview = (questionId: number) => {
    const current = answers[questionId] || {
      selectedOptionIds: [],
      textAnswer: "",
      isMarkedForReview: false,
    };
    const nextReview = !current.isMarkedForReview;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...current, isMarkedForReview: nextReview },
    }));
    saveCurrentAnswerToServer(questionId, current.selectedOptionIds, current.textAnswer, nextReview);
  };

  // 7. Exam Submission
  const handleConfirmSubmit = async () => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);
    sessionActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    stopWebcamTracks();
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    try {
      const res = await api.post(`/sessions/${session.session_id}/submit`);
      router.push(`/student/results?result_id=${res.data.result_id}`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async (reason: string) => {
    if (!session || !sessionActiveRef.current) return;
    sessionActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    stopWebcamTracks();
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsAutoSubmitted(true);
    setShowWarningModal(true);
    const reasonMsg = reason === "TIME_EXPIRED" ? "Examination time expired." : "Maximum allowed proctoring violations reached.";
    setWarningModalMessage(reasonMsg);

    try {
      const res = await api.post(`/sessions/${session.session_id}/submit`);
      const targetUrl = `/student/results?result_id=${res.data.result_id}&auto_submitted=${reason}`;
      setAutoSubmitResultUrl(targetUrl);
      setTimeout(() => {
        router.push(targetUrl);
      }, 3500);
    } catch (err) {
      const fallbackUrl = `/student/results?session_id=${session.session_id}&auto_submitted=${reason}`;
      setAutoSubmitResultUrl(fallbackUrl);
      setTimeout(() => {
        router.push(fallbackUrl);
      }, 3500);
    }
  };

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Question counts
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const answeredCount = Object.values(answers).filter(
    (a) => a.selectedOptionIds.length > 0 || a.textAnswer.trim().length > 0 || Boolean(a.imagePath)
  ).length;

  const markedCount = Object.values(answers).filter((a) => a.isMarkedForReview).length;
  const unansweredCount = totalQuestions - answeredCount;

  // 8. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#18181B] text-white space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E06A26]"></div>
        <p className="text-sm font-semibold tracking-wide text-stone-300">
          Initializing Authoritative Examination Session from Server...
        </p>
      </div>
    );
  }

  // 9. Error State (e.g. Unregistered, Window Closed, or Attempt Completed)
  if (errorMessage && !session) {
    const isReattemptRequired =
      errorMessage.includes("REATTEMPT_ACCESS_REQUIRED") ||
      errorMessage.toLowerCase().includes("previous attempt");

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#18181B]">
        <div className="max-w-md w-full bg-[#242429] p-8 rounded-3xl shadow-2xl border border-[#3F3F46] text-center space-y-5">
          <div className={`p-3.5 rounded-2xl w-fit mx-auto border ${
            isReattemptRequired
              ? "bg-[#E06A26]/10 text-[#E06A26] border-[#E06A26]/30"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {isReattemptRequired ? <ShieldAlert className="h-10 w-10 text-[#E06A26]" /> : <XCircle className="h-10 w-10 text-red-400" />}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isReattemptRequired ? "Examination Completed" : "Access Prohibited"}
          </h2>
          <p className="text-xs text-stone-300 leading-relaxed bg-[#18181B] p-4 rounded-xl border border-[#3F3F46]">
            {isReattemptRequired
              ? "Your attempt has been completed. No additional attempt is currently available."
              : errorMessage}
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            {isReattemptRequired && (
              <Button
                variant="outline"
                onClick={() => router.push(`/student/results?exam_id=${examId}`)}
                className="w-full text-xs py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-750"
              >
                View Scorecard & Assessment Review
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => router.push("/student")}
              className="w-full text-xs py-2.5 bg-[#E06A26] hover:bg-[#C95716] text-white font-bold border-0 shadow-md"
            >
              Return to Student Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 10. Pre-Flight Fullscreen Entrance Overlay
  if (!hasEnteredFullscreen) {
    return (
      <div className="min-h-screen bg-[#1C1C1F] text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[#242428] border border-[#2F2F36] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#E06A26] text-white rounded-2xl border border-[#C95716] shadow-md">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Proctored Examination Lock</h1>
              <p className="text-xs text-[#FAF8F5]/70">Institutional Security & Fullscreen Verification</p>
            </div>
          </div>

          <div className="bg-[#171719] p-4 rounded-2xl border border-[#2F2F36] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B6B76]">Assessment:</span>
              <span className="font-bold text-white">{session?.exam_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B76]">Subject:</span>
              <span className="font-semibold text-[#FAF8F5]/80">{session?.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B76]">Candidate:</span>
              <span className="font-semibold text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B76]">Registration #:</span>
              <span className="font-mono font-bold text-[#FAF8F5]">
                {user?.registration_number || "STU-2026-000001"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B76]">Duration:</span>
              <span className="font-bold text-[#2B7853]">{session?.duration_minutes} Minutes</span>
            </div>
          </div>

          {/* Webcam Preview Check */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#6B6B76] uppercase tracking-wider flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#E06A26]" />
              Camera Feed Verification
            </label>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#171719] border border-[#2F2F36] flex items-center justify-center">
              <video
                ref={preflightVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              {!cameraActive && (
                <div className="text-center p-3 text-[#6B6B76] text-xs">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 text-[#6B6B76]" />
                  <span>{cameraError || "Camera initializing... please allow browser camera permissions."}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#FEF7EC]/10 border border-[#FDE68A]/20 rounded-2xl p-3.5 text-[11px] text-[#D97706] space-y-1">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Examination Regulations:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[#FAF8F5]/90 pl-1">
              <li>Assessment must be completed exclusively in Fullscreen Mode.</li>
              <li>Exiting fullscreen, switching browser tabs, or defocusing is recorded.</li>
              <li>Reaching {session?.maximum_tab_switch_warnings ?? 2} security warnings will automatically submit your exam.</li>
            </ul>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleEnterFullscreenAndBegin}
            className="w-full bg-[#E06A26] hover:bg-[#C95716] border border-[#C95716] text-white font-bold text-sm shadow-xl"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Enter Fullscreen & Begin Assessment
          </Button>
        </div>
      </div>
    );
  }

  // 11. Main Proctored Examination Workspace
  return (
    <div className="min-h-screen bg-[#171719] text-slate-100 flex flex-col select-none">
      {/* Top Authoritative Status Bar */}
      <header className="bg-[#1C1C1F]/95 backdrop-blur-md border-b border-[#2F2F36] px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#E06A26] text-white rounded-xl border border-[#C95716]">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                {session?.exam_name} • {session?.subject}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-[#6B6B76]">
                <span className="font-mono text-[#FAF8F5]">{user?.registration_number}</span>
                <span>•</span>
                <span className="text-[#2B7853] font-semibold">● Active</span>
                <span>•</span>
                <span className="text-[#6B6B76]">{saveStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Server-Authoritative Real Live Countdown Timer */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-[#6B6B76] font-bold uppercase tracking-wider">{t("time_remaining")}</span>
          <div
            className={`px-4 py-1 rounded-xl font-mono text-base font-black flex items-center gap-2 transition-all ${
              remainingSeconds < 300
                ? "bg-[#C85332]/20 text-[#FEF3EC] border border-[#C85332]/50 animate-pulse"
                : "bg-[#242428] text-white border border-[#2F2F36]"
            }`}
          >
            <Clock className={`h-4 w-4 ${remainingSeconds < 300 ? "text-[#C85332]" : "text-[#E06A26]"}`} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* Right Security & Submission Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Palette Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#242428] text-[#FAF8F5] border border-[#2F2F36] hover:bg-[#2C2C32] transition-colors"
            title="Question Palette"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Palette</span>
          </button>

          {/* Real Tab Warnings Count */}
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold ${
              tabWarnings > 0
                ? "bg-[#C85332]/20 text-[#FEF3EC] border border-[#C85332]/40"
                : "bg-[#242428] text-[#FAF8F5] border border-[#2F2F36]"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
            <span>
              Warnings: {tabWarnings} / {maxWarnings}
            </span>
          </div>

          <Button
            variant="success"
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="font-bold shadow-sm"
          >
            <Send className="h-3.5 w-3.5 sm:mr-1" /> Finish & Submit
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center / Left: Question Viewer */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {currentQuestion ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Question Header */}
              <div className="bg-[#1C1C1F] border border-[#2F2F36] rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-xl bg-[#E06A26] text-white font-extrabold text-sm flex items-center justify-center border border-[#C95716]">
                    {currentIndex + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-[#FAF8F5] uppercase tracking-wider">
                      {t("question")} {currentIndex + 1} {t("of")} {totalQuestions}
                    </div>
                    <div className="text-[11px] text-[#6B6B76] font-mono">
                      Type: {currentQuestion.question_type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EFF7F2]/10 text-[#2B7853] border border-[#2B7853]/30 font-mono">
                    +{currentQuestion.marks} pts
                  </span>
                  {(currentQuestion.negative_marks ?? 0) > 0 && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FEF3EC]/10 text-[#C85332] border border-[#C85332]/30 font-mono">
                      -{currentQuestion.negative_marks} pts
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleMarkReview(currentQuestion.id)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      answers[currentQuestion.id]?.isMarkedForReview
                        ? "bg-[#FEF7EC]/20 border-[#D97706]/50 text-[#D97706]"
                        : "bg-[#242428] border-[#2F2F36] text-[#6B6B76] hover:text-white"
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {answers[currentQuestion.id]?.isMarkedForReview ? t("unmark_review") : t("mark_review")}
                  </button>
                </div>
              </div>

              {/* Question Text & Answer Input */}
              <div className="bg-[#1C1C1F] border border-[#2F2F36] rounded-2xl p-6 space-y-4 shadow-sm">
                <p className="text-base sm:text-lg font-medium text-white leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.question_text}
                </p>

                {/* MCQ & Multi-Select Options */}
                {["MCQ", "MULTI_SELECT"].includes(currentQuestion.question_type) && (
                  <div className="space-y-3 pt-2">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isMulti = currentQuestion.question_type === "MULTI_SELECT";
                      const currentSelected = answers[currentQuestion.id]?.selectedOptionIds || [];
                      const isSelected = currentSelected.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQuestion.id, opt.id, isMulti)}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#E06A26]/15 border-[#E06A26] text-white shadow-sm ring-1 ring-[#E06A26]/40"
                              : "bg-[#242428] border-[#2F2F36] hover:bg-[#2C2C32] text-[#FAF8F5]"
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-${isMulti ? "md" : "full"} flex items-center justify-center text-xs font-bold border transition-colors ${
                              isSelected
                                ? "bg-[#E06A26] border-[#C95716] text-white"
                                : "border-[#2F2F36] bg-[#171719] text-[#6B6B76]"
                            }`}
                          >
                            {isSelected ? "✓" : String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="text-sm font-medium leading-relaxed">{opt.option_text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text Answer with Live Word & Character Counter */}
                {["SHORT_ANSWER", "LONG_ANSWER"].includes(currentQuestion.question_type) && (() => {
                  const isShort = currentQuestion.question_type === "SHORT_ANSWER";
                  const maxWords = isShort ? 100 : 600;
                  const minWords = isShort ? 0 : 10;
                  const currentText = answers[currentQuestion.id]?.textAnswer || "";
                  const wordCount = countWords(currentText);
                  const charCount = currentText.length;
                  const isExceeded = wordCount > maxWords;
                  const isBelowMin = !isShort && wordCount > 0 && wordCount < minWords;

                  return (
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                          Your Written Response {isShort ? "(Max 100 words)" : "(Min 10, Max 600 words)"}
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2.5 py-0.5 rounded-lg border bg-stone-900 border-stone-800 text-stone-400">
                            {t("characters")}: {charCount}
                          </span>
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-lg border ${
                              isExceeded
                                ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse"
                                : isBelowMin
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                : wordCount > 0
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                : "bg-stone-900 text-stone-400 border-stone-800"
                            }`}
                          >
                            {t("words")}: {wordCount} / {maxWords} {isExceeded ? `(${t("limit_exceeded")}!)` : isBelowMin ? "(Min 10 words)" : ""}
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={isShort ? 4 : 8}
                        value={currentText}
                        onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                        onBlur={() => handleBlurTextAnswer(currentQuestion.id)}
                        placeholder={isShort ? "Type your short answer (maximum 100 words)..." : "Provide comprehensive reasoning and explanation (10 to 600 words)..."}
                        className={`w-full px-4 py-3 bg-[#18181B] border rounded-xl text-white placeholder-stone-500 focus:outline-none text-sm transition-all ${
                          isExceeded
                            ? "border-red-500 ring-1 ring-red-500"
                            : "border-stone-700 focus:border-[#E06A26] focus:ring-1 focus:ring-[#E06A26]"
                        }`}
                      />
                      {isExceeded && (
                        <p className="text-xs text-red-400 font-medium">
                          Word limit exceeded. Please edit your answer to be within {maxWords} words.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* IMAGE_UPLOAD Question Type with Direct Camera Capture & File Upload */}
                {currentQuestion.question_type === "IMAGE_UPLOAD" && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        Diagram / Handwritten Solution (PNG, JPEG, WEBP - Max 5MB)
                      </label>
                      {answers[currentQuestion.id]?.imagePath && (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Solution Attached
                        </span>
                      )}
                    </div>

                    {answers[currentQuestion.id]?.imagePath ? (
                      <div className="p-4 bg-[#18181B] border border-stone-700 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-32 h-32 rounded-xl overflow-hidden bg-black/60 border border-stone-700 flex items-center justify-center shrink-0">
                          <img
                            src={
                              answers[currentQuestion.id]?.thumbnailPath
                                ? `http://127.0.0.1:8000${answers[currentQuestion.id]?.thumbnailPath}`
                                : `http://127.0.0.1:8000${answers[currentQuestion.id]?.imagePath}`
                            }
                            alt="Uploaded solution preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2 flex-1 text-center sm:text-left">
                          <p className="text-sm font-semibold text-white">Solution Image Saved</p>
                          <p className="text-xs text-stone-400 font-mono break-all">
                            {answers[currentQuestion.id]?.imagePath}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 transition-colors">
                              <span>Replace File</span>
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                onChange={(e) => handleImageUpload(currentQuestion.id, e.target.files?.[0])}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => openDirectCameraModal(currentQuestion.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#E06A26]/10 hover:bg-[#E06A26]/20 border border-[#E06A26]/30 text-[#E06A26] transition-colors flex items-center gap-1.5"
                            >
                              <Camera className="h-3.5 w-3.5" /> Retake with Camera
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(currentQuestion.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Option 1: File Upload */}
                        <div className="border-2 border-dashed border-stone-700 hover:border-stone-500 rounded-2xl p-6 text-center transition-colors bg-[#18181B]/50 flex flex-col items-center justify-center">
                          <input
                            type="file"
                            id={`upload-${currentQuestion.id}`}
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={(e) => handleImageUpload(currentQuestion.id, e.target.files?.[0])}
                          />
                          <label
                            htmlFor={`upload-${currentQuestion.id}`}
                            className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full"
                          >
                            <div className="h-11 w-11 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
                              <Upload className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-white">Upload Image File</span>
                            <span className="text-[11px] text-stone-400">PNG, JPG, or WEBP up to 5MB</span>
                          </label>
                          {isUploadingImage && (
                            <p className="text-xs text-amber-400 mt-2 animate-pulse">Uploading and generating thumbnail...</p>
                          )}
                        </div>

                        {/* Option 2: Direct Camera Capture */}
                        <div className="border-2 border-dashed border-[#E06A26]/40 hover:border-[#E06A26] rounded-2xl p-6 text-center transition-colors bg-[#E06A26]/5 flex flex-col items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openDirectCameraModal(currentQuestion.id)}
                            className="flex flex-col items-center justify-center gap-2 w-full focus:outline-none"
                          >
                            <div className="h-11 w-11 rounded-full bg-[#E06A26]/20 border border-[#E06A26]/40 flex items-center justify-center text-[#E06A26]">
                              <Camera className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-white">Capture Using Camera</span>
                            <span className="text-[11px] text-stone-400">Snap photo directly from device</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Question Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#2F2F36]">
                  <button
                    onClick={() => handleClearAnswer(currentQuestion.id)}
                    className="text-xs font-medium text-[#6B6B76] hover:text-white transition-colors"
                  >
                    {t("clear_response")}
                  </button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="bg-[#242428] hover:bg-[#2C2C32] border-[#2F2F36] text-[#FAF8F5]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> {t("previous")}
                    </Button>

                    {currentIndex < totalQuestions - 1 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="bg-[#E06A26] hover:bg-[#C95716] border border-[#C95716]"
                      >
                        {t("next")} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setShowSubmitModal(true)}
                        className="font-bold shadow-sm"
                      >
                        {t("review_and_submit")} <Send className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-[#6B6B76]">No questions available in this session.</div>
          )}
        </main>

        {/* Right Sidebar: Real Webcam & Question Palette */}
        <aside className="w-80 border-l border-[#2F2F36] bg-[#1C1C1F]/95 p-6 flex flex-col justify-between hidden md:flex space-y-6 overflow-y-auto">
          {/* 1. Live Proctoring Webcam View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B76] flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-[#E06A26]" />
                Live Proctoring
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#FEF3EC] bg-[#C85332]/20 px-2 py-0.5 rounded-full border border-[#C85332]/30 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C85332]"></span> REC
              </span>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#171719] border border-[#2F2F36] flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              {!cameraActive && (
                <div className="text-center p-3 text-[#6B6B76] text-xs">
                  <VideoOff className="h-6 w-6 mx-auto mb-1 text-[#6B6B76]" />
                  <span>{cameraError || "Camera initializing..."}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Question Status Summary */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B76]">Status Summary</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#EFF7F2]/10 border border-[#2B7853]/25 p-2 rounded-xl">
                <div className="text-base font-bold text-[#2B7853] font-mono">{answeredCount}</div>
                <div className="text-[10px] text-[#6B6B76]">Answered</div>
              </div>
              <div className="bg-[#FEF7EC]/10 border border-[#D97706]/25 p-2 rounded-xl">
                <div className="text-base font-bold text-[#D97706] font-mono">{markedCount}</div>
                <div className="text-[10px] text-[#6B6B76]">Review</div>
              </div>
              <div className="bg-[#242428] border border-[#2F2F36] p-2 rounded-xl">
                <div className="text-base font-bold text-[#FAF8F5] font-mono">{unansweredCount}</div>
                <div className="text-[10px] text-[#6B6B76]">Remaining</div>
              </div>
            </div>
          </div>

          {/* 3. Question Palette Grid */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B76]">Question Palette</span>
              <span className="text-[10px] text-[#6B6B76] font-mono">{questions.length} total</span>
            </div>

            {/* 4-State Palette Legend */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#FAF8F5]/80 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2B7853]"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2F2F36]"></span>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]"></span>
                <span>Marked Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E06A26]"></span>
                <span>Answered & Review</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(ans && (ans.selectedOptionIds.length > 0 || ans.textAnswer.trim().length > 0));
                const isMarked = Boolean(ans && ans.isMarkedForReview);

                let btnStyle = "bg-[#242428] text-[#6B6B76] border-[#2F2F36] hover:bg-[#2C2C32]";
                if (isAnswered && isMarked) {
                  // ANSWERED_AND_MARKED_FOR_REVIEW
                  btnStyle = "bg-[#E06A26]/30 text-[#FED7AA] border-[#E06A26] font-bold";
                } else if (isMarked) {
                  // MARKED_FOR_REVIEW
                  btnStyle = "bg-[#FEF7EC]/20 text-[#D97706] border-[#D97706]/50 font-bold";
                } else if (isAnswered) {
                  // ANSWERED
                  btnStyle = "bg-[#EFF7F2]/20 text-[#2B7853] border-[#2B7853]/50 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold border transition-all ${btnStyle} ${
                      isCurrent ? "ring-2 ring-[#E06A26] ring-offset-2 ring-offset-[#1C1C1F] border-[#E06A26] text-white" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Final Submit Button */}
          <Button
            variant="success"
            size="md"
            onClick={() => setShowSubmitModal(true)}
            className="w-full font-bold shadow-md"
          >
            Review & Final Submit
          </Button>
        </aside>
      </div>

      {/* Fullscreen Exit Alert Modal */}
      {isFullscreenExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full w-fit mx-auto border border-rose-500/30">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Fullscreen Lock Exited!</h3>
            <p className="text-xs text-rose-200 leading-relaxed">
              Exiting full-screen examination mode is recorded as a security violation. Return to full screen immediately to avoid session termination.
            </p>
            <Button
              variant="primary"
              onClick={handleEnterFullscreenAndBegin}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5"
            >
              Re-enter Fullscreen Now
            </Button>
          </div>
        </div>
      )}

      {/* Tab Switch Warning / Auto-Submit Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full w-fit mx-auto border border-rose-500/30">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {isAutoSubmitted ? "Exam Automatically Submitted" : "Security Violation Alert"}
            </h3>
            <div className="text-xs text-rose-200 leading-relaxed space-y-1.5">
              {isAutoSubmitted ? (
                <div className="space-y-2">
                  <p className="font-semibold text-rose-300">Reason:</p>
                  <p className="text-white font-medium">{warningModalMessage}</p>
                  <p className="text-slate-400 pt-1">Your examination has been authoritatively submitted and graded.</p>
                </div>
              ) : (
                <p>{warningModalMessage}</p>
              )}
            </div>
            <div className="pt-2">
              {isAutoSubmitted ? (
                <Button
                  variant="primary"
                  onClick={() => router.push(autoSubmitResultUrl || `/student/results?session_id=${session?.session_id}`)}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5"
                >
                  View Scorecard
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setShowWarningModal(false)}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2"
                >
                  I Acknowledge & Return to Exam
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#E06A26]/20 text-[#E06A26] rounded-xl border border-[#E06A26]/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Submit Examination?</h3>
                <p className="text-xs text-slate-400">Please review your submission summary below.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Questions:</span>
                <span className="font-bold text-white">{totalQuestions}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Questions Answered:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Marked for Review:</span>
                <span className="font-bold">{markedCount}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Unanswered:</span>
                <span className="font-bold">{unansweredCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Once submitted, your answers will be authoritatively graded against the examination key with negative marking rules applied. You will not be able to resume this session.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs py-2"
              >
                Continue Exam
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSubmit}
                isLoading={isSubmitting}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 border-0"
              >
                Confirm Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Camera Capture Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#242429] border border-stone-700 rounded-3xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#E06A26]/20 text-[#E06A26] rounded-xl border border-[#E06A26]/30">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Direct Solution Camera Capture</h3>
                  <p className="text-xs text-stone-400">Capture your handwritten answer sheet or diagram</p>
                </div>
              </div>
              <button
                onClick={closeDirectCameraModal}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Hidden canvas for taking snapshot */}
            <canvas ref={captureCanvasRef} className="hidden" />

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-stone-800 flex items-center justify-center">
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured handwritten solution"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={captureVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* Status overlay */}
              {capturedPhotoUrl && (
                <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                  <Check className="h-3.5 w-3.5" /> Photo Captured
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={closeDirectCameraModal}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700 text-xs py-2 px-4"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {capturedPhotoUrl ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRetakePhoto}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 text-xs py-2 px-4 gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retake Photo
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUseCapturedPhoto}
                      className="bg-[#E06A26] hover:bg-[#C95716] text-white font-bold text-xs py-2 px-5 gap-1.5 border-0 shadow-md"
                    >
                      <Check className="h-4 w-4" /> Use This Photo
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleCapturePhoto}
                    className="bg-[#E06A26] hover:bg-[#C95716] text-white font-bold text-xs py-2.5 px-6 gap-2 border-0 shadow-lg"
                  >
                    <Camera className="h-4 w-4" /> Capture Photo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
