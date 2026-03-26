import React from "react";
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

const products = [
	{
		id: 1,
		image: "🍔",
		name: "Classic Cheeseburger",
		sku: "SKU: CHB-001",
		category: "Main Course",
		price: "$12.50",
		discount: "10%",
		stock: 42,
		status: "In stock",
	},
	{
		id: 2,
		image: "🥗",
		name: "Garden Salmon Salad",
		sku: "SKU: SAL-042",
		category: "Salads",
		price: "$15.00",
		discount: "15%",
		stock: 5,
		status: "Low stock",
	},
	{
		id: 3,
		image: "🍩",
		name: "Choco Donut",
		sku: "SKU: DNT-009",
		category: "Desserts",
		price: "$3.25",
		discount: "05%",
		stock: 0,
		status: "Out of stock",
	},
	{
		id: 4,
		image: "☕",
		name: "Iced Coffee",
		sku: "SKU: BEV-112",
		category: "Beverages",
		price: "$5.45",
		discount: "10%",
		stock: 128,
		status: "In stock",
	},
];

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

const ProductManagement = () => {
	const navigate = useNavigate();

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
                                        margintop: "15px"
									}}
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
								<div style={statValueStyle}>150</div>
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
								<div style={statValueStyle}>19</div>
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
								<div style={statValueStyle}>08</div>
							</div>
							<div style={statRightSpacerStyle} />
						</div>
					</div>

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

					<ProductItemsTable products={products} />
				</div>
			</div>
		</div>
	);
};

export default ProductManagement;
