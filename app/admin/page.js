"use client";

import { useEffect, useMemo, useState } from "react";

function AdminLoader({ label = "Loading..." }) {
  return <span className="admin-loader-wrap" role="status"><span className="admin-loader" aria-hidden="true" />{label}</span>;
}

async function responseJson(response) {
  return response.json().catch(() => ({ success: false, message: "The server returned an invalid response." }));
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [sessionChecking, setSessionChecking] = useState(true);
  const [activeView, setActiveView] = useState("orders");
  const [printers, setPrinters] = useState([]);
  const [defaultPrinter, setDefaultPrinter] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printerDraft, setPrinterDraft] = useState("");
  const summary = useMemo(() => ({ total: orders.length, pending: orders.filter((o) => o.status === "PENDING").length, approved: orders.filter((o) => o.status === "APPROVED").length }), [orders]);

  async function loadOrders(actionKey = "refresh") {
    setLoading(true); setActiveAction(actionKey);
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const result = await responseJson(response);
      if (!response.ok || !result.success) {
        setMessage(result.message || "Orders could not be loaded.");
        if (response.status === 401) setLoggedIn(false);
        return;
      }
      setOrders(result.orders || []); setMessage(""); setLoggedIn(true);
    } catch { setMessage("Orders could not be loaded. Please try again."); }
    finally { setLoading(false); setActiveAction(""); }
  }

  async function loadPrinterSettings() {
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const result = await responseJson(response);
      if (!response.ok || !result.success) return;
      const nextPrinters = result.printers || [];
      const nextDefault = result.defaultPrinter || "";
      setPrinters(nextPrinters);
      setDefaultPrinter(nextDefault);
      setPrinterDraft(nextPrinters.join("\n"));
      setSelectedPrinter((current) => nextPrinters.includes(current) ? current : (nextDefault || nextPrinters[0] || ""));
    } catch {
      setMessage("Printer settings could not be loaded.");
    }
  }

  async function savePrinterSettings(event) {
    event.preventDefault();
    const nextPrinters = [...new Set(printerDraft.split(/\r?\n/).map((name) => name.trim()).filter(Boolean))];
    setLoading(true); setActiveAction("save-printers");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printers: nextPrinters, defaultPrinter }),
      });
      const result = await responseJson(response);
      if (!response.ok || !result.success) { setMessage(result.message || "Printer settings could not be saved."); return; }
      setPrinters(result.printers || []);
      setDefaultPrinter(result.defaultPrinter || "");
      setPrinterDraft((result.printers || []).join("\n"));
      setSelectedPrinter(result.defaultPrinter || result.printers?.[0] || "");
      setMessage("Printer settings saved.");
    } catch {
      setMessage("Printer settings could not be saved.");
    } finally {
      setLoading(false); setActiveAction("");
    }
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const result = await responseJson(response);
        if (response.ok && result.success) {
          await loadOrders("initial-load");
          await loadPrinterSettings();
        }
      } catch { setMessage("Unable to check the admin session."); }
      finally { setSessionChecking(false); }
    }
    restoreSession();
  }, []);

  async function login(event) {
    event.preventDefault(); setLoading(true); setActiveAction("login"); setMessage("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await responseJson(response);
      if (!response.ok || !result.success) { setMessage(result.message || "Login failed."); return; }
      setPassword(""); await loadOrders("login");
    } catch { setMessage("Login failed. Please try again."); }
    finally { setLoading(false); setActiveAction(""); }
  }

  async function updateOrder(orderId, body, actionKey, fallbackMessage) {
    setLoading(true); setActiveAction(actionKey);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await responseJson(response);
      if (!response.ok || !result.success) { setMessage(result.message || fallbackMessage); return false; }
      await loadOrders(actionKey); return true;
    } catch { setMessage(fallbackMessage); return false; }
    finally { setLoading(false); setActiveAction(""); }
  }

  async function changeStatus(orderId, status) {
    const adminNote = window.prompt("Optional note for this order:", "");
    if (adminNote === null) return;
    if (status === "APPROVED" && printers.length && !selectedPrinter) {
      setMessage("Select a printer from Settings before approving this order.");
      return;
    }
    await updateOrder(orderId, { status, adminNote, printerName: selectedPrinter }, `${orderId}-${status.toLowerCase()}`, "Order could not be updated.");
  }
  async function manualPrint(order) {
    const didUpdate = await updateOrder(order.orderId, { printStatus: "MANUAL_PRINTING" }, `${order.orderId}-manual`, "Manual print could not be started.");
    if (didUpdate) window.open(order.fileUrl, "_blank", "noopener,noreferrer");
  }
  function markPrinted(orderId) {
    if (window.confirm("Confirm that this document was printed manually.")) updateOrder(orderId, { printStatus: "PRINTED" }, `${orderId}-printed`, "Print status could not be updated.");
  }
  function retryPrint(orderId) { updateOrder(orderId, { printStatus: "QUEUED" }, `${orderId}-retry`, "Automatic print could not be queued."); }
  async function deleteOrder(orderId) {
    if (!window.confirm("Delete this order permanently? This cannot be undone.")) return;
    setLoading(true); const actionKey = `${orderId}-delete`; setActiveAction(actionKey);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      const result = await responseJson(response);
      if (!response.ok || !result.success) { setMessage(result.message || "Order could not be deleted."); return; }
      await loadOrders(actionKey);
    } catch { setMessage("Order could not be deleted. Please try again."); }
    finally { setLoading(false); setActiveAction(""); }
  }

  if (sessionChecking) return <main className="admin-shell admin-center"><AdminLoader label="Checking admin session..." /></main>;
  if (!loggedIn) return <main className="admin-shell admin-center"><section className="admin-login-card"><span className="admin-eyebrow">SMART PRINTER CENTER</span><h1>Admin sign in</h1><p>Manage incoming print orders securely.</p><form onSubmit={login} className="admin-login-form"><label>Admin password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" /></label><button className="admin-button admin-button--primary" disabled={loading} type="submit">{activeAction === "login" ? "Signing in..." : "Sign in"}</button></form>{message && <p className="admin-alert" role="status">{message}</p>}</section></main>;

  return <main className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark">SP</span><div><strong>Smart Print</strong><small>Control center</small></div></div><nav className="admin-nav" aria-label="Admin navigation"><span className="admin-nav-label">WORKSPACE</span><button className="admin-nav-item admin-nav-item--active" type="button"><span>▦</span>Orders <b>{summary.total}</b></button></nav><div className="admin-sidebar-footer"><span className="admin-status-dot" />System online<br /><small>Admin workspace</small></div></aside>
    <section className="admin-content"><header className="admin-topbar"><div><span className="admin-eyebrow">ORDER MANAGEMENT</span><h1>Print orders</h1><p>Review documents, manage approvals, and track printing.</p></div><button className="admin-button admin-button--primary" onClick={() => loadOrders("refresh")} disabled={loading}>{activeAction === "refresh" ? "Refreshing..." : "↻ Refresh"}</button></header>
      <div className="admin-stat-grid"><div><span>All orders</span><strong>{summary.total}</strong></div><div><span>Awaiting review</span><strong>{summary.pending}</strong></div><div><span>Approved</span><strong>{summary.approved}</strong></div></div>
      {message && <p className="admin-alert" role="status">{message}</p>}
      <section className="admin-orders-card"><div className="admin-card-heading"><h2>Recent orders</h2><p>{summary.total ? "Latest requests from your customers." : "New customer requests will appear here."}</p></div><div className="admin-table-wrap"><table className="admin-orders-table"><thead><tr><th>Customer</th><th>Document</th><th>Print setup</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {orders.map((order) => {
          const canManual = order.status === "APPROVED" && ["", "QUEUED", "PRINT_FAILED"].includes(order.printStatus);
          const canMark = order.printStatus === "MANUAL_PRINTING";
          const canRetry = order.status === "APPROVED" && order.printStatus === "PRINT_FAILED";
          const button = (key, label, kind, onClick) => <button className={`admin-button ${kind}`} onClick={onClick} disabled={loading} type="button">{activeAction === key ? "Working..." : label}</button>;
          return <tr key={order.orderId}><td><strong>{order.customerName}</strong><small>{order.mobile || "No mobile number"}</small></td><td><a className="admin-document-link" href={order.fileUrl} target="_blank" rel="noreferrer">{order.fileName}</a><small>{order.createdAt}</small></td><td>{order.pageCount} pages × {order.copies}<small>{order.colorMode} · {order.paperSize} · {order.printSide}</small></td><td className="admin-price">₹{order.totalAmount}</td><td><span className={`admin-badge admin-badge--${order.status.toLowerCase()}`}>{order.status}</span><small>{order.printStatus || "Not queued"}</small>{order.adminNote && <small>{order.adminNote}</small>}</td><td><div className="admin-actions">{order.status === "PENDING" ? <>{button(`${order.orderId}-approved`, "Approve", "admin-button--success", () => changeStatus(order.orderId, "APPROVED"))}{button(`${order.orderId}-rejected`, "Reject", "admin-button--danger", () => changeStatus(order.orderId, "REJECTED"))}</> : canRetry ? <>{button(`${order.orderId}-retry`, "Retry auto", "admin-button--warning", () => retryPrint(order.orderId))}{button(`${order.orderId}-manual`, "Manual print", "admin-button--secondary", () => manualPrint(order))}</> : canManual ? button(`${order.orderId}-manual`, "Manual print", "admin-button--secondary", () => manualPrint(order)) : canMark ? button(`${order.orderId}-printed`, "Mark printed", "admin-button--success", () => markPrinted(order.orderId)) : <span className="admin-complete">Updated</span>}{button(`${order.orderId}-delete`, "Delete", "admin-button--ghost-danger", () => deleteOrder(order.orderId))}</div></td></tr>;
        })}
      </tbody></table></div>{!loading && orders.length === 0 && <div className="admin-empty">No orders found yet.</div>}</section>
    </section>{loading && <div className="admin-loading-overlay"><AdminLoader label="Updating dashboard..." /></div>}
  </main>;
}
