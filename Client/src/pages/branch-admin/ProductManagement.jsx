import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	FaBell,
	FaBoxOpen,
	FaChevronDown,
	FaExclamationTriangle,
	FaSearch,
} from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import { getProducts, updateProduct } from "../../services/api";

const cardBaseStyle = {
	flex: "0 1 calc((100% - 60px) / 3)",
	borderRadius: "18px",
	padding: "25px 18px",
	display: "flex",
	alignItems: "center",
	gap: "2px",
	minHeight: "98px",
};

const statIconWrapStyle = {
	width: "30px",
	height: "30px",
	borderRadius: "8px",
	display: "grid",
	placeItems: "center",
	flexShrink: 0,
	transform: "translateX(2px)",
};

const statTextWrapStyle = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	marginLeft: "-6px",
};

const statRightSpacerStyle = {
	width: "18px",
	flexShrink: 0,
};

const statTitleStyle = {
	fontSize: "24px",
	fontWeight: "700",
	color: "#101828",
	lineHeight: 1,
	textAlign: "center",
};

const statValueStyle = {
	fontSize: "24px",
	fontWeight: "700",
	lineHeight: 1.1,
	textAlign: "center",
};

const getStockStatus = (quantity) => {
	if (quantity <= 0) return "Out of stock";
	if (quantity <= 10) return "Low stock";
	return "In stock";
};

const mapApiProductToTableItem = (product) => {
	const quantity = Number(product.pro_qty ?? 0);
	const price = Number(product.pro_price ?? 0);

	return {
		id: product.pro_id,
		image: "📦",
		name: product.pro_name,
		sku: `SKU: PRD-${String(product.pro_id).padStart(3, "0")}`,
		category: "General",
		price: `$${price.toFixed(2)}`,
		discount: "0%",
		stock: quantity,
		status: getStockStatus(quantity),
	};
};

