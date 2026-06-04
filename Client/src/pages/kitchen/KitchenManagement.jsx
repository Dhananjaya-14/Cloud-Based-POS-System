import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaClock } from "react-icons/fa";
import CashierHeader from "../../components/kitchen/Header";
import { useAuth } from "../../context/AuthContext";
import { connectSocket } from "../../services/socket";
import {
	getBranchProducts,
	getOrderItems,
	getOrders,
	updateOrderStatus,
} from "../../services/api";

const statCards = [
    {
        key: "pending",
        title: "Pending",
        subtitle: "Items waiting",
        tone: "from-amber-100 to-yellow-200",
        accent: "text-amber-600",
        border: "border-amber-300",
        titleStyles: "font-sans font-medium text-sm tracking-wider uppercase",
        subtitleStyles: "font-sans font-semibold text-[12px] text-slate-500",
    },
    {
        key: "preparing",
        title: "Preparing",
        subtitle: "In progress",
        tone: "from-orange-100 to-orange-200",
        accent: "text-orange-600",
        border: "border-orange-300",
        titleStyles: "font-sans font-medium text-sm tracking-wider uppercase", 
        subtitleStyles: "font-sans font-semibold text-[12px] text-slate-500",
    },
    {
        key: "ready",
        title: "Ready",
        subtitle: "Ready to serve",
        tone: "from-emerald-100 to-emerald-200",
        accent: "text-emerald-600",
        border: "border-emerald-300",
        titleStyles: "font-sans font-medium text-sm tracking-wider uppercase",
        subtitleStyles: "font-sans font-normal text-[12px] text-slate-500",
    },
    {
        key: "active",
        title: "Active Orders",
        subtitle: "Total orders",
        tone: "from-sky-100 to-indigo-100",
        accent: "text-indigo-600",
        border: "border-indigo-300",
        titleStyles: "font-sans font-medium text-sm tracking-wider uppercase",
        subtitleStyles: "font-sans font-normal text-[12px] text-slate-500",
    },
];

const statusPalette = {
	Pending: "bg-slate-100 text-[12px] font-semibold text-slate-700 border-slate-200",
	Preparing: "bg-orange-100 text-[12px] font-semibold text-orange-700 border-orange-200",
	Completed: "bg-emerald-100 text-[12px] font-semibold text-emerald-700 border-emerald-200",
	Declined: "bg-rose-100 text-[12px] font-semibold text-rose-700 border-rose-200",
};



