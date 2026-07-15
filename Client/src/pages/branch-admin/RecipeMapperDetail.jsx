import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import {
  getBranchProducts,
  getBranches,
  getCategories,
  getProducts,
  getRawMaterials,
  getRecipesByProduct,
  createRecipeBulk,
  deleteRecipeByProduct,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

const resolveProductImage = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};

const RecipeMapperDetail = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recipeItems, setRecipeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRawMaterial, setSelectedRawMaterial] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [quantityRequired, setQuantityRequired] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [notice, setNotice] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        setNotice("");

        const [categoryList, branchList, materials] = await Promise.all([
          getCategories(),
          getBranches(),
          getRawMaterials(),
        ]);

        const branch =
          branchList?.find((item) => String(item.U_id) === String(user?.u_id)) ||
          branchList?.[0];

        if (branch) setBranchId(branch.B_id);

        let branchProducts = branch?.B_id
          ? await getBranchProducts(branch.B_id)
          : [];

        if (!Array.isArray(branchProducts) || branchProducts.length === 0) {
          branchProducts = await getProducts();
        }

        const foundProduct = (Array.isArray(branchProducts) ? branchProducts : []).find(
          (item) => String(item?.pro_id) === String(productId)
        );

        const recipeResponse = await getRecipesByProduct(productId);
        const ingredients = Array.isArray(recipeResponse?.ingredients)
          ? recipeResponse.ingredients
          : Array.isArray(recipeResponse)
            ? recipeResponse
            : [];

        if (!isMounted) return;

        setCategories(Array.isArray(categoryList) ? categoryList : []);
        setRawMaterials(Array.isArray(materials) ? materials : []);
        setProduct(foundProduct || null);
        setRecipeItems(ingredients);
      } catch (err) {
        if (!isMounted) return;
        if (err?.response?.status === 404) {
          setRecipeItems([]);
        } else {
          setError(err?.response?.data?.message || "Failed to load recipe details");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (productId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [productId, user?.u_id]);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(String(cat.cat_id), cat.cat_name);
    });
    return map;
  }, [categories]);

  const selectedMaterial = rawMaterials.find(
    (material) => String(material.rm_id) === String(selectedRawMaterial)
  );

  const unitOptions = useMemo(() => {
    const units = new Set(["kg", "g", "l", "ml"]);
    rawMaterials.forEach((material) => {
      if (material?.unit) units.add(material.unit);
    });
    return Array.from(units);
  }, [rawMaterials]);

  useEffect(() => {
    if (!selectedRawMaterial) {
      setSelectedUnit("");
      return;
    }
    setSelectedUnit(selectedMaterial?.unit || "");
  }, [selectedRawMaterial, selectedMaterial?.unit]);

  const handleAddIngredient = async () => {
    if (!selectedRawMaterial || !quantityRequired || !selectedUnit) {
      setError("Select a raw material, quantity, and unit.");
      return;
    }

    const quantity = Number(quantityRequired);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }

    const exists = recipeItems.some(
      (item) => String(item.rawmaterial_id) === String(selectedRawMaterial)
    );
    if (exists) {
      setError("This raw material is already in the recipe.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const nextItem = {
        recipe_id: `temp-${Date.now()}`,
        rawmaterial_id: Number(selectedRawMaterial),
        quantity_req: quantity,
        rm_name: selectedMaterial?.rm_name,
        rm_unit: selectedUnit || selectedMaterial?.unit,
      };

      setRecipeItems((prev) => [...prev, nextItem]);
      setSelectedRawMaterial("");
      setSelectedUnit("");
      setQuantityRequired("");
      setSelectedUnit("");
    } catch (err) {
      setError(err?.message || "Failed to add ingredient");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveIngredient = (recipeId) => {
    setError("");
    setRecipeItems((prev) => prev.filter((item) => item.recipe_id !== recipeId));
  };

  const handleSaveMapping = async () => {
    try {
      setSavingMapping(true);
      setError("");
      setNotice("");

      await deleteRecipeByProduct(productId);

      if (recipeItems.length === 0) {
        setNotice("Recipe cleared.");
        return;
      }

      const payload = {
        pro_id: Number(productId),
        b_id: Number(branchId),
        ingredients: recipeItems.map((item) => ({
          rawmaterial_id: Number(item.rawmaterial_id),
          quantity_req: Number(item.quantity_req),
          unit: item.rm_unit || null,
        })),
      };

      await createRecipeBulk(payload);

const refreshed = await getRecipesByProduct(productId);
const ingredients = Array.isArray(refreshed?.ingredients)
  ? refreshed.ingredients
  : Array.isArray(refreshed)
    ? refreshed
    : [];
setRecipeItems(ingredients);
setShowSuccessPopup(true); // ← show popup instead ✅
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save ingredients mapping");
    } finally {
      setSavingMapping(false);
    }
  };

  const heroImage = resolveProductImage(product?.pro_image);
  const categoryLabel = categoryMap.get(String(product?.cat_id)) || "Main Course";
  const description = product?.pro_des || "Popular savory dish, featuring a cooked seasoned ground meat patty served inside a sliced bun";

  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: 240, minHeight: "100vh", background: "#F6F7FB" }}>
        <Header title="Recipe Mapper" showAddUserIcon={false} />

        <div style={{ padding: "20px 30px 40px" }}>
          <button
            type="button"
            onClick={() => navigate("/branch-admin/recipe-mapper")}
            style={{
              border: "none",
              background: "transparent",
              color: "#667085",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              marginBottom: "14px",
            }}
          >
            <span style={{ fontSize: "18px" }}>{"<"}</span> Back to Menu
          </button>

          <div
            style={{
              borderRadius: "18px",
              overflow: "hidden",
              position: "relative",
              background: heroImage ? "#111827" : "linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)",
              minHeight: "190px",
              marginBottom: "22px",
            }}
          >
            {heroImage && (
              <img
                src={heroImage}
                alt={product?.pro_name || "Recipe"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.25) 60%)",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div style={{ padding: "24px", color: "#fff", maxWidth: "520px" }}>
                <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
                  {product?.pro_name || "Recipe"}
                </h2>
                <p style={{ margin: "6px 0 12px", fontSize: "13px", opacity: 0.9 }}>
                  {description}
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span
                    style={{
                      background: "#fff",
                      color: "#111827",
                      padding: "4px 10px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {categoryLabel}
                  </span>
                  <span
                    style={{
                      background: "rgba(15, 23, 42, 0.75)",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: "10px",
                      fontSize: "11px",
                    }}
                  >
                    15m
                  </span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#FEE4E2",
                color: "#B42318",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "18px",
              }}
            >
              {error}
            </div>
          )}

          

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 1fr) minmax(260px, 0.7fr)",
              gap: "24px",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "18px",
                padding: "20px",
                border: "1px solid #E4E7EC",
                boxShadow: "0 10px 18px rgba(15, 23, 42, 0.05)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", color: "#101828" }}>Add new ingredients</h3>
              <p style={{ margin: "6px 0 16px", fontSize: "13px", color: "#667085" }}>
                Enter the raw ingredients needed for this dish
              </p>

              <label style={labelStyle}>Ingredient Name</label>
              <select
                value={selectedRawMaterial}
                onChange={(event) => {
                  const val = event.target.value;
                  setSelectedRawMaterial(val);
                  const mat = rawMaterials.find((m) => String(m.rm_id) === String(val));
                  setSelectedUnit(mat ? (mat.unit || "") : "");
                }}
                style={inputStyle}
              >
                <option value="">e.g., Fresh Tomatoes</option>
                {rawMaterials.map((material) => (
                  <option key={material.rm_id} value={material.rm_id}>
                    {material.rm_name}
                  </option>
                ))}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={quantityRequired}
                    onChange={(event) => setQuantityRequired(event.target.value)}
                    placeholder="200"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Unit</label>
                  <select
                    value={selectedUnit}
                    onChange={(event) => setSelectedUnit(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select unit</option>
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={saving || loading}
                style={{
                  width: "100%",
                  marginTop: "18px",
                  background: "#0B5ED7",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "+  Add new ingredient"}
              </button>
            </div>

            <div
              style={{
                background: "#fff",
                borderRadius: "18px",
                padding: "20px",
                border: "1px solid #E4E7EC",
                boxShadow: "0 10px 18px rgba(15, 23, 42, 0.05)",
                alignSelf: "start",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", color: "#101828" }}>Ingredients List</h3>

              <div style={{ marginTop: "14px", display: "grid", gap: "12px" }}>
                {loading ? (
                  <div style={{ color: "#667085", fontSize: "13px" }}>Loading ingredients...</div>
                ) : recipeItems.length === 0 ? (
                  <div style={{ color: "#667085", fontSize: "13px" }}>No ingredients yet.</div>
                ) : (
                  recipeItems.map((item) => (
                    <div
                      key={item.recipe_id}
                      style={{
                        border: "1px solid #E4E7EC",
                        padding: "10px 12px",
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#344054", fontSize: "13px" }}>
                        {item.rm_name || `Raw material ${item.rawmaterial_id}`} {item.quantity_req} {item.rm_unit || ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(item.recipe_id)}
                        style={{
                          border: "none",
                          background: "#FFE4E6",
                          color: "#B42318",
                          width: "26px",
                          height: "26px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <button
              type="button"
              onClick={handleSaveMapping}
              disabled={savingMapping || loading}
              style={{
                background: "#4CAF50",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                opacity: savingMapping ? 0.7 : 1,
              }}
            >
              {savingMapping ? "Saving..." : "Save ingredients mapping"}
            </button>
          </div>
        </div>
      </div>
    {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "min(92vw, 430px)",
              background: "#EBEBEB",
              borderRadius: "22px",
              padding: "32px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "50%",
                background: "#0E5BA8",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: "28px" }}>✓</span>
            </div>

            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "18px",
                lineHeight: 1.4,
                fontWeight: "600",
                color: "#0E5BA8",
              }}
            >
              Ingredients mapping
              <br />
              saved Successfully!
            </h2>

            <button
              onClick={() => setShowSuccessPopup(false)}
              style={{
                width: "100%",
                height: "52px",
                border: "none",
                borderRadius: "12px",
                background: "#0E5BA8",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#344054",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #D0D5DD",
  padding: "0 12px",
  fontSize: "13px",
  color: "#101828",
  background: "#fff",
  boxSizing: "border-box",
};

export default RecipeMapperDetail;
