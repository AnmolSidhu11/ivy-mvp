import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useRepo } from "../context/RepoContext";
import { AddToCalendarDropdown } from "../components/AddToCalendarDropdown";
import "./Dashboard.css";
import "./VisitDetail.css";

export function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const { repo } = useRepo();
  const [visit, setVisit] = useState<{ id: string; hcpName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [icsToast, setIcsToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    repo.listVisits().then((visits) => {
      const v = visits.find((x) => x.id === id) ?? null;
      setVisit(v ?? null);
      setLoading(false);
    });
  }, [id, repo]);

  if (loading && !visit) {
    return (
      <div className="dashboard">
        <div className="dashboard-card visit-detail-skeleton">
          <p className="visit-detail-loading">Loading visit…</p>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="dashboard">
        <div className="dashboard-card visit-detail-skeleton">
          <p className="visit-detail-loading">Visit not found.</p>
          <Link to="/" className="nav-link-button" style={{ marginTop: "0.75rem" }}>
            Back to Claims
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {icsToast && (
        <div className="event-toast" role="status">
          Downloaded invite. Open to add it to your calendar (Apple/Google/Outlook).
        </div>
      )}
      <div className="visit-detail-header">
        <Link to="/" className="claim-detail-back">
          ← Back to Claims
        </Link>
        <h1>Visit {visit.id}</h1>
      </div>

      <div className="dashboard-card visit-detail-card">
        <h2 className="claim-detail-card-title">Visit</h2>
        <dl className="claim-detail-summary">
          <div className="claim-detail-summary-row">
            <dt>Visit ID</dt>
            <dd>{visit.id}</dd>
          </div>
          <div className="claim-detail-summary-row">
            <dt>HCP</dt>
            <dd>{visit.hcpName || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-card visit-detail-card">
        <h2 className="claim-detail-card-title">Add to Calendar</h2>
        <AddToCalendarDropdown
          params={{
            visitId: visit.id,
            hcpName: visit.hcpName || "—",
          }}
          entityIdForFilename={visit.id}
          onDownload={() => {
            setIcsToast(true);
            setTimeout(() => setIcsToast(false), 4000);
          }}
        />
      </div>
    </div>
  );
}