const ProductManagement = () => {
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = useState("");
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updatingStockId, setUpdatingStockId] = useState(null);

	useEffect(() => {
		let isMounted = true;

		const loadProducts = async () => {
			try {
				setLoading(true);
				setError("");
				const response = await getProducts();
				if (!isMounted) return;
				setProducts(Array.isArray(response) ? response : []);
			} catch (err) {
				if (!isMounted) return;
				setError(err?.response?.data?.message || "Failed to load products");
				setProducts([]);
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		loadProducts();

		return () => {
			isMounted = false;
		};
	}, []);

	const tableProducts = useMemo(() => {
		const mapped = products.map(mapApiProductToTableItem);
		const query = searchTerm.trim().toLowerCase();

		if (!query) return mapped;

		return mapped.filter((item) => {
			return (
				item.name.toLowerCase().includes(query) ||
				item.sku.toLowerCase().includes(query) ||
				item.category.toLowerCase().includes(query)
			);
		});
	}, [products, searchTerm]);

	const totalItems = products.length;
	const lowStockCount = products.filter((item) => {
		const quantity = Number(item.pro_qty ?? 0);
		return quantity > 0 && quantity <= 10;
	}).length;
	const outOfStockCount = products.filter((item) => Number(item.pro_qty ?? 0) <= 0).length;

	const handleAdjustStock = async (productId, delta) => {
		if (updatingStockId !== null) return;

		const existing = products.find((item) => item.pro_id === productId);
		if (!existing) return;

		const currentQty = Number(existing.pro_qty ?? 0);
		const nextQty = Math.max(0, currentQty + delta);
		if (nextQty === currentQty) return;

		try {
			setUpdatingStockId(productId);
			setError("");
			const updated = await updateProduct(productId, { pro_qty: nextQty });

			setProducts((prev) =>
				prev.map((item) =>
					item.pro_id === productId
						? {
							...item,
							...updated,
							pro_qty: Number(updated?.pro_qty ?? nextQty),
						}
						: item
				)
			);
		} catch (err) {
			setError(err?.response?.data?.message || "Failed to update stock quantity");
		} finally {
			setUpdatingStockId(null);
		}
	};

	const handleViewProduct = (productId) => {
		navigate(`/branch-admin/products/${productId}`);
	};

	const handleEditProduct = (productId) => {
		navigate(`/branch-admin/products/${productId}/edit`);
	};

	const handleDeleteProduct = (productId) => {
		navigate(`/branch-admin/products/${productId}/delete`);
	};

	return (
		<div style={{ display: "flex", background: "#F2F4F7", minHeight: "100vh" }}>
			<Sidebar />

			<div style={{ flex: 1, marginLeft: "240px" }}>
				<Header
					title="Product Management"
					role="Branch Admin"
					email="branchadmin@gmail.com"
					showAddUserIcon
				/>

				<div style={{ padding: "22px 20px" }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "28px",
						}}
					>
						<h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#0F172A" }}>
							Product Management
						</h1>

						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									background: "#E5E7EB",
									borderRadius: "8px",
									padding: "8px 12px",
									width: "340px",
								}}
							>
								<FaSearch color="#9CA3AF" />
								<input
									type="text"
									placeholder="Search Products , SKUs, or Categories"
									style={{
										border: "none",
										outline: "none",
										background: "transparent",
										width: "100%",
										fontSize: "14px",
										color: "#6B7280",
									}}
									onChange={(event) => setSearchTerm(event.target.value)}
								/>
							</div>
							<Button
								label="+  Add Product"
								onClick={() => navigate("/branch-admin/products/add")}
								style={{
									background: "#0E6DCF",
									borderRadius: "3px",
									padding: "10px 18px",
									fontWeight: "600",
								}}
							/>
						</div>
					</div>

					<div style={{ display: "flex", gap: "15px", marginBottom: "30px" }}>
						<div style={{ ...cardBaseStyle, background: "#BEE8C4" }}>
							<div
								style={{
									...statIconWrapStyle,
									background: "#22C55E",
								}}
							>
								<FaBoxOpen color="#0B3F1D" size={12} />
							</div>
							<div style={statTextWrapStyle}>
								<div style={statTitleStyle}>Total Items</div>
								<div style={statValueStyle}>{totalItems}</div>
							</div>
							<div style={statRightSpacerStyle} />
						</div>

						<div style={{ ...cardBaseStyle, background: "#F3C8DA" }}>
							<div
								style={{
									...statIconWrapStyle,
									background: "#F87171",
								}}
							>
								<FaBell color="#7F1D1D" size={12} />
							</div>
							<div style={statTextWrapStyle}>
								<div style={statTitleStyle}>Low Stock</div>
								<div style={statValueStyle}>{lowStockCount}</div>
							</div>
							<div style={statRightSpacerStyle} />
						</div>

						<div style={{ ...cardBaseStyle, background: "#C8E0EC" }}>
							<div
								style={{
									...statIconWrapStyle,
									background: "#38BDF8",
								}}
							>
								<FaExclamationTriangle color="#0C4A6E" size={12} />
							</div>
							<div style={statTextWrapStyle}>
								<div style={statTitleStyle}>Out Of Stock</div>
								<div style={statValueStyle}>{outOfStockCount}</div>
							</div>
							<div style={statRightSpacerStyle} />
						</div>
					</div>

					{loading && (
						<div style={{ marginBottom: "14px", color: "#475569", fontSize: "14px" }}>
							Loading products...
						</div>
					)}

					{error && (
						<div style={{ marginBottom: "14px", color: "#B91C1C", fontSize: "14px" }}>{error}</div>
					)}

					<div style={{ display: "flex", gap: "14px", marginBottom: "24px" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								background: "#fff",
								borderRadius: "12px",
								boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
								padding: "8px 12px",
								flex: 1,
							}}
						>
							<FaSearch color="#9CA3AF" size={14} />
							<input
								type="text"
								placeholder="Search by Name or Code"
								style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }}
							/>
						</div>

						{["Category : All", "Status : All", "Stock Level : All"].map((option) => (
							<div key={option} style={{ position: "relative", width: "182px" }}>
								<select
									style={{
										width: "100%",
										height: "36px",
										background: "#fff",
										borderRadius: "13px",
										boxShadow: "0 1px 3px rgba(0,0,0,0.22)",
										border: "1px solid #D9DCE1",
										padding: "0 34px 0 14px",
										fontSize: "13px",
										fontWeight: "500",
										color: "#4B5563",
										outline: "none",
										appearance: "none",
										WebkitAppearance: "none",
										MozAppearance: "none",
									}}
								>
									<option>{option}</option>
								</select>
								<FaChevronDown
									size={11}
									color="#111827"
									style={{
										position: "absolute",
										right: "17px",
										top: "50%",
										transform: "translateY(-50%)",
										pointerEvents: "none",
									}}
								/>
							</div>
						))}
					</div>

					<ProductItemsTable
						products={tableProducts}
						onDecreaseStock={(id) => handleAdjustStock(id, -1)}
						onIncreaseStock={(id) => handleAdjustStock(id, 1)}
						onViewProduct={handleViewProduct}
						onEditProduct={handleEditProduct}
						onDeleteProduct={handleDeleteProduct}
						updatingStockId={updatingStockId}
					/>
				</div>
			</div>
		</div>
	);
};

export default ProductManagement;
