import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { RefreshCw, AlertTriangle, Sparkles, Scissors } from "lucide-react";

// Web Audio API를 활용한 효과음 재생 함수 (비활성화)
const playTicketSound = () => {
  return;
};

export default function TicketPage() {
  const [deviceId, setDeviceId] = useState("");
  const [ticketNumber, setTicketNumber] = useState(null);
  const [totalIssued, setTotalIssued] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  // Real dispersion states
  const [dispensing, setDispensing] = useState(false); // 애니메이션 실행 중
  const [isNewTicket, setIsNewTicket] = useState(false); // 방금 생성된 티켓 여부
  const [ticketTaken, setTicketTaken] = useState(false); // 번호표 집기 완료 여부
  const [issueTime, setIssueTime] = useState("");

  // Initialize/Retrieve Device ID
  useEffect(() => {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id =
        "device_" +
        Math.random().toString(36).substring(2, 15) +
        "_" +
        Date.now();
      localStorage.setItem("device_id", id);
    }
    setDeviceId(id);
    fetchTicket(id);
    fetchStats();
  }, []);

  // Fetch ticket for the current device
  const fetchTicket = async (id) => {
    try {
      setLoading(true);
      setError("");
      const { data, error: fetchErr } = await supabase
        .from("device_tickets")
        .select("ticket_number, created_at")
        .eq("device_id", id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (data) {
        setTicketNumber(data.ticket_number);
        setTicketTaken(true); // 기존에 뽑았던 티켓은 바로 수령 상태로 표시
        if (data.created_at) {
          setIssueTime(
            new Date(data.created_at).toLocaleTimeString("ko-KR", {
              hour12: false,
            }),
          );
        } else {
          setIssueTime(
            new Date().toLocaleTimeString("ko-KR", { hour12: false }),
          );
        }
      }
    } catch (err) {
      console.error("Error fetching ticket:", err);
      setError("티켓 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch total issued count
  const fetchStats = async () => {
    try {
      const { count, error: countErr } = await supabase
        .from("device_tickets")
        .select("*", { count: "exact", head: true });

      if (countErr) throw countErr;
      setTotalIssued(count || 0);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Assign a ticket using RPC
  const handleAssignTicket = async () => {
    if (!deviceId || assigning || dispensing) return;
    try {
      setAssigning(true);
      setError("");

      const { data, error: rpcErr } = await supabase.rpc("assign_ticket", {
        client_device_id: deviceId,
      });

      if (rpcErr) throw rpcErr;

      if (data === null || data === undefined) {
        setError("번호표를 발급하는 도중 오류가 발생했습니다.");
      } else {
        // 애니메이션 시작
        setDispensing(true);
        setIsNewTicket(true);
        setTicketTaken(false);
        setTicketNumber(data);
        setIssueTime(new Date().toLocaleTimeString("ko-KR", { hour12: false }));
        playTicketSound();

        await fetchStats();

        // 2.5초 후 출력 연출 완료
        setTimeout(() => {
          setDispensing(false);
        }, 2500);
      }
    } catch (err) {
      console.error("Error assigning ticket:", err);
      setError(
        "번호표를 발급하는 도중 오류가 발생했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleTakeTicket = () => {
    setTicketTaken(true);
  };

  return (
    <>
      {loading ? (
        <div className="status-card glass animate-pulse">
          <RefreshCw className="spin-icon text-muted" />
          <p>번호표 상태를 확인하는 중...</p>
        </div>
      ) : (
        <div className="dispenser-wrapper">
          {/* 번호표 발급기 기계 상단 렌더링 */}
          <div className="dispenser-machine">
            <div className="dispenser-top-glow"></div>
            <div className="dispenser-screen">
              <div className="screen-label">총 발급 수</div>
              <div className="screen-number">{totalIssued}개</div>
            </div>
            <div className="dispenser-slot">
              <div className="slot-opening"></div>
              <div className="slot-light"></div>
            </div>
          </div>

          <div className="ticket-area">
            {ticketNumber !== null ? (
              <div
                className={`ticket-wrapper ${isNewTicket && !ticketTaken ? (dispensing ? "dispensing" : "dispensed") : ""} ${ticketTaken ? "taken" : ""}`}
              >
                <div
                  className="paper-ticket"
                  onClick={!ticketTaken ? handleTakeTicket : undefined}
                >
                  {/* 영수증 톱니 상단 */}
                  <div className="zigzag-edge top"></div>

                  <div className="paper-header">
                    <span className="paper-brand">JB BAND</span>
                    <span className="paper-badge">번호표</span>
                  </div>

                  <div className="paper-body">
                    <div className="paper-title">발급 번호</div>
                    <div className="paper-number-box">
                      <span className="paper-number">
                        {String(ticketNumber).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="paper-info">순서대로 안내해 드립니다</p>
                  </div>

                  <div className="paper-divider"></div>

                  <div className="paper-details">
                    <div className="detail-row">
                      <span>발급시간</span>
                      <strong>{issueTime || "12:00:00"}</strong>
                    </div>
                  </div>

                  <div className="barcode-wrapper">
                    <div className="barcode">
                      <div
                        className="barcode-line"
                        style={{ width: "6%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "2%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "8%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "3%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "4%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "10%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "2%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "7%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "5%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "3%" }}
                      ></div>
                      <div
                        className="barcode-line"
                        style={{ width: "8%" }}
                      ></div>
                    </div>
                    <div className="barcode-num">
                      TICK-{String(ticketNumber).padStart(5, "0")}
                    </div>
                  </div>

                  {/* 영수증 톱니 하단 */}
                  <div className="zigzag-edge bottom"></div>

                  {!ticketTaken && !dispensing && (
                    <div className="tear-prompt">
                      <Scissors className="scissors-icon" size={16} />
                      <span>클릭하여 번호표 뽑기</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Ticket NOT Assigned View */
              <div className="action-card glass">
                {error && (
                  <div className="error-alert">
                    <AlertTriangle size={20} className="error-icon" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAssignTicket}
                  disabled={assigning || dispensing}
                  className="btn btn-primary btn-dispense"
                >
                  {assigning || dispensing ? (
                    <>
                      <RefreshCw className="spin-icon" size={20} />
                      번호표 인쇄 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />내 번호표 뽑기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
