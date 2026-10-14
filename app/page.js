"use client";

import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    customerName: "",
    mobile: "",
    colorMode: "Black & White",
    paperSize: "A4",
    printSide: "Single Side",
    copies: "1",
    pageCount: "1",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const pricePerPage =
    form.colorMode === "Colour" ? 10 : 2;

  const estimatedAmount =
    Number(form.pageCount || 0) *
    Number(form.copies || 0) *
    pricePerPage;

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setOrderResult(null);

    if (!selectedFile) {
      setMessage("অনুগ্রহ করে আপনার ডকুমেন্ট নির্বাচন করুন।");
      return;
    }

    if (
      !Number.isInteger(Number(form.pageCount)) ||
      Number(form.pageCount) < 1 ||
      Number(form.pageCount) > 500
    ) {
      setMessage("সঠিক Page Count লিখুন (১–৫০০)।");
      return;
    }

    if (
      !Number.isInteger(Number(form.copies)) ||
      Number(form.copies) < 1 ||
      Number(form.copies) > 100
    ) {
      setMessage("Copies-এর সংখ্যা ১–১০০-এর মধ্যে দিন।");
      return;
    }

    setLoading(true);

    try {
      const uploadData = new FormData();
      uploadData.append("document", selectedFile);

      const uploadResponse = await fetch("/api/print", {
        method: "POST",
        body: uploadData,
      });
      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(
          uploadResult.message || "ডকুমেন্ট আপলোড করা যায়নি।"
        );
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          pageCount: Number(form.pageCount),
          copies: Number(form.copies),
          fileName: uploadResult.fileName,
          fileId: uploadResult.fileId,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          fileMimeType: uploadResult.fileMimeType,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "অর্ডার জমা দেওয়া যায়নি।"
        );
      }

      setOrderResult(result);
      setMessage("আপনার প্রিন্টের অনুরোধ সফলভাবে জমা হয়েছে।");

      setForm({
        customerName: "",
        mobile: "",
        colorMode: "Black & White",
        paperSize: "A4",
        printSide: "Single Side",
        copies: "1",
        pageCount: "1",
      });

      setSelectedFile(null);

      const fileInput = document.getElementById("documentFile");

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setMessage(
        error.message || "সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
    background: "#ffffff",
  };

  const labelStyle = {
    display: "block",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#263445",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "24px 14px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <header
          style={{
            background: "#123b70",
            color: "#ffffff",
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>
            Smart Print Center
          </h1>

          <p style={{ margin: 0, fontSize: "15px" }}>
            Upload your document and request a print
          </p>
        </header>

        <section style={{ padding: "24px 20px" }}>
          <h2 style={{ marginTop: 0, color: "#123b70" }}>
            Print Request Form
          </h2>

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>
              Customer Name *
              <input
                style={inputStyle}
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Enter your name"
                required
                maxLength={100}
              />
            </label>

            <label style={labelStyle}>
              Mobile Number
              <input
                style={inputStyle}
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                inputMode="tel"
                maxLength={20}
              />
            </label>

            <label style={labelStyle}>
              Select Document *
              <input
                id="documentFile"
                style={inputStyle}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] || null)
                }
                required
              />
              <small style={{ color: "#64748b", fontWeight: "normal" }}>
                PDF, Word অথবা ছবির ফাইল দিন (সর্বোচ্চ 10 MB)।
                অর্ডার দেওয়ার আগে ফাইলটি নিরাপদে Drive-এ আপলোড হবে।
              </small>
            </label>

            <label style={labelStyle}>
              Number of Pages *
              <input
                style={inputStyle}
                type="number"
                name="pageCount"
                value={form.pageCount}
                onChange={handleChange}
                min="1"
                max="500"
                step="1"
                required
              />
            </label>

            <label style={labelStyle}>
              Print Colour *
              <select
                style={inputStyle}
                name="colorMode"
                value={form.colorMode}
                onChange={handleChange}
              >
                <option value="Black & White">Black & White</option>
                <option value="Colour">Colour</option>
              </select>
            </label>

            <label style={labelStyle}>
              Paper Size *
              <select
                style={inputStyle}
                name="paperSize"
                value={form.paperSize}
                onChange={handleChange}
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
              </select>
            </label>

            <label style={labelStyle}>
              Print Side *
              <select
                style={inputStyle}
                name="printSide"
                value={form.printSide}
                onChange={handleChange}
              >
                <option value="Single Side">Single Side</option>
                <option value="Double Side">Double Side</option>
              </select>
            </label>

            <label style={labelStyle}>
              Number of Copies *
              <input
                style={inputStyle}
                type="number"
                name="copies"
                value={form.copies}
                onChange={handleChange}
                min="1"
                max="100"
                step="1"
                required
              />
            </label>

            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <p style={{ margin: "0 0 8px", color: "#334155" }}>
                Payment Status: <strong>OFF</strong>
              </p>

              <p style={{ margin: 0, fontSize: "20px", color: "#123b70" }}>
                Estimated Amount: <strong>₹{estimatedAmount}</strong>
              </p>

              <small style={{ color: "#64748b" }}>
                আনুমানিক মূল্য। প্রকৃত মূল্য Admin যাচাই করবেন।
              </small>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                border: "none",
                borderRadius: "9px",
                background: loading ? "#94a3b8" : "#123b70",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Submitting..." : "Submit Print Request"}
            </button>
          </form>

          {message && (
            <div
              role="status"
              style={{
                marginTop: "20px",
                padding: "14px",
                borderRadius: "8px",
                background: orderResult ? "#dcfce7" : "#fff7ed",
                color: "#263445",
                overflowWrap: "anywhere",
              }}
            >
              <p style={{ margin: 0 }}>{message}</p>

              {orderResult && (
                <>
                  <p>
                    Order ID: <strong>{orderResult.orderId}</strong>
                  </p>
                  <p>
                    Order Status: <strong>PENDING</strong>
                  </p>
                  <p>
                    Payment Status: <strong>OFF</strong>
                  </p>
                  <p>
                    Estimated Amount:{" "}
                    <strong>₹{orderResult.estimatedAmount}</strong>
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        <footer
          style={{
            textAlign: "center",
            padding: "16px",
            background: "#f8fafc",
            color: "#64748b",
            fontSize: "13px",
          }}
        >
          Smart Print Center · Admin Approval Required
        </footer>
      </div>
    </main>
  );
}
