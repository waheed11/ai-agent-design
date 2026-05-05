export default function ArchitectureDiagramPreview() {
  const archId = new URLSearchParams(window.location.search).get("archId");

  if (!archId) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui",
          color: "#94a3b8",
          fontSize: 14,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        No architecture ID provided. Add{" "}
        <code
          style={{
            margin: "0 4px",
            background: "#f1f5f9",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          ?archId=&lt;id&gt;
        </code>{" "}
        to the URL.
      </div>
    );
  }

  const src = `${window.location.origin}/architecture-diagram/${archId}`;

  return (
    <iframe
      src={src}
      title={`Architecture Diagram #${archId}`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
    />
  );
}
