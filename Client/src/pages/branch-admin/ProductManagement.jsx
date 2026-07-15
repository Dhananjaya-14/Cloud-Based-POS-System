import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	FaBell,
	FaBoxOpen,
	FaChevronDown,
	FaExclamationTriangle,
	FaSearch,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import { getBranchProducts, updateBranchProduct, deleteBranchProduct, addBranchProductStock, getBranchProductIngredientStatus } from "../../services/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

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

const getStockStatus = (quantity, lowStockLimit = 10) => {
	if (quantity <= 0) return "Out of stock";
	if (quantity <= lowStockLimit) return "Low stock";
	return "In stock";
};

const resolveProductImage = (value) => {
	if (!value) return "";
	const trimmed = String(value).trim();
	if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
	if (/^data:/i.test(trimmed)) return trimmed;
	if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
	return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};

const mapApiProductToTableItem = (product) => {
	const quantity = Number(product.pro_quantity ?? 0);
	const price = Number(product.pro_price ?? 0);
	const imageUrl = resolveProductImage(product.pro_image);

	return {
		id: product.Bpro_id,
		product_type: product.product_type || "made_to_order",
		imageUrl,
		imageAlt: product.pro_name || "Product",
		name: product.pro_name,
		sku: `SKU: BPRD-${String(product.Bpro_id).padStart(3, "0")}`,
		category: product.cat_name || "General",
		price: `$${price.toFixed(2)}`,
		discount: "0%",
		stock: quantity,
		status: product.calculated_status || "In stock",
	};
};