const KitchenManagement = () => {
	const { user } = useAuth();
	const [orders, setOrders] = useState([]);
	const [orderItems, setOrderItems] = useState([]);
	const [branchProducts, setBranchProducts] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updatingOrderId, setUpdatingOrderId] = useState(null);

	useEffect(() => {
		let isMounted = true;

		const loadData = async () => {
			setLoading(true);
			setError("");

			try {
				const params = {};
				if (user?.b_id) params.b_id = user.b_id;

				const [ordersData, itemsResult, productsResult] =
					await Promise.allSettled([
						getOrders(params),
						getOrderItems(),
						getBranchProducts(),
					]);

				if (!isMounted) return;

				if (ordersData.status === "fulfilled") {
					setOrders(Array.isArray(ordersData.value) ? ordersData.value : []);
				} else {
					setOrders([]);
					setError("Failed to load orders.");
				}

				if (itemsResult.status === "fulfilled") {
					setOrderItems(Array.isArray(itemsResult.value) ? itemsResult.value : []);
				} else {
					setOrderItems([]);
				}

				if (productsResult.status === "fulfilled") {
					setBranchProducts(
						Array.isArray(productsResult.value) ? productsResult.value : [],
					);
				} else {
					setBranchProducts([]);
				}
			} catch (err) {
				if (!isMounted) return;
				setOrders([]);
				setOrderItems([]);
				setBranchProducts([]);
				setError("Failed to load kitchen data.");
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		loadData();

		return () => {
			isMounted = false;
			window.clearTimeout(refreshTimer);
			socket.off("order:created", scheduleRefresh);
			socket.off("order:updated", scheduleRefresh);
			socket.off("order:deleted", scheduleRefresh);
		};
	}, [user]);

	const branchProductMap = useMemo(() => {
		return branchProducts.reduce((acc, product) => {
			acc[product.Bpro_id] = product;
			return acc;
		}, {});
	}, [branchProducts]);

	const itemsByOrderId = useMemo(() => {
		return orderItems.reduce((acc, item) => {
			const product = branchProductMap[item.Bpro_id];
			const stations = product?.stations || {};

			// If the product explicitly has Kitchen set to false, skip it for the kitchen display
			if (stations.Kitchen === false) {
				return acc;
			}

			const orderId = item.order_id;
			if (!acc[orderId]) acc[orderId] = [];
			acc[orderId].push(item);
			return acc;
		}, {});
	}, [orderItems, branchProductMap]);

	const filteredOrders = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();

		// Only show orders that have items requiring kitchen preparation
		const withKitchenPrep = orders.filter((order) => {
			const items = itemsByOrderId[order.or_id] || [];
			return items.length > 0;
		});

		if (!query) return withKitchenPrep;

		return withKitchenPrep.filter((order) => {
			if (String(order.or_id ?? "").includes(query)) return true;

			const items = itemsByOrderId[order.or_id] || [];
			return items.some((item) => {
				const product = branchProductMap[item.Bpro_id] || {};
				return String(product.pro_name || "")
					.toLowerCase()
					.includes(query);
			});
		});
	}, [orders, searchTerm, itemsByOrderId, branchProductMap]);

	const statusCounts = useMemo(() => {
		const counts = { pending: 0, preparing: 0, ready: 0 };

		filteredOrders.forEach((order) => {
			if (order.or_status === "pending") counts.pending += 1;
			if (order.or_status === "preparing") counts.preparing += 1;
			if (order.or_status === "completed") counts.ready += 1;
		});

		return {
			pending: counts.pending,
			preparing: counts.preparing,
			ready: counts.ready,
			active: counts.pending + counts.preparing,
		};
	}, [filteredOrders]);

	const sortedOrders = useMemo(() => {
		const toTimestamp = (order) => {
			const dateValue = order?.or_date || order?.created_at || order?.createdAt || null;
			const timeValue = order?.or_time || "";

			if (dateValue) {
				const dateOnly = String(dateValue).split("T")[0];
				if (timeValue) {
					const combined = new Date(`${dateOnly}T${timeValue}`);
					if (!Number.isNaN(combined.getTime())) return combined.getTime();
				}

				const parsed = new Date(dateValue);
				if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
			}

			return 0;
		};

		return [...filteredOrders].sort((a, b) => {
			const delta = toTimestamp(b) - toTimestamp(a);
			if (delta !== 0) return delta;
			return Number(b?.or_id || 0) - Number(a?.or_id || 0);
		});
	}, [filteredOrders]);

	const pendingOrders = useMemo(
		() => sortedOrders.filter((order) => order.or_status === "pending"),
		[sortedOrders],
	);

	const acceptedOrders = useMemo(
		() =>
			sortedOrders.filter(
				(order) => order.or_status === "preparing" || order.or_status === "completed",
			),
		[sortedOrders],
	);

	const rejectedOrders = useMemo(
		() => sortedOrders.filter((order) => order.or_status === "cancelled"),
		[sortedOrders],
	);

	const renderOrderCard = (order) => {
		const statusLabel = getStatusLabel(order);
		const tagStyle = statusPalette[statusLabel] || statusPalette.Pending;
		const isPending = order.or_status === "pending";
		const isPreparing = order.or_status === "preparing";

		return (
			<div
				key={order.or_id}
				className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
			>
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<div className="text-sm font-semibold text-slate-900">
								ORD{String(order.or_id).padStart(5, "0")}
							</div>
							<div className="text-[12px] font-semibold text-slate-500">
								{order.or_type || "Dine in"} | {order.or_time?.slice(0, 5) || "--:--"}
							</div>
						</div>

						<div className="flex items-center gap-2">
							<span
								className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${tagStyle}`}
							>
								{statusLabel}
							</span>
							<span className="text-[12px] text-slate-400 flex items-center gap-1">
								<FaClock />
								<span>{order.or_time?.slice(0, 5) || "--:--"}</span>
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						{renderOrderItems(order.or_id)}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{isPending && (
							<>
								<button
									onClick={() => updateStatus(order.or_id, "preparing")}
									disabled={updatingOrderId === order.or_id}
									className="px-5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-100 text-emerald-700 text-sm font-semibold cursor-pointer transition-colors duration-200 hover:bg-emerald-300 hover:text-emerald-800 hover:border-emerald-300"
								>
									Accept
								</button>
								<button
									onClick={() => updateStatus(order.or_id, "cancelled")}
									disabled={updatingOrderId === order.or_id}
									className="px-5 py-1.5 rounded-lg border border-rose-200 bg-rose-100 text-rose-600 text-sm font-semibold cursor-pointer transition-colors duration-200 hover:bg-rose-300 hover:text-rose-800 hover:border-rose-300"
								>
									Decline
								</button>
							</>
						)}

						{isPreparing && (
							<button
								onClick={() => updateStatus(order.or_id, "completed")}
								disabled={updatingOrderId === order.or_id}
								className="px-4 py-1.5 rounded-lg border border-emerald-200 bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
							>
								Ready
							</button>
						)}
					</div>
				</div>
			</div>
		);
	};

	const renderOrderColumn = (title, ordersInColumn) => {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
						{title}
					</h2>
					<span className="text-xs text-slate-400">
						{ordersInColumn.length}
					</span>
				</div>
				{ordersInColumn.length ? (
					ordersInColumn.map(renderOrderCard)
				) : (
					<div className="text-sm text-slate-500">No orders</div>
				)}
			</div>
		);
	};

	const updateStatus = async (orderId, nextStatus) => {
		if (!orderId || updatingOrderId) return;
		setUpdatingOrderId(orderId);

		try {
			const updated = await updateOrderStatus(orderId, nextStatus);
			setOrders((prev) =>
				prev.map((order) =>
					order.or_id === orderId
						? { ...order, or_status: updated?.or_status || nextStatus }
						: order,
				),
			);
		} catch (err) {
			setError(
				err?.response?.data?.error ||
					err?.response?.data?.message ||
					"Failed to update order status.",
			);
		} finally {
			setUpdatingOrderId(null);
		}
	};

	const getStatusLabel = (order) => {
		if (order.or_status === "preparing") return "Preparing";
		if (order.or_status === "completed") return "Completed";
		if (order.or_status === "cancelled") return "Declined";
		return "Pending";
	};


	const renderOrderItems = (orderId) => {
		const items = itemsByOrderId[orderId] || [];
		if (!items.length) {
			return (
				<div className="text-xs text-slate-400 italic">
					Items not available
				</div>
			);
		}

		return items.map((item) => {
			const product = branchProductMap[item.Bpro_id] || {};
			const name = product.pro_name || `Item ${item.Bpro_id}`;
			const quantity = item.pro_quantity ?? "-";
			const image = product.pro_image || "";

			return (
				<div
					key={item.orderItem_id}
					className="flex gap-3 items-center rounded-xl border border-slate-100 bg-white px-3 py-2"
				>
					<div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
						{image ? (
							<img src={image} alt={name} className="w-full h-full object-cover" />
						) : (
							<span className="text-xs text-slate-500">IMG</span>
						)}
					</div>
					<div className="flex-1">
						<div className="text-sm font-semibold text-slate-900">{name}</div>
						<div className="text-[11px] text-slate-500">Qty: {quantity}</div>
					</div>
				</div>
			);
		});
	};

	return (
		<div className="min-h-screen bg-[#F4F7FB] flex flex-col">
			<CashierHeader />

			<main className="flex-1">
				<div className="max-w-none mx-0 px-4 sm:px-6 py-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
								Kitchen Order Management
							</h1>
							<p className="text-xs sm:text-sm text-slate-500 mt-1">
								Manage and track all incoming orders
							</p>
						</div>

						<div className="flex items-center gap-2" />
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
						{statCards.map((card) => (
							<div
								key={card.key}
								className={`rounded-2xl border ${card.border} bg-gradient-to-br ${card.tone} p-4 shadow-sm`}
							>
								<div className={card.titleStyles || "text-[11px] uppercase tracking-wide text-slate-500"}>
									{card.title}
								</div>
								<div className={`text-1xl font-semibold ${card.accent} mt-2`}>
									{statusCounts[card.key]}
								</div>
								<div className={card.subtitleStyles || "text-[11px] text-slate-500 mt-1"}>
									{card.subtitle}
								</div>
							</div>
						))}
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
						<div className="relative w-full sm:w-72">
							<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
							<input
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Search items..."
								className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
							/>
						</div>
					</div>

					{error && (
						<div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
							{error}
						</div>
					)}

					{loading ? (
						<div className="text-sm text-slate-500">Loading orders...</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							{renderOrderColumn("Received orders", pendingOrders)}
							{renderOrderColumn("Accepted orders", acceptedOrders)}
							{renderOrderColumn("Rejected orders", rejectedOrders)}
						</div>
					)}
				</div>
			</main>
		</div>
	);
};

export default KitchenManagement;