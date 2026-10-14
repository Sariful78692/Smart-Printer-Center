"use client";

import { useEffect, useState } from "react";

const panelStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "16px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  padding: "24px",
};

function AdminLoader({ label = "Loading..." }) {
  return <div className="admin-loader-wrap" role="status"><span className="admin-loader" aria-hidden="true" />{label}</div>;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [sessionChecking, setSessionChecking] = useState(true);

  async function loadOrders(actionKey = "refresh") {
    setLoading(true);
    setActiveAction(actionKey);

    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(result.message || "Orders could not be loaded.");
        if (response.status === 401) {
          setLoggedIn(false);
        }
      } else {
        setOrders(result.orders || []);
        setMessage("");
        setLoggedIn(true);
      }
    } catch {
      setMessage("Orders could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setActiveAction("");
    }
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const result = await response.json();

        if (response.ok && result.success) {
          setLoggedIn(true);
          await loadOrders("initial-load");
        }
      } catch {
        setMessage("Unable to check the admin session.");
      } finally {
        setSessionChecking(false);
      }
    }

    restoreSession();
  }, []);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setActiveAction("login");
    setMessage("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Login failed.");
      setLoading(false);
      setActiveAction("");
      return;
    }

    setPassword("");
    await loadOrders("login");
  }

  async function updateOrder(orderId, status) {
    const adminNote = window.prompt("Optional note for this order:", "");

    if (adminNote === null) {
      return;
    }

    setLoading(true);
    const actionKey = `${orderId}-${status.toLowerCase()}`;
    setActiveAction(actionKey);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Order could not be updated.");
      setLoading(false);
      setActiveAction("");
      return;
    }

    await loadOrders(actionKey);
  }

  async function startManualPrint(order) {
    setLoading(true);
    const actionKey = `${order.orderId}-manual`;
    setActiveAction(actionKey);
    const response = await fetch(`/api/admin/orders/${order.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printStatus: "MANUAL_PRINTING" }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Manual print could not be started.");
      setLoading(false);
      setActiveAction("");
      return;
    }

    window.open(order.fileUrl, "_blank", "noopener,noreferrer");
    setMessage("Document opened in a new tab. Use Ctrl+P, select the printer and settings, then click Mark Printed.");
    await loadOrders(actionKey);
  }

  async function markManuallyPrinted(orderId) {
    if (!window.confirm("Confirm that this document was printed manually.")) return;

    setLoading(true);
    const actionKey = `${orderId}-printed`;
    setActiveAction(actionKey);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printStatus: "PRINTED" }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Print status could not be updated.");
      setLoading(false);
      setActiveAction("");
      return;
    }

    await loadOrders(actionKey);
  }

  async function retryAutoPrint(orderId) {
    setLoading(true);
    const actionKey = `${orderId}-retry`;
    setActiveAction(actionKey);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printStatus: "QUEUED" }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Automatic print could not be queued.");
      setLoading(false);
      setActiveAction("");
      return;
    }

    await loadOrders(actionKey);
  }

  async function deleteOrder(orderId) {
    if (!window.confirm("Delete this order permanently? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    const actionKey = `${orderId}-delete`;
    setActiveAction(actionKey);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Order could not be deleted.");
      setLoading(false);
      setActiveAction("");
      return;
    }

    await loadOrders(actionKey);
  }

  if (sessionChecking) {
    return (
      <main style={{ minHeight: "100vh", padding: "48px 16px", background: "#f1f5f9", fontFamily: "Arial, sans-serif" }}>
        <section style={{ ...panelStyle, maxWidth: "420px" }}>
          <AdminLoader label="Checking admin session..." />
        </section>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main style={{ minHeight: "100vh", padding: "48px 16px", background: "#f1f5f9", fontFamily: "Arial, sans-serif" }}>
        <section style={{ ...panelStyle, maxWidth: "420px" }}>
          <h1 style={{ marginTop: 0, color: "#123b70" }}>Smart Print Admin</h1>
          <form onSubmit={login}>
            <label style={{ display: "block", fontWeight: 600, color: "#263445" }}>
              Admin password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required style={{ width: "100%", boxSizing: "border-box", marginTop: "8px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
            </label>
            <button className="admin-action-button admin-action-button--blue" disabled={loading} type="submit" style={{ width: "100%", marginTop: "18px", padding: "12px", border: 0, borderRadius: "8px", background: "#123b70", color: "white", fontWeight: 700 }}>
              {activeAction === "login" ? "Please wait..." : "Login"}
            </button>
          </form>
          {message && <p role="status" style={{ color: "#b91c1c" }}>{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px 16px", background: "#f1f5f9", fontFamily: "Arial, sans-serif" }}>
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", marginBottom: "20px" }}>
          <div><h1 style={{ margin: 0, color: "#123b70" }}>Print Orders</h1><p style={{ marginBottom: 0, color: "#64748b" }}>Approve orders after checking the document. Manual print opens the document for Ctrl+P.</p></div>
          <button className="admin-action-button admin-action-button--blue" onClick={() => loadOrders("refresh")} disabled={loading} style={{ padding: "10px 14px", border: 0, borderRadius: "8px", background: "#123b70", color: "white" }}>{activeAction === "refresh" ? "Loading..." : "Refresh"}</button>
        </div>
        {message && <p role="status" style={{ color: "#b91c1c" }}>{message}</p>}
        {loading && <div className="admin-loading-overlay"><AdminLoader label="Loading orders..." /></div>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
            <thead><tr style={{ textAlign: "left", background: "#eff6ff" }}><th style={{ padding: "12px" }}>Customer</th><th>Document</th><th>Print</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{orders.map((order) => {
              const canStartManualPrint = order.status === "APPROVED" && ["", "QUEUED", "PRINT_FAILED"].includes(order.printStatus);
              const canMarkManuallyPrinted = order.printStatus === "MANUAL_PRINTING";
              const canRetryAutoPrint = order.status === "APPROVED" && order.printStatus === "PRINT_FAILED";

              const buttonStyle = { padding: "8px", border: 0, borderRadius: "6px", color: "white" };

              return <tr key={order.orderId} style={{ borderTop: "1px solid #e2e8f0" }}><td style={{ padding: "12px" }}><strong>{order.customerName}</strong><br /><small>{order.mobile || "No mobile"}</small></td><td><a className="admin-document-link" href={order.fileUrl} target="_blank" rel="noreferrer">{order.fileName}</a><br /><small>{order.createdAt}</small></td><td>{order.pageCount} pages × {order.copies}<br /><small>{order.colorMode}, {order.paperSize}, {order.printSide}</small></td><td>₹{order.totalAmount}</td><td><strong>{order.status}</strong><br /><small>{order.printStatus || "Not queued"}</small><br /><small>{order.adminNote}</small></td><td>{order.status === "PENDING" ? <><button className="admin-action-button admin-action-button--green" onClick={() => updateOrder(order.orderId, "APPROVED")} disabled={loading} style={{ ...buttonStyle, marginRight: "8px", background: "#15803d" }}>{activeAction === `${order.orderId}-approved` ? "Loading..." : "Approve"}</button><button className="admin-action-button admin-action-button--red" onClick={() => updateOrder(order.orderId, "REJECTED")} disabled={loading} style={{ ...buttonStyle, marginRight: "8px", background: "#b91c1c" }}>{activeAction === `${order.orderId}-rejected` ? "Loading..." : "Reject"}</button></> : canRetryAutoPrint ? <><button className="admin-action-button admin-action-button--orange" onClick={() => retryAutoPrint(order.orderId)} disabled={loading} style={{ ...buttonStyle, marginRight: "8px", background: "#d97706" }}>{activeAction === `${order.orderId}-retry` ? "Loading..." : "Retry Auto Print"}</button><button className="admin-action-button admin-action-button--blue" onClick={() => startManualPrint(order)} disabled={loading} style={{ ...buttonStyle, marginRight: "8px", background: "#2563eb" }}>{activeAction === `${order.orderId}-manual` ? "Loading..." : "Manual Print"}</button></> : canStartManualPrint ? <button className="admin-action-button admin-action-button--blue" onClick={() => startManualPrint(order)} disabled={loading} style={{ ...buttonStyle, marginRight: "8px", background: "#2563eb" }}>{activeAction === `${order.orderId}-manual` ? "Loading..." : "Manual Print"}</button> : canMarkManuallyPrinted ? <button className="admin-action-button admin-action-button--green" onClick={() => markManuallyPrinted(order.orderId)} disabled={loading} style={{ ...buttonStyle, marginRight: "8px", background: "#15803d" }}>{activeAction === `${order.orderId}-printed` ? "Loading..." : "Mark Printed"}</button> : "Updated"}<button className="admin-action-button admin-action-button--slate" onClick={() => deleteOrder(order.orderId)} disabled={loading} style={{ ...buttonStyle, background: "#475569" }}>{activeAction === `${order.orderId}-delete` ? "Loading..." : "Delete"}</button></td></tr>;
            })}</tbody>
          </table>
        </div>
        {!loading && orders.length === 0 && <p>No orders found.</p>}
      </section>
    </main>
  );
}