const ProductManagement = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [searchTerm, setSearchTerm] = useState("");
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updatingStockId, setUpdatingStockId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 4;
	const [deleteTargetId, setDeleteTargetId] = useState(null);
	const [deleteTargetName, setDeleteTargetName] = useState("");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	
	const [activeTab, setActiveTab] = useState("made_to_order");
	const [stockModalItem, setStockModalItem] = useState(null);
	const [stockModalQty, setStockModalQty] = useState("");

	useEffect(() => {
		let isMounted = true;

		const loadProducts = async () => {
			try {
				setLoading(true);
				setError("");
				// Use b_id directly from the JWT token — no need to re-fetch all branches
				const myBranchId = user?.b_id ?? null;
				
				const response = myBranchId ? await getBranchProducts(myBranchId) : [];
				
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
	}, [user?.u_id]);

	const tableProducts = useMemo(() => {
		let mapped = products.map(mapApiProductToTableItem);
		
		if (activeTab === "made_to_order") {
			mapped = mapped.filter(item => item.product_type === "made_to_order");
		} else if (activeTab === "pre_made") {
			mapped = mapped.filter(item => item.product_type === "pre_made");
		} else if (activeTab === "finished") {
			mapped = mapped.filter(item => item.product_type === "finished");
		}

		const query = searchTerm.trim().toLowerCase();

		if (!query) return mapped;

		return mapped.filter((item) => {
			return (
				item.name.toLowerCase().includes(query) ||
				item.sku.toLowerCase().includes(query) ||
				item.category.toLowerCase().includes(query)
			);
		});
	}, [products, searchTerm, activeTab]);

	const totalPages = Math.max(1, Math.ceil(tableProducts.length / itemsPerPage));

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, activeTab]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const paginatedProducts = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return tableProducts.slice(startIndex, startIndex + itemsPerPage);
	}, [tableProducts, currentPage]);

	const pageStart = tableProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
	const pageEnd = Math.min(currentPage * itemsPerPage, tableProducts.length);

	const totalItems = products.length;
	const lowStockCount = products.filter((item) => item.calculated_status === "Low stock").length;
	const outOfStockCount = products.filter((item) => item.calculated_status === "Out of stock").length;

	const handleAdjustStock = async (productId, delta) => {
		if (updatingStockId !== null) return;

		const existing = products.find((item) => item.Bpro_id === productId);
		if (!existing) return;

		const currentQty = Number(existing.pro_quantity ?? 0);
		const nextQty = Math.max(0, currentQty + delta);
		if (nextQty === currentQty) return;

		try {
			setUpdatingStockId(productId);
			setError("");
			const updated = await updateBranchProduct(productId, { pro_quantity: nextQty });

			setProducts((prev) =>
				prev.map((item) =>
					item.Bpro_id === productId
						? {
							...item,
							...updated,
							pro_quantity: Number(updated?.pro_quantity ?? nextQty),
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

	const handleConfirmAddStock = async () => {
		if (!stockModalItem || !stockModalQty) return;
		const qty = parseInt(stockModalQty, 10);
		if (isNaN(qty) || qty <= 0) return;

		try {
			setUpdatingStockId(stockModalItem.id);
			setError("");
			const updated = await addBranchProductStock(stockModalItem.id, qty);

			setProducts((prev) =>
				prev.map((item) =>
					item.Bpro_id === stockModalItem.id
						? {
							...item,
							...updated,
						}
						: item
				)
			);
			setStockModalItem(null);
			setStockModalQty("");
		} catch (err) {
			setError(err?.response?.data?.message || "Failed to add stock");
		} finally {
			setUpdatingStockId(null);
		}
	};

	const handleDeleteClick = (productId) => {
			const product = products.find((item) => item.Bpro_id === productId);
			setDeleteTargetId(productId);
			setDeleteTargetName(product?.pro_name || "this product");
			setShowDeleteConfirm(true);
			};

			const handleConfirmDelete = async () => {
			if (!deleteTargetId) return;
			try {
				setIsDeleting(true);
				await deleteBranchProduct(deleteTargetId);
				setProducts((prev) => prev.filter((item) => item.Bpro_id !== deleteTargetId));
				setShowDeleteConfirm(false);
				setDeleteTargetId(null);
				setDeleteTargetName("");
			} catch (err) {
				setError(err?.response?.data?.message || "Failed to delete product");
			} finally {
				setIsDeleting(false);
			}
			};
	return (
		<div style={{ display: "flex", background: "#F2F4F7", minHeight: "100vh" }}>
			<Sidebar />

			<div style={{ flex: 1, marginLeft: "240px" }}>
				<Header
					title="Branch Product Management"
					role="Branch Admin"
					email="branchadmin@gmail.com"
					showAddUserIcon
				/>

				<div
					style={{
						padding: "22px 20px",
						marginTop: "20px",
						minHeight: "calc(100vh - 70px)",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "28px",
						}}
					>
						<h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#0F172A" }}>
							Branch Product Management
						</h1>

						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

					<div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
						<button
							onClick={() => setActiveTab("made_to_order")}
							style={{
								padding: "10px 20px",
								borderRadius: "20px",
								border: "none",
								fontWeight: "600",
								cursor: "pointer",
								background: activeTab === "made_to_order" ? "#0E6DCF" : "#fff",
								color: activeTab === "made_to_order" ? "#fff" : "#4B5563",
								boxShadow: activeTab === "made_to_order" ? "0 4px 6px rgba(14, 109, 207, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)"
							}}
						>
							Made to Order
						</button>
						<button
							onClick={() => setActiveTab("pre_made")}
							style={{
								padding: "10px 20px",
								borderRadius: "20px",
								border: "none",
								fontWeight: "600",
								cursor: "pointer",
								background: activeTab === "pre_made" ? "#0E6DCF" : "#fff",
								color: activeTab === "pre_made" ? "#fff" : "#4B5563",
								boxShadow: activeTab === "pre_made" ? "0 4px 6px rgba(14, 109, 207, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)"
							}}
						>
							Pre-made
						</button>
						<button
							onClick={() => setActiveTab("finished")}
							style={{
								padding: "10px 20px",
								borderRadius: "20px",
								border: "none",
								fontWeight: "600",
								cursor: "pointer",
								background: activeTab === "finished" ? "#0E6DCF" : "#fff",
								color: activeTab === "finished" ? "#fff" : "#4B5563",
								boxShadow: activeTab === "finished" ? "0 4px 6px rgba(14, 109, 207, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)"
							}}
						>
							External Products
						</button>
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

				<ProductItemsTable
		products={paginatedProducts}
		onDecreaseStock={null}
		onIncreaseStock={null}
		onAddStock={activeTab !== "made_to_order" ? (item) => setStockModalItem(item) : null}
		hideStockColumn={activeTab === "made_to_order"}
		updatingStockId={updatingStockId}
		showActions={true}
		onDeleteProduct={handleDeleteClick}
		onFetchIngredients={getBranchProductIngredientStatus}
		onEditProduct={null}
		currentPage={currentPage}
		totalPages={totalPages}
		totalItems={tableProducts.length}
		pageStart={pageStart}
		pageEnd={pageEnd}
		onPageChange={setCurrentPage}
		/>
				</div>
			</div>

      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            width: "min(92vw, 430px)",
            background: "#EBEBEB",
            borderRadius: "22px",
            padding: "32px 20px",
            textAlign: "center",
          }}>
            <div style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              background: "#EF4444",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontSize: "28px" }}>🗑️</span>
            </div>

            <h2 style={{
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: "700",
              color: "#111",
            }}>
              Remove Product?
            </h2>

            <p style={{
              margin: "0 0 8px",
              fontSize: "14px",
              color: "#555",
            }}>
              Are you sure you want to remove
            </p>

            <p style={{
              margin: "0 0 8px",
              fontSize: "16px",
              fontWeight: "700",
              color: "#111",
            }}>
              "{deleteTargetName}"
            </p>

            <p style={{
              margin: "0 0 24px",
              fontSize: "13px",
              color: "#888",
            }}>
              This will remove the product from
              your branch only. It will still
              exist in the admin panel and
              other branches.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTargetId(null);
                  setDeleteTargetName("");
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  height: "48px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  background: "#fff",
                  color: "#333",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  height: "48px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#EF4444",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stockModalItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            width: "min(92vw, 400px)",
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
              Add Stock for {stockModalItem.name}
            </h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", color: "#4B5563", marginBottom: "8px" }}>
                Quantity to Add
              </label>
              <input
                type="number"
                min="1"
                value={stockModalQty}
                onChange={(e) => setStockModalQty(e.target.value)}
                placeholder="Enter quantity"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  outline: "none",
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setStockModalItem(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: "#374151"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddStock}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#0E6DCF",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: "#fff"
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
