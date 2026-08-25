import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import { useAuth } from "../../context/AuthContext";
import { getBranchProducts, getBranches, getCategories, getProducts, getRecipes } from "../../services/api";
const PAGE_SIZE = 6;
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");
const resolveProductImage = value => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};
const RecipeMapper = () => {
  const { t } = useTranslation();
const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipeCounts, setRecipeCounts] = useState({});
  const [hasCategoryFilter, setHasCategoryFilter] = useState(true);
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const [categoryList, branchList, recipeList] = await Promise.all([getCategories(), getBranches(), getRecipes()]);
        const branch = branchList?.find(item => String(item.U_id) === String(user?.u_id)) || branchList?.[0];
        let branchProducts = branch?.B_id ? await getBranchProducts(branch.B_id) : [];
        if (!Array.isArray(branchProducts) || branchProducts.length === 0) {
          branchProducts = await getProducts();
        }
        if (!isMounted) return;
        setCategories(Array.isArray(categoryList) ? categoryList : []);
        const list = Array.isArray(branchProducts) ? branchProducts : [];
        setProducts(list);
        setHasCategoryFilter(list.some(item => item?.cat_id !== undefined && item?.cat_id !== null));
        setRecipeCounts(buildRecipeCount(recipeList));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.message || "Failed to load recipe list");
        setProducts([]);
        setCategories([]);
        setRecipeCounts({});
        setHasCategoryFilter(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.u_id]);
  const buildRecipeCount = recipeList => {
    const counts = {};
    (Array.isArray(recipeList) ? recipeList : []).forEach(item => {
      const key = String(item?.pro_id);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  };
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(cat => {
      map.set(String(cat.cat_id), cat.cat_name);
    });
    return map;
  }, [categories]);
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter(item => {
      if (item?.product_type === "finished") return false;
      const name = String(item?.pro_name || "").toLowerCase();
      const description = String(item?.pro_des || "").toLowerCase();
      const matchesQuery = !query || name.includes(query) || description.includes(query);
      const matchesCategory = !hasCategoryFilter || selectedCategory === "all" || String(item?.cat_id) === String(selectedCategory);
      return matchesQuery && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, hasCategoryFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);
  const baseCard = {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #E7EAF3",
    boxShadow: "0 8px 24px rgba(16, 24, 40, 0.06)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  };
  return <>
      <Sidebar />
      <div style={{
      marginLeft: 240,
      minHeight: "100vh",
      background: "#F6F7FB"
    }}>
        <Header title={t("branch_admin.recipe_mapper", "Recipe Mapper")} showAddUserIcon={false} />

        <div style={{
        padding: "26px 30px 40px"
      }}>
          <div style={{
          marginBottom: "22px"
        }}>
            <h2 style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#101828",
            margin: 0
          }}>{t("branch_admin.recipe_mapper", "Recipe Mapper")}</h2>
            <p style={{
            margin: "6px 0 0",
            color: "#667085",
            fontSize: "14px"
          }}>{t("branch_admin.organize_explore_your_recipes", "Organize & explore your recipes")}</p>
          </div>

          <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          marginBottom: "22px",
          flexWrap: "wrap"
        }}>
            <div style={{
            flex: "1 1 480px",
            background: "#fff",
            borderRadius: "14px",
            padding: "12px 16px",
            border: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 18px rgba(15, 23, 42, 0.05)"
          }}>
              <FaSearch color="#98A2B3" />
              <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={t("branch_admin.search_products_by_name_or_description", "Search products by name or description...")} style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "14px",
              color: "#111827"
            }} />
            </div>

            <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)} disabled={!hasCategoryFilter} style={{
            flex: "0 0 200px",
            height: "48px",
            borderRadius: "14px",
            border: "1px solid #E5E7EB",
            background: "#fff",
            padding: "0 14px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#475467",
            boxShadow: "0 10px 18px rgba(15, 23, 42, 0.05)",
            opacity: hasCategoryFilter ? 1 : 0.6
          }}>
              <option value="all">{t("branch_admin.all_categories", "All Categories")}</option>
              {categories.map(cat => <option key={cat.cat_id} value={cat.cat_id}>
                  {cat.cat_name}
                </option>)}
            </select>
          </div>

          {error && <div style={{
          background: "#FEE4E2",
          color: "#B42318",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "13px",
          marginBottom: "18px"
        }}>
              {error}
            </div>}

          <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "20px"
        }}>
            {loading ? [...Array(6)].map((_, idx) => <div key={idx} style={baseCard}>
                  <div style={{
              height: "140px",
              background: "#EEF2F6",
              borderBottom: "1px solid #E7EAF3"
            }} />
                  <div style={{
              padding: "16px"
            }}>
                    <div style={{
                height: "14px",
                background: "#E5E7EB",
                width: "60%",
                borderRadius: "6px"
              }} />
                    <div style={{
                height: "12px",
                background: "#EEF2F6",
                width: "40%",
                borderRadius: "6px",
                marginTop: "10px"
              }} />
                    <div style={{
                height: "36px",
                background: "#E5E7EB",
                width: "100%",
                borderRadius: "10px",
                marginTop: "14px"
              }} />
                  </div>
                </div>) : pageItems.map(item => {
            const categoryName = categoryMap.get(String(item?.cat_id)) || "Main Course";
            const priceValue = Number(item?.pro_price ?? 0);
            const imageSrc = resolveProductImage(item?.pro_image);
            const recipeCount = recipeCounts[String(item?.pro_id)] || 0;
            return <div key={item?.Bpro_id || item?.pro_id} style={baseCard}>
                    <div style={{
                position: "relative"
              }}>
                      {imageSrc ? <img src={imageSrc} alt={item?.pro_name || "Product"} style={{
                  width: "100%",
                  height: "140px",
                  objectFit: "cover"
                }} /> : <div style={{
                  height: "140px",
                  background: "linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 600
                }}>{t("branch_admin.no_image", "No Image")}</div>}

                      <span style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  background: "#fff",
                  color: "#1D4ED8",
                  padding: "3px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase"
                }}>
                        {categoryName}
                      </span>

                      <span style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px"
                }}>{t("branch_admin.15m", "15m")}</span>

                      <span style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  background: recipeCount > 0 ? "rgba(17, 94, 89, 0.85)" : "rgba(71, 84, 103, 0.7)",
                  color: "#fff",
                  padding: "3px 8px",
                  borderRadius: "10px",
                  fontSize: "11px"
                }}>
                        {recipeCount > 0 ? `${recipeCount} ingredients` : "No recipe"}
                      </span>
                    </div>

                    <div style={{
                padding: "16px"
              }}>
                      <h3 style={{
                  margin: 0,
                  fontSize: "16px",
                  color: "#101828"
                }}>
                        {item?.pro_name || "Unnamed Product"}
                      </h3>
                      <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "12px"
                }}>
                        <span style={{
                    color: "#12B76A",
                    fontWeight: 700
                  }}>
                          ${priceValue.toFixed(2)}
                        </span>
                        <button type="button" onClick={() => navigate(`/branch-admin/recipe-mapper/${item?.pro_id}`)} style={{
                    background: "#0B5ED7",
                    color: "#fff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}>{t("branch_admin.map_ingredients", "Map Ingredients")}</button>
                      </div>
                    </div>
                  </div>;
          })}
          </div>

          {!loading && filteredProducts.length === 0 && <div style={{
          marginTop: "28px",
          padding: "30px",
          borderRadius: "16px",
          border: "1px dashed #CBD5E1",
          textAlign: "center",
          color: "#64748B",
          background: "#fff"
        }}>{t("branch_admin.no_recipes_match_your_search", "No recipes match your search.")}</div>}

          {!loading && filteredProducts.length > 0 && <div style={{
          marginTop: "26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "8px",
          color: "#1D4ED8"
        }}>
              <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} style={paginationButton(false, currentPage === 1)}>
                <span style={{
              marginRight: "4px"
            }}>&lt;</span>{t("branch_admin.previous", "Previous")}</button>
              {Array.from({
            length: totalPages
          }).map((_, idx) => {
            const page = idx + 1;
            const isActive = page === currentPage;
            return <button key={page} type="button" onClick={() => setCurrentPage(page)} style={paginationButton(isActive)}>
                    {page}
                  </button>;
          })}
              <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} style={paginationButton(false, currentPage === totalPages)}>{t("branch_admin.next", "Next")}<span style={{
              marginLeft: "4px"
            }}>&gt;</span>
              </button>
            </div>}
        </div>
      </div>

    </>;
};
const paginationButton = (active, disabled = false) => ({
  padding: "6px 12px",
  borderRadius: "8px",
  border: "1px solid #D0D5DD",
  background: active ? "#1D4ED8" : "#fff",
  color: active ? "#fff" : "#1D4ED8",
  fontSize: "12px",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1
});
export default RecipeMapper;