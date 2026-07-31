import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FaSearch, FaClock, FaBell } from "react-icons/fa";
import CashierHeader from "../../components/cashier/Header";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, getSocket } from "../../services/socket";
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
	const branchId = user?.b_id ?? user?.B_id;
	const [orders, setOrders] = useState([]);
	const [orderItems, setOrderItems] = useState([]);
	const [branchProducts, setBranchProducts] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updatingOrderId, setUpdatingOrderId] = useState(null);

	// State for order notifications (persistent)
	const [orderNotifications, setOrderNotifications] = useState(() => {
		const userId = user?.u_id;
		if (!userId) return [];

		const savedNotifications = sessionStorage.getItem(`kitchenOrderNotifications_${userId}`);
		if (savedNotifications) {
			try {
				const parsed = JSON.parse(savedNotifications);
				const now = new Date();
				const validNotifications = parsed.filter(notif => {
					const timestamp = new Date(notif.timestamp);
					const diffMinutes = (now - timestamp) / (1000 * 60);
					return diffMinutes < 60; // Keep notifications for up to 1 hour
				});
				if (validNotifications.length > 0) {
					return validNotifications;
				} else {
					sessionStorage.removeItem(`kitchenOrderNotifications_${userId}`);
					return [];
				}
			} catch (e) {
				sessionStorage.removeItem(`kitchenOrderNotifications_${userId}`);
				return [];
			}
		}
		return [];
	});

	// Save order notifications to sessionStorage
	useEffect(() => {
		const userId = user?.u_id;
		if (!userId) return;

		if (orderNotifications.length > 0) {
			sessionStorage.setItem(`kitchenOrderNotifications_${userId}`, JSON.stringify(orderNotifications));
		} else {
			sessionStorage.removeItem(`kitchenOrderNotifications_${userId}`);
		}
	}, [orderNotifications, user?.u_id]);

	// Dismiss a specific order notification
	const dismissOrderNotification = (notificationId) => {
		setOrderNotifications(prev => prev.filter(notif => notif.id !== notificationId));
	};

	const loadKitchenData = useCallback(async (silent = false) => {
		if (!silent) {
			setLoading(true);
		}
		setError("");

		try {
			const params = {};
			if (branchId) params.b_id = branchId;

			const [ordersData, itemsResult, productsResult] =
				await Promise.allSettled([
					getOrders(params),
					getOrderItems(),
					getBranchProducts(),
				]);

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
			setOrders([]);
			setOrderItems([]);
			setBranchProducts([]);
			setError("Failed to load kitchen data.");
		} finally {
			if (!silent) {
				setLoading(false);
			}
		}
	}, [branchId]);

	useEffect(() => {
		let isMounted = true;
		let refreshTimer = null;
		const socket = connectSocket();

		const loadData = async (silent = false) => {
			if (!isMounted) return;
			await loadKitchenData(silent);
		};

		const scheduleRefresh = (silent = true) => {
			if (refreshTimer) window.clearTimeout(refreshTimer);
			refreshTimer = window.setTimeout(() => loadData(silent), 1000);
		};

		loadData(false);

		// Handler for new order created
		const handleOrderCreated = (orderData) => {
			console.log("New order created (kitchen):", orderData);

			// Check if this order belongs to this branch
			if (orderData.b_id && Number(orderData.b_id) !== Number(branchId)) {
				return;
			}

			// Extract order ID - try multiple possible field names
			const orderId = orderData.or_id || orderData.id || orderData.order_id ||
				orderData._id || orderData.OR_id || null;

			// Only show notification if we have a valid order ID and the order is pending
			if (orderId && orderId !== "Unknown" && orderData.or_status === "pending") {
				// Add notification to persistent queue
				setOrderNotifications(prev => {
					const existingNotif = prev.find(n =>
						n.orderId === orderId &&
						(new Date() - new Date(n.timestamp)) < 10000
					);
					if (existingNotif) return prev;

					return [...prev, {
						id: Date.now() + Math.random(),
						type: 'new_order',
						message: `🍽️ New order #${orderId} received!`,
						timestamp: new Date().toISOString(),
						orderId: orderId
					}];
				});
			}

			scheduleRefresh(true);
		};

		// Handler for order updated
		const handleOrderUpdated = (orderData) => {
			console.log("Order updated (kitchen):", orderData);
			scheduleRefresh(true);
		};

		// Handler for order deleted
		const handleOrderDeleted = (orderData) => {
			console.log("Order deleted (kitchen):", orderData);
			scheduleRefresh(true);
		};

		socket.on("order:created", handleOrderCreated);
		socket.on("order:updated", handleOrderUpdated);
		socket.on("order:deleted", handleOrderDeleted);

		return () => {
			isMounted = false;
			if (refreshTimer) window.clearTimeout(refreshTimer);
			socket.off("order:created", handleOrderCreated);
			socket.off("order:updated", handleOrderUpdated);
			socket.off("order:deleted", handleOrderDeleted);
		};
	}, [loadKitchenData, branchId]);

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
			const productType = product?.product_type;

			if (stations.Kitchen === false) return acc;
			if (stations.Bar === true && stations.Kitchen !== true) return acc;
			if (productType !== 'made_to_order') return acc;

			const orderId = item.order_id;
			if (!acc[orderId]) acc[orderId] = [];
			acc[orderId].push(item);
			return acc;
		}, {});
	}, [orderItems, branchProductMap]);

	const filteredOrders = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();

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

					{(order.or_notes || order.or_addons || order.or_allergies) && (
						<div className="flex flex-col gap-1 mt-1 p-2.5 rounded-xl bg-amber-50/50 border border-amber-100/50">
							{order.or_allergies && (
								<div className="text-xs text-rose-600 font-medium">
									<span className="uppercase text-[10px] bg-rose-100 px-1.5 py-0.5 rounded mr-1.5 font-bold">Allergies</span>
									{order.or_allergies}
								</div>
							)}
							{order.or_addons && (
								<div className="text-xs text-sky-700 font-medium mt-1">
									<span className="uppercase text-[10px] bg-sky-100 px-1.5 py-0.5 rounded mr-1.5 font-bold">Add-ons</span>
									{order.or_addons}
								</div>
							)}
							{order.or_notes && (
								<div className="text-xs text-amber-800 font-medium mt-1">
									<span className="uppercase text-[10px] bg-amber-200 px-1.5 py-0.5 rounded mr-1.5 font-bold">Note</span>
									{order.or_notes}
								</div>
							)}
						</div>
					)}

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

		// Store previous state for rollback
		const previousOrders = [...orders];

		// Optimistic Update
		setOrders((prev) =>
			prev.map((order) =>
				order.or_id === orderId ? { ...order, or_status: nextStatus } : order,
			),
		);

		setUpdatingOrderId(orderId);
		setError("");

		try {
			const updated = await updateOrderStatus(orderId, nextStatus);
			// Update with actual server response if needed (e.g. status might be slightly different)
			if (updated) {
				setOrders((prev) =>
					prev.map((order) =>
						order.or_id === orderId
							? { ...order, or_status: updated.or_status }
							: order,
					),
				);
			}
		} catch (err) {
			// Rollback on error
			setOrders(previousOrders);
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

			{/* Order Notifications Container */}
			{orderNotifications.length > 0 && (
				<div
					style={{
						position: 'fixed',
						top: '80px',
						right: '20px',
						zIndex: 9999,
						display: 'flex',
						flexDirection: 'column',
						gap: '12px',
						maxWidth: '420px',
						minWidth: '320px',
						maxHeight: '70vh',
						overflowY: 'auto',
						paddingRight: '4px',
					}}
					className="order-notifications-container"
				>
					{orderNotifications.map((notification) => (
						<div
							key={notification.id}
							style={{
								backgroundColor: '#DBEAFE',
								borderLeft: '4px solid #3B82F6',
								borderRadius: '8px',
								padding: '16px 20px',
								boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
								display: 'flex',
								flexDirection: 'column',
								gap: '12px',
								animation: 'slideInRight 0.3s ease-out',
							}}
						>
							<div>
								<div style={{
									fontWeight: '600',
									fontSize: '15px',
									color: '#1F2937',
									marginBottom: '4px'
								}}>
									🍽️ New Order Received
								</div>
								<div style={{
									fontSize: '14px',
									color: '#4B5563',
									fontWeight: '500',
									lineHeight: '1.5'
								}}>
									{notification.message}
								</div>
								<div style={{
									fontSize: '11px',
									color: '#9CA3AF',
									marginTop: '4px',
									fontWeight: '400'
								}}>
									{new Date(notification.timestamp).toLocaleTimeString()}
								</div>
							</div>
							<button
								onClick={() => dismissOrderNotification(notification.id)}
								style={{
									background: '#3B82F6',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									padding: '8px 16px',
									fontSize: '13px',
									fontWeight: '600',
									cursor: 'pointer',
									transition: 'all 0.2s',
									alignSelf: 'flex-end',
									minWidth: '70px',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.opacity = '0.85';
									e.currentTarget.style.transform = 'scale(1.02)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.opacity = '1';
									e.currentTarget.style.transform = 'scale(1)';
								}}
							>
								OK
							</button>
						</div>
					))}
				</div>
			)}

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

			<style>
				{`
					@keyframes slideInRight {
						from {
							transform: translateX(100%);
							opacity: 0;
						}
						to {
							transform: translateX(0);
							opacity: 1;
						}
					}
					
					.order-notifications-container::-webkit-scrollbar {
						width: 4px;
					}
					
					.order-notifications-container::-webkit-scrollbar-track {
						background: transparent;
					}
					
					.order-notifications-container::-webkit-scrollbar-thumb {
						background: rgba(0, 0, 0, 0.2);
						border-radius: 10px;
					}
				`}
			</style>
		</div>
	);
};

export default KitchenManagement;