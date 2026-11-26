import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaClock, FaBell, FaHome, FaSignOutAlt, FaUserCircle, FaChevronDown, FaChevronUp, FaChevronRight } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, getSocket, SOCKET_EVENTS } from "../../services/socket";
import defaultFoodImg from "../../assets/images/default-food.svg";
import {
	getBranchById,
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
		tone: "bg-[#FAF2E6]",
		accent: "text-[#A16207]",
		border: "border-[#EFE3D0]",
	},
	{
		key: "preparing",
		title: "Preparing",
		subtitle: "In progress",
		tone: "bg-[#FCEEEB]",
		accent: "text-[#C2410C]",
		border: "border-[#F8D8D0]",
	},
	{
		key: "ready",
		title: "Ready",
		subtitle: "Ready to serve",
		tone: "bg-[#EAF5EC]",
		accent: "text-[#15803D]",
		border: "border-[#CEEAD5]",
	},
	{
		key: "active",
		title: "Active Orders",
		subtitle: "Total orders",
		tone: "bg-[#EEF2F6]",
		accent: "text-[#334155]",
		border: "border-[#D8E1EA]",
	},
];

const statusPalette = {
	Pending: "bg-slate-100 text-slate-700 border-slate-200/60",
	Preparing: "bg-[#FEF0E6] text-[#D97706] border-orange-200/50",
	Completed: "bg-[#EAF5EC] text-[#16A34A] border-emerald-200/50",
	Declined: "bg-[#FDECEB] text-[#E11D48] border-rose-200/50",
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

const isInvalidImageUrl = (value) => {
	if (!value) return true;
	const lower = String(value).trim().toLowerCase();
	if (
		!lower ||
		lower === "n/a" ||
		lower === "null" ||
		lower === "undefined" ||
		lower.includes("bing.com/images/search") ||
		lower.includes("google.com/url") ||
		lower.includes("google.com/search") ||
		lower.includes("/images/test.jpg")
	) {
		return true;
	}
	return false;
};

const resolveProductImage = (value) => {
	if (!value) return "";
	const trimmed = String(value).trim();
	if (isInvalidImageUrl(trimmed)) {
		return "";
	}
	if (/^data:/i.test(trimmed)) return trimmed;
	if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
	return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};

const ProductThumbnail = ({ src, alt }) => {
	const resolved = resolveProductImage(src);
	const [imageSrc, setImageSrc] = useState(() => resolved || defaultFoodImg);

	useEffect(() => {
		setImageSrc(resolved || defaultFoodImg);
	}, [resolved]);

	const handleError = () => {
		if (imageSrc !== defaultFoodImg) {
			setImageSrc(defaultFoodImg);
		}
	};

	return (
		<img
			src={imageSrc}
			alt={alt || "Product"}
			className="w-full h-full object-cover"
			onError={handleError}
			loading="lazy"
		/>
	);
};

const KitchenManagement = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const branchId = user?.b_id ?? user?.B_id;
	const [branchName, setBranchName] = useState("");
	const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
	const [orders, setOrders] = useState([]);
	const [orderItems, setOrderItems] = useState([]);
	const [branchProducts, setBranchProducts] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updatingOrderId, setUpdatingOrderId] = useState(null);
	const [acceptedTimes, setAcceptedTimes] = useState(() => {
		try {
			const saved = sessionStorage.getItem("kitchen_order_accepted_times");
			return saved ? JSON.parse(saved) : {};
		} catch (e) {
			return {};
		}
	});

	const [completedTimes, setCompletedTimes] = useState(() => {
		try {
			const saved = sessionStorage.getItem("kitchen_order_completed_times");
			return saved ? JSON.parse(saved) : {};
		} catch (e) {
			return {};
		}
	});

	const [declinedTimes, setDeclinedTimes] = useState(() => {
		try {
			const saved = sessionStorage.getItem("kitchen_order_declined_times");
			return saved ? JSON.parse(saved) : {};
		} catch (e) {
			return {};
		}
	});

	const [collapsedColumns, setCollapsedColumns] = useState({
		pending: false,
		accepted: false,
		completed: false,
		rejected: false,
	});
	const [selectedView, setSelectedView] = useState("all");
	const [activeOrderHighlight, setActiveOrderHighlight] = useState(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [treeOpen, setTreeOpen] = useState({
		pending: true,
		accepted: true,
		completed: false,
		rejected: false,
	});

	const toggleColumn = (key) => {
		setCollapsedColumns((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const toggleTree = (key) => {
		setTreeOpen((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const scrollToOrder = (orderId, targetStatus) => {
		if (!orderId) return;

		if (targetStatus === "completed" && selectedView !== "completed") {
			setSelectedView("completed");
		} else if (targetStatus === "cancelled" && selectedView !== "rejected") {
			setSelectedView("rejected");
		} else if (
			(targetStatus === "pending" || targetStatus === "preparing" || !targetStatus) &&
			(selectedView === "completed" || selectedView === "rejected")
		) {
			setSelectedView("all");
		}

		setActiveOrderHighlight(orderId);

		setTimeout(() => {
			const element = document.getElementById(`order-card-${orderId}`);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}, 120);

		setTimeout(() => {
			setActiveOrderHighlight((prev) => (prev === orderId ? null : prev));
		}, 3000);
	};

	useEffect(() => {
		if (!branchId) {
			setBranchName(user?.B_name || user?.b_name || user?.branchName || "");
			return;
		}
		let isMounted = true;
		getBranchById(branchId)
			.then((res) => {
				if (isMounted) {
					const b = res?.data || res;
					setBranchName(b?.B_name || b?.b_name || "");
				}
			})
			.catch(() => {
				if (isMounted) setBranchName("");
			});
		return () => {
			isMounted = false;
		};
	}, [branchId, user]);

	const displayName = useMemo(() => {
		const full = `${user?.u_fname || ""} ${user?.u_lname || ""}`.trim();
		return full || user?.name || user?.userName || user?.u_email || "Kitchen Staff";
	}, [user]);

	const handleLogout = async () => {
		try {
			if (logout) await logout();
		} catch (err) {
			console.error("Logout error:", err);
		} finally {
			navigate("/login");
		}
	};

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
			if (orderData?.or_id) {
				const rawId = orderData.or_id;
				const numId = Number(String(rawId).replace(/\D/g, "")) || rawId;
				const now = Date.now();
				if (orderData.or_status === "preparing") {
					setAcceptedTimes((prev) => {
						if (prev[numId]) return prev;
						const next = { ...prev, [numId]: now };
						sessionStorage.setItem("kitchen_order_accepted_times", JSON.stringify(next));
						return next;
					});
				} else if (orderData.or_status === "completed") {
					setCompletedTimes((prev) => {
						const next = { ...prev, [numId]: now };
						sessionStorage.setItem("kitchen_order_completed_times", JSON.stringify(next));
						return next;
					});
				} else if (orderData.or_status === "cancelled") {
					setDeclinedTimes((prev) => {
						const next = { ...prev, [numId]: now };
						sessionStorage.setItem("kitchen_order_declined_times", JSON.stringify(next));
						return next;
					});
				}
			}
			scheduleRefresh(true);
		};

		// Handler for order deleted
		const handleOrderDeleted = (orderData) => {
			console.log("Order deleted (kitchen):", orderData);
			scheduleRefresh(true);
		};

		socket.on("order:created", handleOrderCreated);
		socket.on("order:updated", handleOrderUpdated);
		socket.on("order:ready", handleOrderUpdated);
		socket.on("order:deleted", handleOrderDeleted);
		// Also listen to new constant events for future compatibility
		socket.on(SOCKET_EVENTS.ORDER_SENT, handleOrderCreated);
		socket.on(SOCKET_EVENTS.ORDER_ACCEPTED, handleOrderUpdated);
		socket.on(SOCKET_EVENTS.ORDER_READY, handleOrderUpdated);

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
			// Keep items that are assigned to kitchen or have no station restriction
			if (stations.Kitchen === false) return acc;
			if (stations.Bar === true && stations.Kitchen !== true) return acc;
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

	const parseTimeToSeconds = (timeStr) => {
		if (!timeStr) return 0;
		const str = String(timeStr).trim();
		const isPM = /pm/i.test(str);
		const isAM = /am/i.test(str);
		const match = str.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
		if (!match) return 0;
		let hours = parseInt(match[1], 10) || 0;
		const minutes = parseInt(match[2], 10) || 0;
		const seconds = parseInt(match[3] || "0", 10) || 0;
		if (isPM && hours < 12) hours += 12;
		if (isAM && hours === 12) hours = 0;
		return hours * 3600 + minutes * 60 + seconds;
	};

	const getOrderNumericId = (order) => {
		const raw = order?.or_id ?? order?.id ?? 0;
		const clean = String(raw).replace(/\D/g, "");
		return Number(clean) || 0;
	};

	const getOrderTimestamp = (order) => {
		if (!order) return 0;

		const fullIso = order?.created_at || order?.createdAt;
		if (fullIso) {
			const parsed = new Date(fullIso);
			if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
		}

		const dateValue = order?.or_date;
		let dateMs = 0;
		if (dateValue) {
			const dateMatch = String(dateValue).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
			if (dateMatch) {
				const y = parseInt(dateMatch[1], 10);
				const m = parseInt(dateMatch[2], 10) - 1;
				const d = parseInt(dateMatch[3], 10);
				dateMs = new Date(y, m, d).getTime();
			} else {
				const parsed = new Date(dateValue);
				if (!Number.isNaN(parsed.getTime())) {
					const d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
					dateMs = d.getTime();
				}
			}
		}

		const timeSeconds = parseTimeToSeconds(order?.or_time);

		if (dateMs > 0 || timeSeconds > 0) {
			return dateMs + (timeSeconds * 1000);
		}

		return getOrderNumericId(order);
	};

	const isWithinLastDays = (order, days = 7) => {
		if (!order) return false;
		const orderTime = getOrderTimestamp(order);
		if (!orderTime || orderTime < 100000000000) return true;
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
		return orderTime >= cutoff;
	};

	const statusCounts = useMemo(() => {
		const counts = { pending: 0, preparing: 0, ready: 0 };

		filteredOrders.forEach((order) => {
			if (order.or_status === "pending") counts.pending += 1;
			if (order.or_status === "preparing") counts.preparing += 1;
			if (order.or_status === "completed" && isWithinLastDays(order, 7)) counts.ready += 1;
		});

		return {
			pending: counts.pending,
			preparing: counts.preparing,
			ready: counts.ready,
			active: counts.pending + counts.preparing,
		};
	}, [filteredOrders]);

	const sortedOrders = useMemo(() => {
		return [...filteredOrders].sort((a, b) => {
			const delta = getOrderTimestamp(b) - getOrderTimestamp(a);
			if (delta !== 0) return delta;
			return getOrderNumericId(b) - getOrderNumericId(a);
		});
	}, [filteredOrders]);

	// Received / Pending orders: First-In-First-Out (FIFO) - earliest / first received order appears first (e.g. 9:50 AM before 10:00 AM)
	const pendingOrders = useMemo(
		() =>
			[...filteredOrders]
				.filter((order) => order.or_status === "pending")
				.sort((a, b) => {
					const delta = getOrderTimestamp(a) - getOrderTimestamp(b);
					if (delta !== 0) return delta;
					return getOrderNumericId(a) - getOrderNumericId(b);
				}),
		[filteredOrders],
	);

	const getAcceptedTimestamp = (order) => {
		const id = getOrderNumericId(order);
		if (acceptedTimes[id]) return acceptedTimes[id];
		return getOrderTimestamp(order);
	};

	const getCompletedTimestamp = (order) => {
		const id = getOrderNumericId(order);
		if (completedTimes[id]) return completedTimes[id];
		return getOrderTimestamp(order);
	};

	const getDeclinedTimestamp = (order) => {
		const id = getOrderNumericId(order);
		if (declinedTimes[id]) return declinedTimes[id];
		return getOrderTimestamp(order);
	};

	// Accepted / Preparing orders: First-In-First-Out (FIFO) - the order accepted FIRST appears FIRST at the top
	const preparingOrders = useMemo(
		() =>
			[...filteredOrders]
				.filter((order) => order.or_status === "preparing")
				.sort((a, b) => {
					const delta = getAcceptedTimestamp(a) - getAcceptedTimestamp(b);
					if (delta !== 0) return delta;
					return getOrderNumericId(a) - getOrderNumericId(b);
				}),
		[filteredOrders, acceptedTimes],
	);

	// Completed / Ready orders: FIFO / chronological completion (last 7 days only)
	const completedOrders = useMemo(
		() =>
			[...filteredOrders]
				.filter((order) => order.or_status === "completed" && isWithinLastDays(order, 7))
				.sort((a, b) => {
					const delta = getCompletedTimestamp(b) - getCompletedTimestamp(a);
					if (delta !== 0) return delta;
					return getOrderNumericId(b) - getOrderNumericId(a);
				}),
		[filteredOrders, completedTimes],
	);

	// Declined / Rejected orders: in order of decline (last 7 days only)
	const rejectedOrders = useMemo(
		() =>
			[...filteredOrders]
				.filter((order) => order.or_status === "cancelled" && isWithinLastDays(order, 7))
				.sort((a, b) => {
					const delta = getDeclinedTimestamp(b) - getDeclinedTimestamp(a);
					if (delta !== 0) return delta;
					return getOrderNumericId(b) - getOrderNumericId(a);
				}),
		[filteredOrders, declinedTimes],
	);

	const renderOrderCard = (order) => {
		const statusLabel = getStatusLabel(order);
		const tagStyle = statusPalette[statusLabel] || statusPalette.Pending;
		const isPending = order.or_status === "pending";
		const isPreparing = order.or_status === "preparing";
		const isHighlighted = activeOrderHighlight === order.or_id;

		return (
			<div
				key={order.or_id}
				id={`order-card-${order.or_id}`}
				className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 flex flex-col gap-3 transition-all duration-300 ${
					isHighlighted
						? "border-emerald-500 ring-4 ring-emerald-400/50 shadow-lg scale-[1.01]"
						: "border-slate-200/60"
				}`}
			>
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
						<div>
							<div className="text-sm font-bold text-slate-900">
								{t("kitchen.ord", "ORD")}{String(order.or_id).padStart(5, "0")}
							</div>
							<div className="text-xs text-slate-500 font-normal mt-0.5">
								{String(t("kitchen." + (order.or_type || "takeaway").toLowerCase().replace(/-/g, "_").replace(/ /g, "_"), order.or_type || "takeaway")).toLowerCase()} | {order.or_time?.slice(0, 5) || "--:--"}
							</div>
						</div>

						<div className="flex items-center gap-2">
							<span
								className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tagStyle}`}
							>
								{t("kitchen." + statusLabel.toLowerCase(), statusLabel)}
							</span>
							<span className="text-xs text-slate-400 flex items-center gap-1 font-normal">
								<FaClock className="text-slate-400 text-xs" />
								<span>{order.or_time?.slice(0, 5) || "--:--"}</span>
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-2 pt-1">
						{renderOrderItems(order.or_id)}
					</div>

					{(order.or_notes || order.or_addons || order.or_allergies) && (
						<div className="flex flex-col gap-1.5 mt-0.5">
							{order.or_allergies && (
								<div className="flex items-center text-xs p-2.5 rounded-xl bg-[#FDECEB] text-rose-900">
									<span className="font-bold text-[10px] text-rose-700 uppercase tracking-wide mr-2">
										{t("kitchen.allergies", "ALLERGIES").toUpperCase()}
									</span>
									<span className="font-medium text-xs">{order.or_allergies}</span>
								</div>
							)}
							{order.or_addons && (
								<div className="flex items-center text-xs p-2.5 rounded-xl bg-[#EBF3FC] text-sky-900">
									<span className="font-bold text-[10px] text-sky-700 uppercase tracking-wide mr-2">
										{t("kitchen.add_ons", "ADD-ONS").toUpperCase()}
									</span>
									<span className="font-medium text-xs">{order.or_addons}</span>
								</div>
							)}
							{order.or_notes && (
								<div className="flex items-center text-xs p-2.5 rounded-xl bg-[#FAF3E8] text-amber-950">
									<span className="font-bold text-[10px] text-[#8C531B] uppercase tracking-wide mr-2">
										{t("kitchen.note", "NOTE").toUpperCase()}
									</span>
									<span className="font-medium text-xs text-slate-700">{order.or_notes}</span>
								</div>
							)}
						</div>
					)}

					{isPending && (
						<div className="flex items-center gap-3 mt-1 pt-1">
							<button
								onClick={() => updateStatus(order.or_id, "preparing")}
								disabled={updatingOrderId === order.or_id}
								className="flex-1 py-2.5 rounded-xl bg-[#E6F7EB] text-[#16A34A] text-sm font-semibold hover:bg-[#D4F3DC] transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{t("kitchen.accept", "Accept")}
							</button>
							<button
								onClick={() => updateStatus(order.or_id, "cancelled")}
								disabled={updatingOrderId === order.or_id}
								className="flex-1 py-2.5 rounded-xl bg-[#FDECEB] text-[#E11D48] text-sm font-semibold hover:bg-[#FCD7D5] transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{t("kitchen.decline", "Decline")}
							</button>
						</div>
					)}

					{isPreparing && (
						<div className="flex items-center gap-3 mt-1 pt-1">
							<button
								onClick={() => updateStatus(order.or_id, "completed")}
								disabled={updatingOrderId === order.or_id}
								className="w-full py-2.5 rounded-xl bg-[#22C55E] text-white text-sm font-semibold hover:bg-[#16A34A] transition-colors shadow-sm cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
							>
								✓ {t("kitchen.ready", "Ready")}
							</button>
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderOrderColumn = (title, ordersInColumn, columnKey) => {
		const isCollapsed = collapsedColumns[columnKey];

		const headerColors = {
			pending:   { bg: "bg-[#FEF9EE]", border: "border-[#EFE3D0]", badge: "bg-[#FEF0C7] text-[#A16207]", chevron: "text-[#A16207]" },
			accepted:  { bg: "bg-[#FFF5F3]", border: "border-[#F8D8D0]", badge: "bg-[#FDE8E4] text-[#C2410C]", chevron: "text-[#C2410C]" },
			completed: { bg: "bg-[#F0FDF4]", border: "border-[#CEEAD5]", badge: "bg-[#DCFCE7] text-[#15803D]", chevron: "text-[#15803D]" },
			rejected:  { bg: "bg-[#FFF1F2]", border: "border-[#FECDD3]", badge: "bg-[#FFE4E6] text-[#E11D48]", chevron: "text-[#E11D48]" },
		};
		const colors = headerColors[columnKey] || { bg: "bg-white", border: "border-slate-200", badge: "bg-slate-100 text-slate-700", chevron: "text-slate-400" };

		return (
			<div className="flex flex-col gap-3.5">
				{/* Collapsible Header */}
				<button
					type="button"
					onClick={() => toggleColumn(columnKey)}
					className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border ${colors.bg} ${colors.border} shadow-sm hover:brightness-95 transition-all cursor-pointer`}
				>
					<div className="flex items-center gap-2.5">
						<span className={`transition-transform duration-200 ${colors.chevron}`}>
							{isCollapsed ? <FaChevronDown size={12} /> : <FaChevronUp size={12} />}
						</span>
						<h2 className="text-sm font-bold text-slate-900">{title}</h2>
					</div>
					<span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${colors.badge}`}>
						{ordersInColumn.length}
					</span>
				</button>

				{/* Order Cards — hidden when collapsed */}
				{!isCollapsed && (
					<div className="flex flex-col gap-3.5">
						{ordersInColumn.length ? (
							ordersInColumn.map(renderOrderCard)
						) : (
							<div className="text-sm text-slate-500 py-2">
								{t("kitchen.no_orders", "No orders")}
							</div>
						)}
					</div>
				)}
			</div>
		);
	};

	const updateStatus = async (orderId, nextStatus) => {
		if (!orderId || updatingOrderId) return;

		const numId = Number(String(orderId).replace(/\D/g, "")) || orderId;
		const now = Date.now();

		if (nextStatus === "preparing") {
			setAcceptedTimes((prev) => {
				const next = { ...prev, [numId]: prev[numId] || now };
				sessionStorage.setItem("kitchen_order_accepted_times", JSON.stringify(next));
				return next;
			});
		} else if (nextStatus === "completed") {
			setCompletedTimes((prev) => {
				const next = { ...prev, [numId]: now };
				sessionStorage.setItem("kitchen_order_completed_times", JSON.stringify(next));
				return next;
			});
		} else if (nextStatus === "cancelled") {
			setDeclinedTimes((prev) => {
				const next = { ...prev, [numId]: now };
				sessionStorage.setItem("kitchen_order_declined_times", JSON.stringify(next));
				return next;
			});
		}

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
					{t("kitchen.items_not_available", "Items not available")}
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
					className="flex gap-3.5 items-center py-1"
				>
					<div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
						<ProductThumbnail
							src={product.pro_image}
							alt={name}
						/>
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-sm font-bold text-slate-900 truncate">{name}</div>
						<div className="text-xs text-slate-500 font-normal mt-0.5">
							{t("kitchen.qty", "Qty:")} {quantity}
						</div>
					</div>
				</div>
			);
		});
	};

	return (
		<div className="min-h-screen bg-[#FAF8F5] flex flex-col">
			{/* Kitchen Header - Hotel POS Branding & Profile Controls (TK002 & TK003) */}
			<header className="relative flex h-[70px] w-full items-center justify-between bg-gradient-to-r from-[#0B192C] from-25% via-[#00B4EB] via-65% to-[#55D24B] px-5 text-white shadow-sm flex-none z-30">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0A5BAE] shadow-sm">
						<FaHome className="h-5 w-5" />
					</div>
					<div className="leading-tight">
						<div className="text-base sm:text-[17px] font-semibold tracking-wide text-white">
							{t("cashier.hotel_pos", "Hotel POS")}
						</div>
						<div className="text-xs text-white/80">
							{t("cashier.point_of_sale_system", "Point of Sale System")}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3 sm:gap-4">
					{/* Notification Bell with Dropdown */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowHeaderNotifications((v) => !v)}
							className="relative rounded-full p-2 hover:bg-white/10 transition"
							aria-label="Notifications"
						>
							<FaBell size={20} />
							{orderNotifications.length > 0 && (
								<span className="absolute -top-1 -right-1 min-w-[18px] rounded-full border-2 border-white bg-red-500 px-1 text-center text-[10px] font-bold">
									{orderNotifications.length > 99 ? "99+" : orderNotifications.length}
								</span>
							)}
						</button>
						{showHeaderNotifications && (
							<div className="absolute right-0 top-12 z-[1000] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/10 bg-white text-gray-800 shadow-2xl">
								<div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
									<strong className="text-sm font-bold text-gray-800">
										{t("company_admin.notifications", "Notifications")} ({orderNotifications.length})
									</strong>
									{orderNotifications.length > 0 && (
										<button
											type="button"
											className="text-xs font-semibold text-blue-500 hover:underline"
											onClick={() => setOrderNotifications([])}
										>
											{t("company_admin.clear_all", "Clear all")}
										</button>
									)}
								</div>
								<div className="max-h-[300px] overflow-y-auto p-2">
									{orderNotifications.length === 0 ? (
										<div className="p-6 text-center text-xs text-gray-400">
											{t("company_admin.no_notifications", "No notifications")}
										</div>
									) : (
										orderNotifications.map((notif) => (
											<div key={notif.id} className="p-2.5 rounded-lg border-b border-gray-100 hover:bg-gray-50 text-xs">
												<div className="font-semibold text-gray-800">{notif.message}</div>
												<div className="text-[10px] text-gray-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</div>
											</div>
										))
									)}
								</div>
							</div>
						)}
					</div>

					{/* Translucent Profile Capsule */}
					<div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 shadow-sm">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0A5BAE]">
							<FaUserCircle className="h-5 w-5" />
						</div>
						<div className="hidden leading-tight sm:block text-left">
							<div className="text-sm font-semibold text-white">{displayName}</div>
							<div className="text-[11px] text-white/80">
								{(user?.role_name || user?.role || user?.u_role || "Kitchen")} • {branchName || "Branch"}
							</div>
						</div>
					</div>

					{/* Separate Navy Logout Button */}
					<button
						onClick={handleLogout}
						className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-[#0B192C] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#071220]"
					>
						<FaSignOutAlt className="h-3.5 w-3.5 text-white" />
						<span className="hidden sm:inline">{t("auth.logout", "Logout")}</span>
					</button>
				</div>
			</header>

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
									{t("kitchen.new_order_received", "🍽️ New Order Received")}
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
								{t("kitchen.ok", "OK")}
							</button>
						</div>
					))}
				</div>
			)}

			<div className="flex-1 flex overflow-hidden">
				{/* Left Tree View Sidebar (Antigravity / VS Code Style) */}
				<aside
					className={`${
						isSidebarOpen ? "w-64 sm:w-72" : "w-12"
					} bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 transition-all duration-300 select-none shadow-sm z-10`}
				>
					{/* Sidebar Header */}
					<div className="h-12 border-b border-slate-200/80 px-3 flex items-center justify-between bg-slate-50/70">
						{isSidebarOpen ? (
							<div className="flex items-center gap-2 overflow-hidden">
								<span className="text-xs font-bold tracking-wider uppercase text-slate-700 truncate">
									{t("kitchen.order_navigator", "ORDER NAVIGATOR")}
								</span>
								<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
									{statusCounts.active}
								</span>
							</div>
						) : null}
						<button
							type="button"
							onClick={() => setIsSidebarOpen((v) => !v)}
							title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
							className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition mx-auto"
						>
							{isSidebarOpen ? <FaChevronDown className="-rotate-90 text-xs" /> : <FaChevronRight className="text-xs" />}
						</button>
					</div>

					{isSidebarOpen && (
						<div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
							{/* All Orders Option */}
							<button
								type="button"
								onClick={() => setSelectedView("all")}
								className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition ${
									selectedView === "all"
										? "bg-slate-900 text-white shadow-sm"
										: "text-slate-700 hover:bg-slate-100"
								}`}
							>
								<span className="flex items-center gap-2">
									<span className="w-2 h-2 rounded-full bg-blue-500" />
									{t("kitchen.all_orders", "All Orders")}
								</span>
								<span
									className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
										selectedView === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
									}`}
								>
									{sortedOrders.length}
								</span>
							</button>

							{/* Active Orders Option */}
							<button
								type="button"
								onClick={() => setSelectedView(selectedView === "active" ? "all" : "all")}
								className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
									selectedView === "all"
										? "bg-slate-100 text-slate-900 font-bold"
										: "text-slate-600 hover:bg-slate-100"
								}`}
							>
								<span className="flex items-center gap-2">
									<span className="w-2 h-2 rounded-full bg-slate-600" />
									<span className="uppercase tracking-wide text-[11px] font-bold">
										{t("kitchen.active_orders_upper", "ACTIVE ORDERS")}
									</span>
								</span>
								<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
									{statusCounts.active}
								</span>
							</button>

							<div className="border-t border-slate-100 my-1" />

							{/* Tree Section: PENDING */}
							<div className="pt-1">
								<div
									onClick={() => toggleTree("pending")}
									className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-100 transition ${
										selectedView === "pending" ? "bg-amber-50 text-amber-900 font-bold" : "text-slate-700"
									}`}
								>
									<div className="flex items-center gap-2 overflow-hidden">
										<span className="text-slate-400 text-[10px]">
											{treeOpen.pending ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
										</span>
										<span
											onClick={(e) => {
												e.stopPropagation();
												setSelectedView(selectedView === "pending" ? "all" : "pending");
											}}
											className="font-bold text-xs uppercase tracking-wide text-amber-800 hover:underline"
										>
											{t("kitchen.pending_upper", "PENDING")}
										</span>
									</div>
									<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
										{pendingOrders.length}
									</span>
								</div>

								{treeOpen.pending && (
									<div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5 mt-0.5 max-h-48 overflow-y-auto">
										{pendingOrders.length === 0 ? (
											<div className="text-[11px] text-slate-400 italic py-1 pl-1">
												{t("kitchen.no_orders", "No pending orders")}
											</div>
										) : (
											pendingOrders.map((ord) => (
												<button
													key={ord.or_id}
													type="button"
													onClick={() => scrollToOrder(ord.or_id)}
													className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-amber-50 text-slate-700 hover:text-slate-900 transition text-[11px] group"
												>
													<span className="font-semibold text-slate-800 truncate">
														ORD{String(ord.or_id).padStart(5, "0")}
													</span>
													<span className="text-[10px] text-slate-400 group-hover:text-amber-700">
														{ord.or_time?.slice(0, 5) || "--:--"}
													</span>
												</button>
											))
										)}
									</div>
								)}
							</div>

							{/* Tree Section: PREPARING */}
							<div className="pt-1">
								<div
									onClick={() => toggleTree("accepted")}
									className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-100 transition ${
										selectedView === "accepted" ? "bg-orange-50 text-orange-900 font-bold" : "text-slate-700"
									}`}
								>
									<div className="flex items-center gap-2 overflow-hidden">
										<span className="text-slate-400 text-[10px]">
											{treeOpen.accepted ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
										</span>
										<span
											onClick={(e) => {
												e.stopPropagation();
												setSelectedView(selectedView === "accepted" ? "all" : "accepted");
											}}
											className="font-bold text-xs uppercase tracking-wide text-orange-800 hover:underline"
										>
											{t("kitchen.preparing_upper", "PREPARING")}
										</span>
									</div>
									<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
										{preparingOrders.length}
									</span>
								</div>

								{treeOpen.accepted && (
									<div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5 mt-0.5 max-h-48 overflow-y-auto">
										{preparingOrders.length === 0 ? (
											<div className="text-[11px] text-slate-400 italic py-1 pl-1">
												{t("kitchen.no_orders", "No preparing orders")}
											</div>
										) : (
											preparingOrders.map((ord) => (
												<button
													key={ord.or_id}
													type="button"
													onClick={() => scrollToOrder(ord.or_id, "preparing")}
													className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-orange-50 text-slate-700 hover:text-slate-900 transition text-[11px] group cursor-pointer"
												>
													<span className="font-semibold text-slate-800 truncate">
														ORD{String(ord.or_id).padStart(5, "0")}
													</span>
													<span className="text-[10px] text-slate-400 group-hover:text-orange-700">
														Prep | {ord.or_time?.slice(0, 5) || "--:--"}
													</span>
												</button>
											))
										)}
									</div>
								)}
							</div>

							{/* Tree Section: READY */}
							<div className="pt-1">
								<div
									onClick={() => toggleTree("completed")}
									className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-100 transition ${
										selectedView === "completed" ? "bg-emerald-50 text-emerald-900 font-bold" : "text-slate-700"
									}`}
								>
									<div className="flex items-center gap-2 overflow-hidden">
										<span className="text-slate-400 text-[10px]">
											{treeOpen.completed ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
										</span>
										<span
											onClick={(e) => {
												e.stopPropagation();
												setSelectedView(selectedView === "completed" ? "all" : "completed");
											}}
											className="font-bold text-xs uppercase tracking-wide text-emerald-800 hover:underline"
										>
											{t("kitchen.ready_upper", "READY")}
										</span>
									</div>
									<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
										{completedOrders.length}
									</span>
								</div>

								{treeOpen.completed && (
									<div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5 mt-0.5 max-h-48 overflow-y-auto">
										{completedOrders.length === 0 ? (
											<div className="text-[11px] text-slate-400 italic py-1 pl-1">
												{t("kitchen.no_orders", "No ready orders")}
											</div>
										) : (
											completedOrders.map((ord) => (
												<button
													key={ord.or_id}
													type="button"
													onClick={() => scrollToOrder(ord.or_id, "completed")}
													className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-emerald-50 text-slate-700 hover:text-slate-900 transition text-[11px] group cursor-pointer"
												>
													<span className="font-semibold text-slate-800 truncate">
														ORD{String(ord.or_id).padStart(5, "0")}
													</span>
													<span className="text-[10px] text-slate-400 group-hover:text-emerald-700">
														{ord.or_time?.slice(0, 5) || "--:--"}
													</span>
												</button>
											))
										)}
									</div>
								)}
							</div>

							{/* Separate Action Buttons for Completed and Declined Orders */}
							<div className="border-t border-slate-200/80 my-3 pt-2">
								<div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
									{t("kitchen.archive_history", "Archive & History")}
								</div>

								{/* Completed Orders Button */}
								<button
									type="button"
									onClick={() => setSelectedView(selectedView === "completed" ? "all" : "completed")}
									className={`w-full flex items-center justify-between px-2.5 py-2 mb-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
										selectedView === "completed"
											? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
											: "bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
									}`}
								>
									<span className="flex items-center gap-2">
										<span className={`w-2 h-2 rounded-full ${selectedView === "completed" ? "bg-white" : "bg-emerald-500"}`} />
										{t("kitchen.completed_orders", "Completed Orders")}
									</span>
									<span
										className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
											selectedView === "completed" ? "bg-white/20 text-white" : "bg-emerald-200/80 text-emerald-900"
										}`}
									>
										{completedOrders.length}
									</span>
								</button>

								{/* Declined Orders Button */}
								<button
									type="button"
									onClick={() => setSelectedView(selectedView === "rejected" ? "all" : "rejected")}
									className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
										selectedView === "rejected"
											? "bg-rose-600 text-white border-rose-700 shadow-sm"
											: "bg-rose-50/80 text-rose-800 border-rose-200 hover:bg-rose-100"
									}`}
								>
									<span className="flex items-center gap-2">
										<span className={`w-2 h-2 rounded-full ${selectedView === "rejected" ? "bg-white" : "bg-rose-500"}`} />
										{t("kitchen.declined_orders", "Declined Orders")}
									</span>
									<span
										className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
											selectedView === "rejected" ? "bg-white/20 text-white" : "bg-rose-200/80 text-rose-900"
										}`}
									>
										{rejectedOrders.length}
									</span>
								</button>
							</div>
						</div>
					)}
				</aside>

				{/* Main Content Area */}
				<main className="flex-1 overflow-y-auto">
					<div className="max-w-none mx-0 px-4 sm:px-6 lg:px-8 py-5">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
							<div>
								<div className="flex items-center gap-3">
									<h1 className="text-xl sm:text-2xl font-bold text-slate-900">
										{t("kitchen.kitchen_order_management", "Kitchen Order Management")}
									</h1>
									{selectedView !== "all" && (
										<span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 text-white font-medium flex items-center gap-1.5">
											<span>Filter: {selectedView}</span>
											<button
												onClick={() => setSelectedView("all")}
												className="hover:text-rose-300 font-bold ml-1 cursor-pointer"
											>
												×
											</button>
										</span>
									)}
								</div>
								<p className="text-xs sm:text-sm text-slate-500 mt-1">
									{t("kitchen.manage_and_track_all_incoming_orders", "Manage and track all incoming orders")}
								</p>
							</div>

							<div className="relative w-full sm:w-80">
								<FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
								<input
									value={searchTerm}
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder={t("kitchen.search_items", "Search items...")}
									className="w-full h-11 rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all"
								/>
							</div>
						</div>

						{error && (
							<div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
								{error}
							</div>
						)}

						{loading ? (
							<div className="text-sm text-slate-500 py-8 text-center">{t("kitchen.loading_orders", "Loading orders...")}</div>
						) : selectedView === "pending" ? (
							<div className="max-w-3xl">
								{renderOrderColumn(t("kitchen.received_orders", "Received Orders"), pendingOrders, "pending")}
							</div>
						) : selectedView === "accepted" ? (
							<div className="max-w-3xl">
								{renderOrderColumn(t("kitchen.accepted_orders", "Accepted / Preparing"), preparingOrders, "accepted")}
							</div>
						) : selectedView === "completed" ? (
							<div>
								<div className="mb-4 flex items-center justify-between">
									<div className="text-sm font-bold text-emerald-800 flex items-center gap-2">
										<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
										<span>{t("kitchen.completed_orders", "Completed Orders")} ({completedOrders.length})</span>
										<span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
											{t("kitchen.last_7_days", "Last 7 Days")}
										</span>
									</div>
									<button
										type="button"
										onClick={() => setSelectedView("all")}
										className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-sm cursor-pointer"
									>
										← {t("kitchen.back_to_active", "Back to Active Kitchen")}
									</button>
								</div>
								<div className="max-w-4xl">
									{renderOrderColumn(t("kitchen.completed_orders", "Completed Orders"), completedOrders, "completed")}
								</div>
							</div>
						) : selectedView === "rejected" ? (
							<div>
								<div className="mb-4 flex items-center justify-between">
									<div className="text-sm font-bold text-rose-800 flex items-center gap-2">
										<span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
										<span>{t("kitchen.rejected_orders", "Declined Orders")} ({rejectedOrders.length})</span>
										<span className="text-[11px] font-medium text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
											{t("kitchen.last_7_days", "Last 7 Days")}
										</span>
									</div>
									<button
										type="button"
										onClick={() => setSelectedView("all")}
										className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-sm cursor-pointer"
									>
										← {t("kitchen.back_to_active", "Back to Active Kitchen")}
									</button>
								</div>
								<div className="max-w-4xl">
									{renderOrderColumn(t("kitchen.rejected_orders", "Rejected Orders"), rejectedOrders, "rejected")}
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{renderOrderColumn(t("kitchen.received_orders", "Received Orders"), pendingOrders, "pending")}
								{renderOrderColumn(t("kitchen.accepted_orders", "Accepted / Preparing"), preparingOrders, "accepted")}
							</div>
						)}
					</div>
				</main>
			</div>


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