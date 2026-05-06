import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TodayActivitiesChart({ data = [] }) {
  // `data`: [{ B_id, B_name, revenue, orders }] from BranchStats backend logic

  // Sort branches by revenue to align with the backend sorting
  const sortedData = [...data].sort((a,b) => b.revenue - a.revenue);

  // Prepare chart labels and values
  const labels = sortedData.map((d) => d.B_name);
  const revenueValues = sortedData.map((d) => Number(d.revenue || 0));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Revenue",
        data: revenueValues,
        // Blue color gradient inspired by the image
        backgroundColor: [
          "rgba(14, 165, 233, 0.9)", // Sky blue
          "rgba(2, 132, 199, 0.9)", // Darker blue
          "rgba(3, 105, 161, 0.9)", // Even darker blue
        ],
        borderColor: "rgba(14, 165, 233, 1)",
        borderWidth: 0,
        borderRadius: 8, // Softly rounded bars
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Hide legend, single data point
      title: { display: false }, // Replaced by h3 title
    },
    scales: {
      x: { grid: { display: false } }, // Hide x grid lines
      y: { grid: { color: "#EEF2F7" }, title: { display: true, text: "Value (Rs)" } },
    },
  };

  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
      <h3 style={{ margin: 0, marginBottom: 20, color: "#313D4F", fontSize: 20, fontWeight: 700 }}>
        Today's Activities (Branch Revenue)
      </h3>
      <div style={{ height: 350 }}> {/* Control chart height */}
        <Bar options={chartOptions} data={chartData} />
      </div>
    </div>
  );
}



































// import React from "react";

// export default function BranchChart({ data = [] }) {
//   // data: [{ B_name, revenue }]
//   const max = Math.max(1, ...data.map((d) => Number(d.revenue || 0)));
//   const barWidth = 36;
//   return (
//     <div style={{ background: "#fff", padding: 16, borderRadius: 12 }}>
//       <h3 style={{ margin: 0, marginBottom: 12 }}>Today's Activities</h3>
//       <div style={{ display: "flex", gap: 8, alignItems: "end", height: 240 }}>
//         {data.map((d) => {
//           const h = Math.round((Number(d.revenue || 0) / max) * 220);
//           return (
//             <div key={d.B_id} style={{ width: barWidth, textAlign: "center" }}>
//               <div style={{ height: 4, marginBottom: 8, color: "#94A3B8" }} />
//               <div style={{ height: h, background: "#0EA5E9", borderRadius: 6 }} />
//               <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>{d.B_name}</div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }