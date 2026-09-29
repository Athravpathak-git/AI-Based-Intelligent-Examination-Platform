"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage, getWebSocketUrl } from "@/lib/api";
import { useLanguage, LanguageSwitcher } from "@/lib/i18n";
import { getLocalizedQuestionText, getLocalizedOptionText, getWrittenPromptLabels } from "@/lib/questionTranslations";
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
  const { t, language } = useLanguage();

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] text-white space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A04A]"></div>
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#141414]">
        <div className="max-w-md w-full bg-[#202020] p-8 rounded-3xl shadow-2xl border border-[#333333] text-center space-y-5">
          <div className={`p-3.5 rounded-2xl w-fit mx-auto border ${
            isReattemptRequired
              ? "bg-[#C5A04A]/10 text-[#C5A04A] border-[#C5A04A]/30"
              : "bg-[#B8544F]/10 text-[#B8544F] border-[#B8544F]/20"
          }`}>
            {isReattemptRequired ? <ShieldAlert className="h-10 w-10 text-[#C5A04A]" /> : <XCircle className="h-10 w-10 text-[#B8544F]" />}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isReattemptRequired ? "Examination Completed" : "Access Prohibited"}
          </h2>
          <p className="text-xs text-stone-300 leading-relaxed bg-[#141414] p-4 rounded-xl border border-[#333333]">
            {isReattemptRequired
              ? "Your attempt has been completed. No additional attempt is currently available."
              : errorMessage}
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            {isReattemptRequired && (
              <Button
                variant="outline"
                onClick={() => router.push(`/student/results?exam_id=${examId}`)}
                className="w-full text-xs py-2.5 bg-[#141414] hover:bg-[#282828] text-[#F4F1E8] border-[#333333]"
              >
                View Scorecard & Assessment Review
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => router.push("/student")}
              className="w-full text-xs py-2.5 bg-[#C5A04A] hover:bg-[#D4AF37] text-[#141414] font-bold border-0 shadow-md"
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
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[#202020] border border-[#333333] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-[#C5A04A] text-[#141414] rounded-2xl border border-[#C5A04A]/40 shadow-md">
                <Shield className="h-7 w-7 text-[#141414]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{t("proctoring_lock_title")}</h1>
                <p className="text-xs text-[#D4AF37]/90 text-stone-300">{t("proctoring_lock_desc")}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="bg-[#141414] p-4 rounded-2xl border border-[#333333] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B6861]">{t("exams")}:</span>
              <span className="font-bold text-white">{session?.exam_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6861]">{t("subject")}:</span>
              <span className="font-semibold text-stone-300">{session?.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6861]">{t("student")}:</span>
              <span className="font-semibold text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6861]">{t("registration_number")}:</span>
              <span className="font-mono font-bold text-[#C5A04A]">
                {user?.registration_number || "STU-2026-000001"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6861]">{t("duration")}:</span>
              <span className="font-bold text-[#4F8A63]">{session?.duration_minutes} {t("minutes")}</span>
            </div>
          </div>

          {/* Webcam Preview Check */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#6B6861] uppercase tracking-wider flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#C5A04A]" />
              {t("camera_verification")}
            </label>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141414] border border-[#333333] flex items-center justify-center">
              <video
                ref={preflightVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              {!cameraActive && (
                <div className="text-center p-3 text-[#6B6861] text-xs">
                  <VideoOff className="h-8 w-8 mx-auto mb-2 text-[#6B6861]" />
                  <span>{cameraError || "Camera initializing... please allow browser camera permissions."}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#FAF4EA]/10 border border-[#E9D2AE]/20 rounded-2xl p-3.5 text-[11px] text-[#C58A35] space-y-1">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-[#C58A35]" /> {t("exam_regulations")}
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[#F4F1E8] pl-1">
              <li>{t("fullscreen_mandatory_rule")}</li>
              <li>{t("fullscreen_warning_rule")}</li>
              <li>Reaching {session?.maximum_tab_switch_warnings ?? 2} security warnings will automatically submit your exam.</li>
            </ul>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleEnterFullscreenAndBegin}
            className="w-full bg-[#C5A04A] hover:bg-[#D4AF37] border border-[#C5A04A] text-[#141414] font-bold text-sm shadow-xl"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {t("enter_fullscreen_begin")}
          </Button>
        </div>
      </div>
    );
  }

  // 11. Main Proctored Examination Workspace
  return (
    <div className="min-h-screen bg-[#141414] text-[#F4F1E8] flex flex-col select-none">
      {/* Top Authoritative Status Bar */}
      <header className="bg-[#181818]/95 backdrop-blur-md border-b border-[#262626] px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#C5A04A] text-[#141414] rounded-xl border border-[#C5A04A] shadow-sm">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                {session?.exam_name} • {session?.subject}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-[#8C887B]">
                <span className="font-mono text-[#F4F1E8]">{user?.registration_number}</span>
                <span>•</span>
                <span className="text-[#4F8A63] font-semibold">● {t("active_status")}</span>
                <span>•</span>
                <span className="text-[#8C887B]">{saveStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Server-Authoritative Real Live Countdown Timer */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-[#8C887B] font-bold uppercase tracking-wider">{t("time_remaining")}</span>
          <div
            className={`px-4 py-1 rounded-xl font-mono text-base font-black flex items-center gap-2 transition-all ${
              remainingSeconds < 300
                ? "bg-[#B8544F]/20 text-[#FCA5A5] border border-[#B8544F]/60 animate-pulse"
                : "bg-[#202020] text-[#C5A04A] border border-[#2F2F2F]"
            }`}
          >
            <Clock className={`h-4 w-4 ${remainingSeconds < 300 ? "text-[#B8544F]" : "text-[#C5A04A]"}`} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* Right Security & Submission Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          {/* Mobile Palette Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#202020] text-[#F4F1E8] border border-[#2F2F2F] hover:bg-[#282828] transition-colors"
            title={t("question_palette")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{t("question_palette")}</span>
          </button>

          {/* Real Tab Warnings Count */}
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold ${
              tabWarnings > 0
                ? "bg-[#B8544F]/20 text-[#FCA5A5] border border-[#B8544F]/50"
                : "bg-[#202020] text-[#F4F1E8] border border-[#2F2F2F]"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#C58A35]" />
            <span>
              {t("warning")}: {tabWarnings} / {maxWarnings}
            </span>
          </div>

          <Button
            variant="success"
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="font-bold shadow-md bg-[#4F8A63] hover:bg-[#437755] text-white border-0"
          >
            <Send className="h-3.5 w-3.5 sm:mr-1" /> {t("submit_assessment")}
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
              <div className="bg-[#202020] border border-[#2F2F2F] rounded-2xl p-5 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-xl bg-[#C5A04A] text-[#141414] font-extrabold text-sm flex items-center justify-center border border-[#C5A04A] shadow-sm">
                    {currentIndex + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-[#F4F1E8] uppercase tracking-wider">
                      {t("question")} {currentIndex + 1} {t("of")} {totalQuestions}
                    </div>
                    <div className="text-[11px] text-[#8C887B] font-mono">
                      {t("question_type")}: {t(currentQuestion.question_type.toLowerCase()) || currentQuestion.question_type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#4F8A63]/15 text-[#72B489] border border-[#4F8A63]/30 font-mono">
                    +{currentQuestion.marks} pts
                  </span>
                  {(currentQuestion.negative_marks ?? 0) > 0 && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#B8544F]/15 text-[#F87171] border border-[#B8544F]/30 font-mono">
                      -{currentQuestion.negative_marks} pts
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleMarkReview(currentQuestion.id)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      answers[currentQuestion.id]?.isMarkedForReview
                        ? "bg-[#C58A35]/20 border-[#C58A35]/60 text-[#E6C670]"
                        : "bg-[#181818] border-[#2F2F2F] text-[#8C887B] hover:text-white"
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {answers[currentQuestion.id]?.isMarkedForReview ? t("unmark_review") : t("mark_review")}
                  </button>
                </div>
              </div>

              {/* Question Text & Answer Input */}
              <div className="bg-[#202020] border border-[#2F2F2F] rounded-2xl p-6 space-y-4 shadow-md">
                <p className="text-base sm:text-lg font-medium text-white leading-relaxed whitespace-pre-wrap">
                  {getLocalizedQuestionText(currentQuestion, language)}
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
                              ? "bg-[#C5A04A]/15 border-[#C5A04A] text-white shadow-sm ring-1 ring-[#C5A04A]/50"
                              : "bg-[#181818] border-[#2F2F2F] hover:bg-[#242424] text-[#F4F1E8]"
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-${isMulti ? "md" : "full"} flex items-center justify-center text-xs font-bold border transition-colors ${
                              isSelected
                                ? "bg-[#C5A04A] border-[#C5A04A] text-[#141414]"
                                : "border-[#3A3A3A] bg-[#141414] text-[#8C887B]"
                            }`}
                          >
                            {isSelected ? "✓" : String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="text-sm font-medium leading-relaxed">
                            {getLocalizedOptionText(opt, language)}
                          </span>
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
                  const promptInfo = getWrittenPromptLabels(currentQuestion.question_type, language);

                  return (
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-[#8C887B] uppercase tracking-wider">
                          {promptInfo.label}
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2.5 py-0.5 rounded-lg border bg-[#181818] border-[#2F2F2F] text-[#8C887B]">
                            {t("characters")}: {charCount}
                          </span>
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-lg border ${
                              isExceeded
                                ? "bg-[#B8544F]/20 text-[#FCA5A5] border-[#B8544F]/50 animate-pulse"
                                : isBelowMin
                                ? "bg-[#C58A35]/20 text-[#E6C670] border-[#C58A35]/50"
                                : wordCount > 0
                                ? "bg-[#4F8A63]/20 text-[#72B489] border-[#4F8A63]/50"
                                : "bg-[#181818] text-[#8C887B] border-[#2F2F2F]"
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
                        placeholder={promptInfo.placeholder}
                        className={`w-full px-4 py-3 bg-[#181818] border rounded-xl text-white placeholder-[#6B6861] focus:outline-none text-sm transition-all ${
                          isExceeded
                            ? "border-[#B8544F] ring-1 ring-[#B8544F]"
                            : "border-[#2F2F2F] focus:border-[#C5A04A] focus:ring-1 focus:ring-[#C5A04A]"
                        }`}
                      />
                      {isExceeded && (
                        <p className="text-xs text-[#F87171] font-medium">
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
                      <label className="text-xs font-semibold text-[#8C887B] uppercase tracking-wider">
                        Diagram / Handwritten Solution (PNG, JPEG, WEBP - Max 5MB)
                      </label>
                      {answers[currentQuestion.id]?.imagePath && (
                        <span className="text-xs font-semibold text-[#72B489] bg-[#4F8A63]/15 px-2.5 py-0.5 rounded-md border border-[#4F8A63]/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Solution Attached
                        </span>
                      )}
                    </div>

                    {answers[currentQuestion.id]?.imagePath ? (
                      <div className="p-4 bg-[#181818] border border-[#2F2F2F] rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-32 h-32 rounded-xl overflow-hidden bg-black/60 border border-[#2F2F2F] flex items-center justify-center shrink-0">
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
                          <p className="text-xs text-[#8C887B] font-mono break-all">
                            {answers[currentQuestion.id]?.imagePath}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#2F2F2F] text-[#F4F1E8] transition-colors">
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
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C5A04A]/15 hover:bg-[#C5A04A]/25 border border-[#C5A04A]/40 text-[#C5A04A] transition-colors flex items-center gap-1.5"
                            >
                              <Camera className="h-3.5 w-3.5" /> Retake with Camera
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(currentQuestion.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#B8544F]/15 hover:bg-[#B8544F]/25 border border-[#B8544F]/30 text-[#F87171] transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Option 1: File Upload */}
                        <div className="border-2 border-dashed border-[#2F2F2F] hover:border-[#C5A04A]/50 rounded-2xl p-6 text-center transition-colors bg-[#181818]/60 flex flex-col items-center justify-center">
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
                            <div className="h-11 w-11 rounded-full bg-[#202020] border border-[#2F2F2F] flex items-center justify-center text-[#C5A04A]">
                              <Upload className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-white">Upload Image File</span>
                            <span className="text-[11px] text-[#8C887B]">PNG, JPG, or WEBP up to 5MB</span>
                          </label>
                          {isUploadingImage && (
                            <p className="text-xs text-[#C58A35] mt-2 animate-pulse">Uploading and generating thumbnail...</p>
                          )}
                        </div>

                        {/* Option 2: Direct Camera Capture */}
                        <div className="border-2 border-dashed border-[#C5A04A]/40 hover:border-[#C5A04A] rounded-2xl p-6 text-center transition-colors bg-[#C5A04A]/5 flex flex-col items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openDirectCameraModal(currentQuestion.id)}
                            className="flex flex-col items-center justify-center gap-2 w-full focus:outline-none"
                          >
                            <div className="h-11 w-11 rounded-full bg-[#C5A04A]/20 border border-[#C5A04A]/40 flex items-center justify-center text-[#C5A04A]">
                              <Camera className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-white">Capture Using Camera</span>
                            <span className="text-[11px] text-[#8C887B]">Snap photo directly from device</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Question Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#2F2F2F]">
                  <button
                    onClick={() => handleClearAnswer(currentQuestion.id)}
                    className="text-xs font-medium text-[#8C887B] hover:text-white transition-colors"
                  >
                    {t("clear_response")}
                  </button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="bg-[#202020] hover:bg-[#282828] border-[#2F2F2F] text-[#F4F1E8]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> {t("previous")}
                    </Button>

                    {currentIndex < totalQuestions - 1 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="bg-[#C5A04A] hover:bg-[#D4AF37] border border-[#C5A04A] text-[#141414] font-bold"
                      >
                        {t("next")} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setShowSubmitModal(true)}
                        className="font-bold shadow-md bg-[#4F8A63] hover:bg-[#437755] text-white border-0"
                      >
                        {t("review_and_submit")} <Send className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-[#8C887B]">No questions available in this session.</div>
          )}
        </main>

        {/* Right Sidebar: Real Webcam & Question Palette */}
        <aside className="w-80 border-l border-[#262626] bg-[#181818]/95 p-6 flex flex-col justify-between hidden md:flex space-y-6 overflow-y-auto">
          {/* 1. Live Proctoring Webcam View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C887B] flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-[#C5A04A]" />
                Live Proctoring
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#FCA5A5] bg-[#B8544F]/20 px-2 py-0.5 rounded-full border border-[#B8544F]/40 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B8544F]"></span> REC
              </span>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141414] border border-[#2F2F2F] flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              {!cameraActive && (
                <div className="text-center p-3 text-[#8C887B] text-xs">
                  <VideoOff className="h-6 w-6 mx-auto mb-1 text-[#8C887B]" />
                  <span>{cameraError || "Camera initializing..."}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Question Status Summary */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8C887B]">{t("status_summary")}</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#4F8A63]/15 border border-[#4F8A63]/30 p-2 rounded-xl">
                <div className="text-base font-bold text-[#72B489] font-mono">{answeredCount}</div>
                <div className="text-[10px] text-[#8C887B]">{t("answered")}</div>
              </div>
              <div className="bg-[#C58A35]/15 border border-[#C58A35]/30 p-2 rounded-xl">
                <div className="text-base font-bold text-[#E6C670] font-mono">{markedCount}</div>
                <div className="text-[10px] text-[#8C887B]">{t("review")}</div>
              </div>
              <div className="bg-[#202020] border border-[#2F2F2F] p-2 rounded-xl">
                <div className="text-base font-bold text-[#F4F1E8] font-mono">{unansweredCount}</div>
                <div className="text-[10px] text-[#8C887B]">{t("remaining")}</div>
              </div>
            </div>
          </div>

          {/* 3. Question Palette Grid */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C887B]">{t("question_palette")}</span>
              <span className="text-[10px] text-[#8C887B] font-mono">{questions.length}</span>
            </div>

            {/* 4-State Palette Legend */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#F4F1E8]/80 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4F8A63]"></span>
                <span>{t("answered")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2F2F2F]"></span>
                <span>{t("unanswered")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C58A35]"></span>
                <span>{t("marked_review")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C5A04A]"></span>
                <span>{t("answered_and_marked")}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(ans && (ans.selectedOptionIds.length > 0 || ans.textAnswer.trim().length > 0));
                const isMarked = Boolean(ans && ans.isMarkedForReview);

                let btnStyle = "bg-[#202020] text-[#8C887B] border-[#2F2F2F] hover:bg-[#282828]";
                if (isAnswered && isMarked) {
                  // ANSWERED_AND_MARKED_FOR_REVIEW
                  btnStyle = "bg-[#C5A04A]/25 text-[#E6C670] border-[#C5A04A] font-bold";
                } else if (isMarked) {
                  // MARKED_FOR_REVIEW
                  btnStyle = "bg-[#C58A35]/25 text-[#E6C670] border-[#C58A35]/50 font-bold";
                } else if (isAnswered) {
                  // ANSWERED
                  btnStyle = "bg-[#4F8A63]/25 text-[#72B489] border-[#4F8A63]/50 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold border transition-all ${btnStyle} ${
                      isCurrent ? "ring-2 ring-[#C5A04A] ring-offset-2 ring-offset-[#181818] border-[#C5A04A] text-white" : ""
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
            className="w-full font-bold shadow-md bg-[#4F8A63] hover:bg-[#437755] text-white border-0"
          >
            {t("review_and_submit")}
          </Button>
        </aside>
      </div>

      {/* Fullscreen Exit Alert Modal */}
      {isFullscreenExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border-2 border-[#B8544F] rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="p-3 bg-[#B8544F]/20 text-[#F87171] rounded-full w-fit mx-auto border border-[#B8544F]/30">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">{t("fullscreen_lock_exited")}</h3>
            <p className="text-xs text-[#FCA5A5] leading-relaxed">
              {t("fullscreen_lock_exited_desc")}
            </p>
            <Button
              variant="primary"
              onClick={handleEnterFullscreenAndBegin}
              className="w-full bg-[#B8544F] hover:bg-[#A3433F] text-white font-bold text-xs py-2.5 border-0 shadow-md"
            >
              {t("reenter_fullscreen")}
            </Button>
          </div>
        </div>
      )}

      {/* Tab Switch Warning / Auto-Submit Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border-2 border-[#B8544F] rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="p-3 bg-[#B8544F]/20 text-[#F87171] rounded-full w-fit mx-auto border border-[#B8544F]/30">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {isAutoSubmitted ? t("exam_auto_submitted") : t("security_violation_alert")}
            </h3>
            <div className="text-xs text-[#FCA5A5] leading-relaxed space-y-1.5">
              {isAutoSubmitted ? (
                <div className="space-y-2">
                  <p className="font-semibold text-[#F87171]">{t("submission_reason")}:</p>
                  <p className="text-white font-medium">{warningModalMessage}</p>
                  <p className="text-[#8C887B] pt-1">Your examination has been authoritatively submitted and graded.</p>
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
                  className="w-full bg-[#B8544F] hover:bg-[#A3433F] text-white font-bold text-xs py-2.5 border-0 shadow-md"
                >
                  {t("view_result")}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setShowWarningModal(false)}
                  className="w-full bg-[#B8544F] hover:bg-[#A3433F] text-white font-bold text-xs py-2 border-0 shadow-md"
                >
                  {t("acknowledge_return_exam")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border border-[#2F2F2F] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#C5A04A]/20 text-[#C5A04A] rounded-xl border border-[#C5A04A]/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t("submit_exam_modal_title")}</h3>
                <p className="text-xs text-[#8C887B]">{t("submit_exam_modal_desc")}</p>
              </div>
            </div>

            <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] space-y-2 text-xs">
              <div className="flex justify-between text-[#8C887B]">
                <span>{t("total_questions")}:</span>
                <span className="font-bold text-white">{totalQuestions}</span>
              </div>
              <div className="flex justify-between text-[#4F8A63]">
                <span>{t("questions_answered")}:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-[#C58A35]">
                <span>{t("marked_for_review_stat")}:</span>
                <span className="font-bold">{markedCount}</span>
              </div>
              <div className="flex justify-between text-[#8C887B]">
                <span>{t("unanswered_stat")}:</span>
                <span className="font-bold">{unansweredCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#8C887B] leading-relaxed">
              {t("submit_exam_modal_warning")}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 bg-[#202020] hover:bg-[#282828] text-[#8C887B] border-[#2F2F2F] text-xs py-2"
              >
                {t("continue_exam")}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSubmit}
                isLoading={isSubmitting}
                className="w-1/2 bg-[#4F8A63] hover:bg-[#437755] text-white font-bold text-xs py-2 border-0 shadow-md"
              >
                {t("confirm_submit")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Camera Capture Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#181818] border border-[#2F2F2F] rounded-3xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#C5A04A]/20 text-[#C5A04A] rounded-xl border border-[#C5A04A]/30">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Direct Solution Camera Capture</h3>
                  <p className="text-xs text-[#8C887B]">Capture your handwritten answer sheet or diagram</p>
                </div>
              </div>
              <button
                onClick={closeDirectCameraModal}
                className="p-1.5 text-[#8C887B] hover:text-white rounded-lg bg-[#202020] hover:bg-[#282828] transition-colors border border-[#2F2F2F]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Hidden canvas for taking snapshot */}
            <canvas ref={captureCanvasRef} className="hidden" />

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141414] border border-[#262626] flex items-center justify-center">
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
                <div className="absolute top-3 left-3 bg-[#4F8A63]/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                  <Check className="h-3.5 w-3.5" /> Photo Captured
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={closeDirectCameraModal}
                className="bg-[#202020] hover:bg-[#282828] text-[#8C887B] hover:text-white border-[#2F2F2F] text-xs py-2 px-4"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {capturedPhotoUrl ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRetakePhoto}
                      className="bg-[#202020] hover:bg-[#282828] text-[#F4F1E8] border-[#2F2F2F] text-xs py-2 px-4 gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retake Photo
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUseCapturedPhoto}
                      className="bg-[#C5A04A] hover:bg-[#D4AF37] text-[#141414] font-bold text-xs py-2 px-5 gap-1.5 border-0 shadow-md"
                    >
                      <Check className="h-4 w-4" /> Use This Photo
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleCapturePhoto}
                    className="bg-[#C5A04A] hover:bg-[#D4AF37] text-[#141414] font-bold text-xs py-2.5 px-6 gap-2 border-0 shadow-lg"
                  >
                    <Camera className="h-4 w-4" /> Capture Photo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Question Palette Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex justify-end">
          <div className="w-4/5 max-w-sm h-full bg-[#181818] border-l border-[#2F2F2F] p-5 flex flex-col justify-between overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-[#C5A04A]" /> {t("question_palette")}
              </span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 text-[#8C887B] hover:text-white rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#2F2F2F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#4F8A63]/15 border border-[#4F8A63]/30 p-2 rounded-xl">
                <div className="text-base font-bold text-[#72B489] font-mono">{answeredCount}</div>
                <div className="text-[10px] text-[#8C887B]">{t("answered")}</div>
              </div>
              <div className="bg-[#C58A35]/15 border border-[#C58A35]/30 p-2 rounded-xl">
                <div className="text-base font-bold text-[#E6C670] font-mono">{markedCount}</div>
                <div className="text-[10px] text-[#8C887B]">{t("review")}</div>
              </div>
              <div className="bg-[#202020] border border-[#2F2F2F] p-2 rounded-xl">
                <div className="text-base font-bold text-[#F4F1E8] font-mono">{unansweredCount}</div>
                <div className="text-[10px] text-[#8C887B]">{t("remaining")}</div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2 flex-1 overflow-y-auto py-2">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(ans && (ans.selectedOptionIds.length > 0 || ans.textAnswer.trim().length > 0));
                const isMarked = Boolean(ans && ans.isMarkedForReview);

                let btnStyle = "bg-[#202020] text-[#8C887B] border-[#2F2F2F]";
                if (isAnswered && isMarked) {
                  btnStyle = "bg-[#C5A04A]/25 text-[#E6C670] border-[#C5A04A] font-bold";
                } else if (isMarked) {
                  btnStyle = "bg-[#C58A35]/25 text-[#E6C670] border-[#C58A35]/50 font-bold";
                } else if (isAnswered) {
                  btnStyle = "bg-[#4F8A63]/25 text-[#72B489] border-[#4F8A63]/50 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setMobileDrawerOpen(false);
                    }}
                    className={`h-10 rounded-lg font-mono text-xs font-bold border transition-all ${btnStyle} ${
                      isCurrent ? "ring-2 ring-[#C5A04A] ring-offset-2 ring-offset-[#181818] border-[#C5A04A] text-white" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setMobileDrawerOpen(false)}
              className="w-full bg-[#202020] hover:bg-[#282828] text-[#F4F1E8] border-[#2F2F2F] text-xs py-2"
            >
              {t("close")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
