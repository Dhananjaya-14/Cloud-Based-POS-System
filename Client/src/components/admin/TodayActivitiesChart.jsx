import { useTranslation } from "react-i18next";
import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
export default function TodayActivitiesChart({
  data = []
}) {
  const { t } = useTranslation();
const sorted = [...data].sort((a, b) => (b.income || 0) - (a.income || 0));
  const labels = sorted.map(d => d.B_name ?? "Branch");
  const incomes = sorted.map(d => Number(d.income || 0));
  const expenses = sorted.map(d => Number(d.expenses || 0));
  const INCOME_COLOR = "#16A34A";
  const EXPENSE_COLOR = "#0D5EA8";
  const chartData = {
    labels,
    datasets: [{
      label: t("company_admin.income", "Income"),
      data: incomes,
      backgroundColor: INCOME_COLOR,
      borderRadius: 12,
      // let Chart.js compute width; limit max thickness
      maxBarThickness: 38
    }, {
      label: t("company_admin.expenses", "Expenses"),
      data: expenses,
      backgroundColor: EXPENSE_COLOR,
      borderRadius: 12,
      maxBarThickness: 38
    }]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          color: "#334155"
        }
      },
      tooltip: {
        callbacks: {
          label: context => ` ${context.dataset.label}: Rs ${Number(context.raw || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "#94A3B8",
          autoSkip: false,
          // show every label (prevents Chart.js auto-skip)
          maxRotation: 45,
          // allow rotation if they don't fit horizontally
          minRotation: 0,
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: "#EEF2F7",
          drawBorder: false
        },
        ticks: {
          color: "#94A3B8",
          callback: v => `Rs ${Number(v).toLocaleString()}`
        },
        beginAtZero: true
      }
    },
    layout: {
      padding: {
        top: 6,
        right: 10,
        left: 6,
        bottom: 6
      }
    }
  };
  return <div style={{
    padding: 12,
    borderRadius: 8,
    background: "#fff",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)"
  }}>
      <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6
    }}>
        <h3 style={{
        margin: 0,
        color: "#0F172A",
        fontSize: 18,
        fontWeight: 700
      }}>{t("company_admin.today_s_activities", "Today's Activities")}</h3>
      </div>
      <div style={{
      height: 420
    }}> {/* increased height to reduce clamping */}
        <Bar options={chartOptions} data={chartData} />
      </div>
    </div>;
}