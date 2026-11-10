import { useTranslation } from "react-i18next";
import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const INCOME_COLOR = "#0F9B8E"; // teal
const EXPENSE_COLOR = "#0B2E4F"; // navy
const MUTED = "#5B6470";
const LINE = "#EFEBE2";

// "Rs 1,600,000" -> "Rs 1.6M" so the y-axis stays short and clean
const compactRs = (value) => `Rs ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0)}`;

// Break long branch names onto two lines so labels can stay horizontal
const splitLabel = (name) => {
  const words = String(name).split(" ");
  if (words.length < 2 || name.length <= 10) return name;
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(" "), words.slice(middle).join(" ")];
};

export default function TodayActivitiesChart({ data = [] }) {
  const { t } = useTranslation();
  const sorted = [...data].sort((a, b) => (b.income || 0) - (a.income || 0));
  const labels = sorted.map((d) => splitLabel(d.B_name ?? "Branch"));
  const incomes = sorted.map((d) => Number(d.income || 0));
  const expenses = sorted.map((d) => Number(d.expenses || 0));
  const incomeLabel = t("company_admin.income", "Income");
  const expenseLabel = t("company_admin.expenses", "Expenses");

  const barStyle = { borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: "bottom", maxBarThickness: 9, barPercentage: 0.9, categoryPercentage: 0.4 };
  const chartData = {
    labels,
    datasets: [
      { label: incomeLabel, data: incomes, backgroundColor: INCOME_COLOR, ...barStyle },
      { label: expenseLabel, data: expenses, backgroundColor: EXPENSE_COLOR, ...barStyle },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false }, // custom legend is drawn in the header (top-right)
      tooltip: {
        backgroundColor: "#071E38",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => [].concat(items[0]?.label ?? "").join(" "),
          label: (context) => ` ${context.dataset.label}: Rs ${Number(context.raw || 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: LINE },
        ticks: { color: MUTED, autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 10.5 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: LINE },
        border: { display: false },
        ticks: { color: MUTED, maxTicksLimit: 5, padding: 8, font: { size: 10.5 }, callback: compactRs },
      },
    },
    layout: { padding: { top: 4, right: 4, left: 0, bottom: 0 } },
  };

  return (
    <div className="rounded-[14px] border border-[#E7E3D8] bg-white p-6">
      <div className="mb-[22px] flex items-center justify-between">
        <h2 className="m-0 font-space text-base font-bold text-[#071E38]">{t("company_admin.today_s_activities", "Today's Activities")}</h2>
        <div className="flex gap-4 text-xs text-[#5B6470]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: INCOME_COLOR }} />{incomeLabel}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: EXPENSE_COLOR }} />{expenseLabel}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="h-[300px] min-w-[640px]">
          <Bar options={chartOptions} data={chartData} />
        </div>
      </div>
    </div>
  );
}