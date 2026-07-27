import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Ticket,
  RefreshCw,
  Smartphone,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

function App() {
  const [deviceId, setDeviceId] = useState("");
  const [ticketNumber, setTicketNumber] = useState(null);
  const [remainingCount, setRemainingCount] = useState(100);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  // Initialize/Retrieve Device ID
  useEffect(() => {
    let id = localStorage.getItem("device_id");
    if (!id) {
      // Generate a simple unique browser/device ID
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
        .select("ticket_number")
        .eq("device_id", id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (data) {
        setTicketNumber(data.ticket_number);
      }
    } catch (err) {
      console.error("Error fetching ticket:", err);
      setError("티켓 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch remaining tickets count
  const fetchStats = async () => {
    try {
      const { count, error: countErr } = await supabase
        .from("device_tickets")
        .select("*", { count: "exact", head: true });

      if (countErr) throw countErr;
      setRemainingCount(100 - (count || 0));
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Assign a ticket using RPC
  const handleAssignTicket = async () => {
    if (!deviceId) return;
    try {
      setAssigning(true);
      setError("");

      // Call the postgres RPC function
      const { data, error: rpcErr } = await supabase.rpc("assign_ticket", {
        client_device_id: deviceId,
      });

      if (rpcErr) throw rpcErr;

      if (data === null || data === undefined) {
        setError("남은 번호표가 없습니다! (100개 모두 소진됨)");
      } else {
        setTicketNumber(data);
        await fetchStats();
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

  // Reset ticket (For testing/debugging purposes, optional)
  const handleReset = async () => {
    if (
      !window.confirm("정말로 발급된 번호표를 초기화하시겠습니까? (테스트용)")
    )
      return;
    try {
      setLoading(true);
      const { error: deleteErr } = await supabase
        .from("device_tickets")
        .delete()
        .eq("device_id", deviceId);

      if (deleteErr) throw deleteErr;

      setTicketNumber(null);
      await fetchStats();
    } catch (err) {
      console.error("Error resetting:", err);
      setError("초기화 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-area">
          <Ticket className="logo-icon" />
          <h1>JB</h1>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="status-card glass animate-pulse">
            <RefreshCw className="spin-icon text-muted" />
            <p>번호표 상태를 확인하는 중...</p>
          </div>
        ) : (
          <div className="ticket-section">
            {ticketNumber !== null ? (
              /* Ticket Assigned View */
              <div className="ticket-card glass">
                <div className="ticket-header">
                  <span className="badge">VERIFIED TICKET</span>
                  <span className="status-indicator">
                    <CheckCircle size={14} /> Assigned
                  </span>
                </div>
                <div className="ticket-body">
                  <p className="ticket-label">내 번호표</p>
                  <div className="ticket-number">
                    {String(ticketNumber).padStart(3, "0")}
                  </div>
                  <div className="barcode">
                    <div className="barcode-line" style={{ width: "4%" }}></div>
                    <div className="barcode-line" style={{ width: "1%" }}></div>
                    <div className="barcode-line" style={{ width: "6%" }}></div>
                    <div className="barcode-line" style={{ width: "2%" }}></div>
                    <div className="barcode-line" style={{ width: "3%" }}></div>
                    <div className="barcode-line" style={{ width: "5%" }}></div>
                    <div className="barcode-line" style={{ width: "1%" }}></div>
                    <div className="barcode-line" style={{ width: "7%" }}></div>
                    <div className="barcode-line" style={{ width: "4%" }}></div>
                  </div>
                </div>
                <div className="ticket-footer"></div>

                <button onClick={handleReset} className="btn btn-reset">
                  번호표 다시 뽑기 (테스트용)
                </button>
              </div>
            ) : (
              /* Ticket NOT Assigned View */
              <div className="action-card glass">
                <div className="info-alert">
                  <Info size={20} className="info-icon" />
                  <p>
                    이 단말기(브라우저)에 발급된 번호표가 없습니다. 아래 버튼을
                    눌러 번호표를 뽑아주세요.
                  </p>
                </div>

                {error && (
                  <div className="error-alert">
                    <AlertTriangle size={20} className="error-icon" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="remaining-badge">
                  남은 번호표:{" "}
                  <strong className="highlight">{remainingCount}</strong> / 100
                  개
                </div>

                <button
                  onClick={handleAssignTicket}
                  disabled={assigning || remainingCount === 0}
                  className="btn btn-primary"
                >
                  {assigning ? (
                    <>
                      <RefreshCw className="spin-icon" size={18} />
                      발급 중...
                    </>
                  ) : remainingCount === 0 ? (
                    "번호표 매진"
                  ) : (
                    "내 번호표 뽑기"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <Smartphone size={14} />
        <span>기기당 하나의 번호표만 뽑을 수 있습니다.</span>
      </footer>
    </div>
  );
}

export default App;
