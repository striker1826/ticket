import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import confetti from "canvas-confetti";
import {
  Trophy,
  Sparkles,
  RotateCcw,
  Users,
  Award,
  Music,
  Volume2,
  VolumeX,
  Gift,
  Trash2,
} from "lucide-react";

// 추첨 화면 효과음 비활성화
const playAudioEffect = (type) => {
  return;
};

export default function DrawPage() {
  const [issuedTickets, setIssuedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [displayDigits, setDisplayDigits] = useState(["0", "0"]);
  const [lockedDigits, setLockedDigits] = useState([false, false]);
  const [winner, setWinner] = useState(null);
  const [winnersList, setWinnersList] = useState([]);
  const [preventDuplicate, setPreventDuplicate] = useState(true);
  const [prizeTitle, setPrizeTitle] = useState("1등");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState("");

  const intervalRef = useRef(null);

  // Fetch tickets on load
  useEffect(() => {
    fetchIssuedTickets();
  }, []);

  const fetchIssuedTickets = async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error: fetchErr } = await supabase
        .from("device_tickets")
        .select("ticket_number, created_at")
        .order("ticket_number", { ascending: true });

      if (fetchErr) throw fetchErr;

      const numbers = (data || []).map((t) => t.ticket_number);
      setIssuedTickets(numbers);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("발급된 번호표 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Confetti fireworks animation
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 1000,
    };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  // Start Drawing Animation: 2자리 수 (1의 자리 -> 10의 자리 순서로 고정)
  const startDraw = () => {
    // 1. Available candidate pool
    const availablePool = preventDuplicate
      ? issuedTickets.filter(
          (num) => !winnersList.some((w) => w.number === num),
        )
      : issuedTickets;

    if (availablePool.length === 0) {
      if (issuedTickets.length === 0) {
        setError("발급된 번호표가 없습니다! 번호표를 먼저 발급해주세요.");
      } else {
        setError("모든 발급된 번호표가 이미 당첨되었습니다!");
      }
      return;
    }

    setError("");
    setIsDrawing(true);
    setWinner(null);
    setLockedDigits([false, false]);

    // 2. Select final winning number in advance (2자리 수 00 ~ 99)
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    const winningNum = availablePool[randomIndex];
    const targetArr = String(winningNum).padStart(2, "0").split(""); // 예: ['4', '2']
    const targetValues = [
      parseInt(targetArr[0], 10),
      parseInt(targetArr[1], 10),
    ];

    const activeValues = [0, 0];
    const lockedState = [false, false];

    const updateDisplay = () => {
      setDisplayDigits([String(activeValues[0]), String(activeValues[1])]);
    };

    // 자릿수(reelIdx)별 독립 릴 회전/개별 감속 함수
    const animateSingleReel = (
      reelIdx,
      targetVal,
      fastDurationMs,
      slowDelaysMs,
      onComplete,
    ) => {
      const startTime = Date.now();
      const numSlowSteps = slowDelaysMs.length;
      // 감속 단계가 정확히 targetVal에 자연스럽게 1씩 도달하도록 시작 숫자 계산
      const slowStartVal = (targetVal - (numSlowSteps % 10) + 10) % 10;

      // 최고 속도 (25ms) 빠른 회전 단계
      const runFast = () => {
        const elapsed = Date.now() - startTime;
        const currentVal = activeValues[reelIdx];

        // fastDurationMs 경과 및 현 숫자가 감속 출발점(slowStartVal)에 도착하면 감속 모드로 전환
        if (elapsed >= fastDurationMs && currentVal === slowStartVal) {
          runSlow(0);
        } else {
          activeValues[reelIdx] = (currentVal + 1) % 10;
          updateDisplay();
          if (soundEnabled) playAudioEffect("tick");
          setTimeout(runFast, 25);
        }
      };

      // 개별 감속 단계 (딜레이가 길어지며 1씩 순차 증가 -> 최종 targetVal 도착)
      const runSlow = (slowIndex) => {
        if (slowIndex < slowDelaysMs.length) {
          activeValues[reelIdx] = (activeValues[reelIdx] + 1) % 10;
          updateDisplay();
          if (soundEnabled) playAudioEffect("tick");
          setTimeout(() => runSlow(slowIndex + 1), slowDelaysMs[slowIndex]);
        } else {
          // 정확히 targetVal에 연속 숫자로 도착한 상태에서 자릿수 고정!
          lockedState[reelIdx] = true;
          setLockedDigits([...lockedState]);
          updateDisplay();
          if (soundEnabled) playAudioEffect("stop");
          if (onComplete) onComplete();
        }
      };

      runFast();
    };

    // 1. 가장 먼저 멈출 1의 자리(index 1): 2.5초 고속 회전 후 약 3.8초 동안 길고 부드럽게 감속하며 멈춤
    animateSingleReel(
      1,
      targetValues[1],
      2500,
      [50, 80, 120, 170, 230, 300, 380, 470, 570, 680, 800],
    );

    // 2. 마지막으로 멈출 10의 자리(index 0): 5.5초 고속 회전 후 약 5.0초 동안 묵직하고 서서히 감속하며 멈춤
    animateSingleReel(
      0,
      targetValues[0],
      5500,
      [55, 90, 135, 190, 255, 330, 420, 520, 630, 750, 880, 1020],
      () => {
        // 모든 자릿수 고정 완료 (최종 당첨 처리)
        setDisplayDigits(targetArr);
        if (soundEnabled) {
          setTimeout(() => playAudioEffect("fanfare"), 150);
        }
        setWinner(winningNum);
        setIsDrawing(false);
        triggerConfetti();

        setWinnersList((prev) => [
          {
            id: Date.now(),
            prize: prizeTitle,
            number: winningNum,
            time: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
          },
          ...prev,
        ]);
      },
    );
  };

  return (
    <div className="rock-amp-viewport">
      {/* 3D Marshall Speaker Cabinet Outer Frame */}
      <div className="speaker-cabinet-box">
        <div className="cabinet-corner top-left"></div>
        <div className="cabinet-corner top-right"></div>
        <div className="cabinet-corner bottom-left"></div>
        <div className="cabinet-corner bottom-right"></div>

        {/* Embedded Tablet Display Screen */}
        <div className="tablet-screen-container">
          {/* Warm Stage Atmosphere Spotlight & Crowd Backdrop */}
          <div className="stage-concert-backdrop">
            <div className="stage-spotlight-beam"></div>
            <div className="stage-spotlight-glow"></div>
            <div className="crowd-silhouettes"></div>
          </div>

          {/* Top Screen Header */}
          <div className="tablet-header">
            {/* <div className="header-title-box">
              <h1 className="main-fest-title">JB FESTIVAL</h1>
              <p className="fest-date-sub">2026년 8월 8일</p>
            </div> */}

            {/* <div className="header-logo-badge">
              <span className="logo-jb">JB</span>
              <Music size={14} className="logo-icon-pick" />
              <button
                onClick={fetchIssuedTickets}
                className="btn-refresh-pill"
                title="목록 새로고침"
                disabled={isDrawing}
              >
                <RotateCcw size={12} />
              </button>
            </div> */}
          </div>

          {/* Center 3D Flip Reel Display Box */}
          <div className="flip-slot-wrapper">
            <div className="flip-box-outer">
              <div className="top-notch-label">
                <span>당첨 번호</span>
              </div>

              <div
                className={`flip-reels-display ${isDrawing ? "rolling" : ""} ${winner !== null ? "winner-active" : ""}`}
              >
                <div className={`flip-card ${lockedDigits[0] ? "locked" : ""}`}>
                  <span className="digit-text">{displayDigits[0]}</span>
                  <div className="flip-seam"></div>
                </div>
                <div className="flip-colon">:</div>
                <div className={`flip-card ${lockedDigits[1] ? "locked" : ""}`}>
                  <span className="digit-text">{displayDigits[1]}</span>
                  <div className="flip-seam"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Winner Announcement Banner */}
          {winner !== null && (
            <div className="winner-banner-box animate-bounce-in">
              <Sparkles size={18} className="sparkle-gold" />
              <span>
                🎉 {String(winner).padStart(2, "0")}번 당첨을 축하합니다! 🎉
              </span>
              <Sparkles size={18} className="sparkle-gold" />
            </div>
          )}

          {error && (
            <div className="error-alert draw-error">
              <p>{error}</p>
            </div>
          )}

          {/* Action Button & Footer Info */}
          <div className="tablet-footer">
            <button
              onClick={startDraw}
              disabled={isDrawing || issuedTickets.length === 0}
              className="btn-rock-copper"
            >
              {isDrawing ? (
                <>
                  <Sparkles size={20} className="spin-icon" />
                  추첨 진행 중...
                </>
              ) : (
                <>
                  <Trophy size={20} />
                  추첨 시작하기
                </>
              )}
            </button>
            {/* <div className="footer-entries-text">
              <span>
                참여 인원: <strong>{issuedTickets.length}명</strong>
              </span>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
