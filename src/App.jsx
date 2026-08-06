import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import TicketPage from "./TicketPage";
import DrawPage from "./DrawPage";
import { Music, Disc, Ticket } from "lucide-react";

function AppContent() {
  return (
    <div className="app-container">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TicketPage />} />
          <Route path="/draw" element={<DrawPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
