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

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOrders() {
    setLoading(true);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Orders could not be loaded.");
      setLoggedIn(false);
    } else {
      setOrders(result.orders || []);
      setMessage("");
      setLoggedIn(true);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
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
      return;
    }

    setPassword("");
    await loadOrders();
  }

  async function updateOrder(orderId, status) {
    const adminNote = window.prompt("Optional note for this order:", "");

    if (adminNote === null) {
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Order could not be updated.");
      setLoading(false);
      return;
    }

    await loadOrders();
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
            <button disabled={loading} type="submit" style={{ width: "100%", marginTop: "18px", padding: "12px", border: 0, borderRadius: "8px", background: "#123b70", color: "white", fontWeight: 700 }}>
              {loading ? "Please wait..." : "Login"}
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
          <div><h1 style={{ margin: 0, color: "#123b70" }}>Print Orders</h1><p style={{ marginBottom: 0, color: "#64748b" }}>Approve orders after checking the document.</p></div>
          <button onClick={loadOrders} disabled={loading} style={{ padding: "10px 14px", border: 0, borderRadius: "8px", background: "#123b70", color: "white" }}>Refresh</button>
        </div>
        {message && <p role="status" style={{ color: "#b91c1c" }}>{message}</p>}
        {loading && <p>Loading...</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
            <thead><tr style={{ textAlign: "left", background: "#eff6ff" }}><th style={{ padding: "12px" }}>Customer</th><th>Document</th><th>Print</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.orderId} style={{ borderTop: "1px solid #e2e8f0" }}><td style={{ padding: "12px" }}><strong>{order.customerName}</strong><br /><small>{order.mobile || "No mobile"}</small></td><td><a href={order.fileUrl} target="_blank" rel="noreferrer">{order.fileName}</a><br /><small>{order.createdAt}</small></td><td>{order.pageCount} pages × {order.copies}<br /><small>{order.colorMode}, {order.paperSize}, {order.printSide}</small></td><td>₹{order.totalAmount}</td><td><strong>{order.status}</strong><br /><small>{order.adminNote}</small></td><td>{order.status === "PENDING" ? <><button onClick={() => updateOrder(order.orderId, "APPROVED")} disabled={loading} style={{ marginRight: "8px", padding: "8px", border: 0, borderRadius: "6px", background: "#15803d", color: "white" }}>Approve</button><button onClick={() => updateOrder(order.orderId, "REJECTED")} disabled={loading} style={{ padding: "8px", border: 0, borderRadius: "6px", background: "#b91c1c", color: "white" }}>Reject</button></> : "Updated"}</td></tr>)}</tbody>
          </table>
        </div>
        {!loading && orders.length === 0 && <p>No orders found.</p>}
      </section>
    </main>
  );
}
