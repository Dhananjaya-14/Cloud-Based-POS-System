import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBed,
  FaCalculator,
  FaCoffee,
  FaDesktop,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaStore,
  FaTrashAlt,
  FaUtensils,
  FaUserCircle,
  FaWineGlassAlt,
  FaBell,
  FaSpinner,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import posIcon from "../../assets/images/PosIcon.png";
import {
  createOrder,
  createOrderItem,
  getBranchById,
  getBranchProducts,
  getOrders,
  getOrderItemsByOrderId,
  updateOrderStatus,
  updateOrder,
  deleteOrderItem,
  initiatePayHerePayment,
  checkOrderStock,
} from "../../services/api";
import {
  connectSocket,
  getSocket,
  SOCKET_EVENTS,
  joinBranchInventoryRoom,
  leaveBranchInventoryRoom,
  subscribeToBranchProductUpdates
} from "../../services/socket";
import PayHereQRModal from "../../components/cashier/PayHereQRModal";
import OrderReadyAlerts from "../../components/cashier/OrderReadyAlerts";
import {
  addOrderReadyAlert,
  addOrderRejectedAlert,
  dismissOrderReadyAlert,
  loadOrderReadyAlerts,
  saveOrderReadyAlerts,
} from "../../utils/orderReadyAlerts";

const categories = [
  { label: "All Items", icon: FaStore, active: true },
  { label: "Bar", icon: FaWineGlassAlt },
  { label: "Restaurant", icon: FaUtensils },
  { label: "Room Service", icon: FaBed },
  { label: "Front Desk", icon: FaDesktop },
];

const CashierPos = () => {
  const navigate = useNavigate();
  const { user, logout, features } = useAuth();
  const inventoryEnabled = features?.has_inventory === true;
  const waiterEnabled = features?.has_waiter === true;
  const [branchName, setBranchName] = useState("Loading branch...");
  const [branchId, setBranchId] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stockErrorModal, setStockErrorModal] = useState(null); // { shortages: [...] } or null
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [orderType, setOrderType] = useState("takeaway");
  const [allergies, setAllergies] = useState("");
  const [addons, setAddons] = useState("");
  const [addonsPrice, setAddonsPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [showNewProductToast, setShowNewProductToast] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderStatus, setEditingOrderStatus] = useState(null);
  const [editingOrderTableId, setEditingOrderTableId] = useState(null);

  const [waiterOrders, setWaiterOrders] = useState([]);
  const [showWaiterOrdersModal, setShowWaiterOrdersModal] = useState(false);
  const [loadingWaiterOrders, setLoadingWaiterOrders] = useState(false);
  const [orderReadyAlerts, setOrderReadyAlerts] = useState([]);

  // State for product notifications (persistent)
  const [productNotifications, setProductNotifications] = useState(() => {
    const userId = user?.u_id;
    if (!userId) return [];

    const savedNotifications = sessionStorage.getItem(`productNotifications_${userId}`);
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        const now = new Date();
        const validNotifications = parsed.filter(notif => {
          const timestamp = new Date(notif.timestamp);
          const diffMinutes = (now - timestamp) / (1000 * 60);
          return diffMinutes < 60; 
        });
        if (validNotifications.length > 0) {
          return validNotifications;
        } else {
          sessionStorage.removeItem(`productNotifications_${userId}`);
          return [];
        }
      } catch (e) {
        sessionStorage.removeItem(`productNotifications_${userId}`);
        return [];
      }
    }
    return [];
  });

  // PayHere QR payment state
  const [payhereModal, setPayhereModal] = useState(null); 

  // Save product notifications to sessionStorage
  useEffect(() => {
    const userId = user?.u_id;
    if (!userId) return;

    if (productNotifications.length > 0) {
      sessionStorage.setItem(`productNotifications_${userId}`, JSON.stringify(productNotifications));
    } else {
      sessionStorage.removeItem(`productNotifications_${userId}`);
    }
  }, [productNotifications, user?.u_id]);

  // Dismiss a specific product notification
  const dismissProductNotification = (notificationId) => {
    setProductNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const fetchWaiterOrders = async () => {
    try {
      setLoadingWaiterOrders(true);
      const allOrders = await getOrders(branchId ? { b_id: branchId } : {});
      const activeDineIn = allOrders.filter(
        (o) =>
          o.or_type === "dine-in" &&
          o.or_status !== "cancelled" &&
          o.pay_status !== "paid" &&
          (!branchId || String(o.b_id) === String(branchId))
      );
      setWaiterOrders(activeDineIn);
    } catch (err) {
      console.error("Failed to fetch waiter orders", err);
    } finally {
      setLoadingWaiterOrders(false);
    }
  };

  const handleOpenWaiterOrders = () => {
    fetchWaiterOrders();
    setShowWaiterOrdersModal(true);
  };

  // Load initial POS data
  const loadPosData = async () => {
    try {
      setLoading(true);
      setError("");

      const branchIdValue = user?.b_id ?? user?.B_id ?? null;

      if (!branchIdValue) {
        setError("No branch is assigned to your account.");
        setLoading(false);
        return;
      }

      const branch = await getBranchById(branchIdValue);
      const name = branch?.B_name ?? branch?.data?.B_name ?? "Selected branch";
      setBranchId(branchIdValue);
      setBranchName(name);

      const branchProductList = await getBranchProducts(branchIdValue);
      setProducts(branchProductList);
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message ||
        loadError.message ||
        "Failed to load POS data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket listeners for real-time product updates
  useEffect(() => {
    if (!branchId) return;

    // Connect socket if not connected
    const socket = getSocket();
    if (!socket.connected) {
      connectSocket();
    }

    // Join branch inventory room
    joinBranchInventoryRoom(branchId);

    // Subscribe to branch product updates
    const unsubscribe = subscribeToBranchProductUpdates(branchId, {
      onBranchProductAdded: (data) => {
        console.log("New branch product received in Cashier POS:", data);

        // Check if this product belongs to the current branch
        if (data.branch_id && String(data.branch_id) !== String(branchId)) {
          return;
        }

        // Get the product data
        const productData = data.branch_product || data.product || data;

        setProducts((prevProducts) => {
          // Check if product already exists by pro_id to prevent duplicates across different event types
          const exists = prevProducts.some(p => p.pro_id === productData.pro_id);
          if (!exists) {
            // Add notification to persistent queue
            const productName = productData.pro_name || "New Product";

            // Show toast notification
            setNewProductName(productName);
            setShowNewProductToast(true);
            setTimeout(() => {
              setShowNewProductToast(false);
            }, 5000);

            setProductNotifications(prev => {
              const existingNotif = prev.find(n =>
                n.productName === productName &&
                (new Date() - new Date(n.timestamp)) < 5000
              );
              if (existingNotif) return prev;

              return [...prev, {
                id: Date.now() + Math.random(),
                type: 'product_added',
                message: `📦 New product added: "${productName}"`,
                timestamp: new Date().toISOString(),
                productName: productName
              }];
            });

            // Add the new product to the list
            return [productData, ...prevProducts];
          } else {
            // If it exists, update it with the real Bpro_id if it was a fake one
            return prevProducts.map(p => 
              p.pro_id === productData.pro_id ? { ...p, ...productData } : p
            );
          }
        });
      },
      onBranchProductUpdated: (data) => {
        console.log("Product update received in Cashier POS:", data);

        const productData = data.branch_product || data.product || data;

        setProducts((prevProducts) => {
          return prevProducts.map(product =>
            product.Bpro_id === productData.Bpro_id
              ? { ...product, ...productData }
              : product
          );
        });
      },
      onBranchProductDeleted: (data) => {
        console.log("Product deletion received in Cashier POS:", data);

        const deletedId = data.Bpro_id || data.branch_product?.Bpro_id;

        setProducts((prevProducts) => {
          return prevProducts.filter(product => product.Bpro_id !== deletedId);
        });

        // Also remove from cart if present
        setCart((prevCart) => {
          return prevCart.filter(item => item.Bpro_id !== deletedId);
        });
      }
    });

    // Also listen for company-level product events as fallback
    const handleCompanyProductAdded = (data) => {
      console.log("Company product added event received:", data);
      if (data.product && !data.branch_id) {
        setProducts((prevProducts) => {
          const exists = prevProducts.some(p => p.pro_id === data.product.pro_id);
          if (!exists) {
            const branchProduct = {
              ...data.product,
              Bpro_id: data.product.pro_id,
              branch_id: branchId,
              pro_quantity: data.product.pro_qty || 0
            };

            // Add notification to persistent queue
            const productName = data.product.pro_name || "New Product";

            // Show toast notification
            setNewProductName(productName);
            setShowNewProductToast(true);
            setTimeout(() => {
              setShowNewProductToast(false);
            }, 5000);

            setProductNotifications(prev => {
              const existingNotif = prev.find(n =>
                n.productName === productName &&
                (new Date() - new Date(n.timestamp)) < 5000
              );
              if (existingNotif) return prev;

              return [...prev, {
                id: Date.now() + Math.random(),
                type: 'product_added',
                message: `📦 New product available: "${productName}"`,
                timestamp: new Date().toISOString(),
                productName: productName
              }];
            });

            return [branchProduct, ...prevProducts];
          }
          return prevProducts;
        });
      }
    };

    const socketInstance = getSocket();
    socketInstance.on(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleCompanyProductAdded);

    return () => {
      unsubscribe();
      if (socketInstance) {
        socketInstance.off(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleCompanyProductAdded);
      }
      leaveBranchInventoryRoom(branchId);
    };
  }, [branchId]);

  useEffect(() => {
    loadPosData();
  }, [user?.b_id, user?.B_id]);

  useEffect(() => {
    if (waiterEnabled) {
      fetchWaiterOrders();
    }
  }, [waiterEnabled, branchId]);

  useEffect(() => {
    if (!user?.u_id) {
      setOrderReadyAlerts([]);
      return;
    }

    setOrderReadyAlerts(loadOrderReadyAlerts(user.u_id));
  }, [user?.u_id]);

  useEffect(() => {
    const socket = connectSocket();

    const handleOrderReady = (order) => {
      if (!order) return;
      if (user?.u_id && order.u_id && Number(order.u_id) !== Number(user.u_id)) {
        return;
      }

      setOrderReadyAlerts((currentAlerts) => {
        const nextAlerts = addOrderReadyAlert(currentAlerts, order);
        saveOrderReadyAlerts(user?.u_id, nextAlerts);
        return nextAlerts;
      });
    };

    const handleOrderRejected = (order) => {
      if (!order) return;
      if (user?.u_id && order.u_id && Number(order.u_id) !== Number(user.u_id)) {
        return;
      }

      setOrderReadyAlerts((currentAlerts) => {
        const nextAlerts = addOrderRejectedAlert(currentAlerts, order);
        saveOrderReadyAlerts(user?.u_id, nextAlerts);
        return nextAlerts;
      });
    };

    socket.on("order:ready", handleOrderReady);
    socket.on("order:rejected", handleOrderRejected);

    return () => {
      socket.off("order:ready", handleOrderReady);
      socket.off("order:rejected", handleOrderRejected);
    };
  }, [user?.u_id]);
  const handleDismissOrderReady = useCallback(
    (orderId) => {
      setOrderReadyAlerts((currentAlerts) => {
        const nextAlerts = dismissOrderReadyAlert(currentAlerts, orderId);
        saveOrderReadyAlerts(user?.u_id, nextAlerts);
        return nextAlerts;
      });
    },
    [user?.u_id],
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.pro_name ?? "").toLowerCase();
      const description = String(product.pro_des ?? "").toLowerCase();
      const shortName = String(product.pro_shortname ?? "").toLowerCase();

      const matchesSearch =
        !term || [name, description, shortName].some((value) => value.includes(term));

      const categoryName = (() => {
        const source = `${name} ${description}`;
        if (
          source.includes("bar") ||
          source.includes("beer") ||
          source.includes("wine") ||
          source.includes("whiskey") ||
          source.includes("cocktail")
        ) {
          return "Bar";
        }
        if (
          source.includes("room") ||
          source.includes("suite") ||
          source.includes("laundry") ||
          source.includes("checkout") ||
          source.includes("parking")
        ) {
          return "Room Service";
        }
        if (
          source.includes("coffee") ||
          source.includes("steak") ||
          source.includes("salad") ||
          source.includes("pasta") ||
          source.includes("sandwich") ||
          source.includes("breakfast") ||
          source.includes("seafood")
        ) {
          return "Restaurant";
        }
        return "Front Desk";
      })();

      const matchesCategory =
        selectedCategory === "All Items" || categoryName === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0),
    [cart],
  );
  const taxRate = 10;
  const discountAmount = subtotal * (Number(discountPct || 0) / 100);
  const taxableBase = subtotal - discountAmount + Number(serviceFee || 0) + Number(addonsPrice || 0);
  const tax = taxableBase * (taxRate / 100);
  const total = taxableBase + tax;

  const addToCart = (product) => {
    const unitPrice = Number(product.pro_price ?? 0);

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.Bpro_id === product.Bpro_id);
      if (existing) {
        return currentCart.map((item) =>
          item.Bpro_id === product.Bpro_id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          Bpro_id: product.Bpro_id,
          pro_name: product.pro_name,
          unitPrice,
          qty: 1,
        },
      ];
    });
  };

  const updateQuantity = (Bpro_id, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.Bpro_id === Bpro_id ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (Bpro_id) => {
    setCart((currentCart) => currentCart.filter((item) => item.Bpro_id !== Bpro_id));
  };

  // ── Build invoice navigation state (shared by Cash/Card and PayHere) ──────
  const buildInvoiceState = (orderId, invoiceItems) => ({
    orderId,
    cashierName: `${user?.u_fname || "Cashier"} ${user?.u_lname || ""}`.trim(),
    branchName,
    branchLabel: `${branchName.split(" ")[0] || branchName}\nBranch`,
    paymentMethod,
    items: invoiceItems,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discountPct || 0),
    serviceFee: Number(serviceFee || 0),
    allergies,
    addons,
    addonsPrice: Number(addonsPrice || 0),
    notes,
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  });

  // Called by PayHereQRModal when payment is confirmed via Socket.IO
  const handlePayHereSuccess = (invoiceState) => {
    setPayhereModal(null);
    setCart([]);
    setEditingOrderId(null);
    navigate("/cashier/invoice-preview", { state: invoiceState });
  };

  const handleCheckout = async () => {
    if (!cart.length || !user?.u_id) {
      return;
    }

    if (!branchId) {
      setError("No branch is assigned to this user.");
      return;
    }
    if (orderType === "dine-in" && features?.has_waiter && !editingOrderId) {
      setError("Dine-in orders require table selection. Please use takeaway for now.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const stockResult = await checkOrderStock(
        cart.map((item) => ({ Bpro_id: item.Bpro_id, pro_quantity: item.qty })),
      );

      if (!stockResult.success) {
        setStockErrorModal({ shortages: stockResult.shortages });
        setSubmitting(false);
        return;
      }

      let orderId = editingOrderId;
      const socket = getSocket();

      if (editingOrderId) {
        // Update existing order
        await updateOrder(editingOrderId, {
          or_tax: taxRate,
          or_totalcost: Number(taxableBase.toFixed(2)),
          or_totalCostWtax: Number(total.toFixed(2)),
          or_status: paymentMethod === "PayHere" ? "pending" : "completed",
          or_type: orderType,
          u_id: user.u_id,
          b_id: branchId,
          or_notes: notes,
          or_addons: addons,
          or_addons_price: Number(addonsPrice || 0),
          or_allergies: allergies,
        });

        // Fetch existing items to delete them
        const existingItems = await getOrderItemsByOrderId(editingOrderId);
        if (existingItems && existingItems.length > 0) {
          await Promise.all(
            existingItems.map((item) => deleteOrderItem(item.orderItem_id))
          );
        }

        // Emit order updated event
        if (socket && socket.connected) {
          socket.emit("order:updated", {
            or_id: editingOrderId,
            b_id: branchId,
            status: "completed"
          });
          console.log("Order updated event emitted:", { orderId: editingOrderId, branchId });
        }
      } else {
        const orderResponse = await createOrder({
          or_tax: taxRate,
          or_totalcost: Number(taxableBase.toFixed(2)),
          or_totalCostWtax: Number(total.toFixed(2)),
          or_status: "pending",
          or_type: orderType,
          u_id: user.u_id,
          b_id: branchId,
          table_id: null,
          or_notes: notes,
          or_addons: addons,
          or_addons_price: Number(addonsPrice || 0),
          or_allergies: allergies,
        });

        orderId = orderResponse?.data?.or_id;
        if (!orderId) {
          throw new Error("Order was created but no order id was returned");
        }

        // Emit order created event for kitchen
        if (socket && socket.connected) {
          socket.emit("order:created", {
            or_id: orderId,
            b_id: branchId,
            or_type: orderType,
            or_status: "pending",
            u_id: user.u_id
          });
          console.log("Order created event emitted to kitchen:", { orderId, branchId });
        }
      }

      await Promise.all(
        cart.map((item) =>
          createOrderItem({
            Bpro_id: item.Bpro_id,
            pro_quantity: item.qty,
            unit_price: item.unitPrice,
            order_id: orderId,
          }),
        ),
      );

      const invoiceItems = cart.map((item) => ({
        Bpro_id: item.Bpro_id,
        pro_name: item.pro_name,
        unitPrice: item.unitPrice,
        qty: item.qty,
        total: Number((item.unitPrice * item.qty).toFixed(2)),
      }));

      // ── PayHere: generate URL and show QR modal ────────────────────────────
      if (paymentMethod === "PayHere") {
        const payhereRes = await initiatePayHerePayment({
          order_id: orderId,
          amount: total.toFixed(2),
          order_description: `Order #${orderId} — ${branchName}`,
          cashier_uid: user.u_id,
        });

        if (!payhereRes?.payment_url) {
          throw new Error("Failed to generate PayHere payment URL");
        }

        // Store invoice state so the QR modal can navigate after confirmation
        setPayhereModal({
          paymentUrl: payhereRes.payment_url,
          orderId,
          invoiceState: buildInvoiceState(orderId, invoiceItems),
        });
        // Don't clear cart yet — wait for payment confirmation
        return;
      }

      // ── Cash / Card: complete immediately ──────────────────────────────────
      setCart([]);
      setEditingOrderId(null);
      setEditingOrderTableId(null);
      navigate("/cashier/invoice-preview", {
        state: buildInvoiceState(orderId, invoiceItems),
      });
    } catch (checkoutError) {
      setError(
        checkoutError?.response?.data?.error ||
        checkoutError?.response?.data?.message ||
        checkoutError.message ||
        "Checkout failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWaiterOrder = async (ao) => {
    try {
      setLoadingWaiterOrders(true);
      const items = await getOrderItemsByOrderId(ao.or_id);

      const newCart = items.map((item) => ({
        Bpro_id: item.Bpro_id,
        pro_name: item.pro_name,
        unitPrice: Number(item.unit_price || item.branch_price || 0),
        qty: Number(item.pro_quantity || 1),
      }));

      setCart(newCart);
      setOrderType(ao.or_type || "takeaway");
      setNotes(ao.or_notes || "");
      setAddons(ao.or_addons || "");
      setAddonsPrice(ao.or_addons_price || "");
      setAllergies(ao.or_allergies || "");
      setEditingOrderId(ao.or_id);
      setEditingOrderStatus(ao.or_status);
      setEditingOrderTableId(ao.table_id || null);
      setShowWaiterOrdersModal(false);
    } catch (err) {
      alert("Failed to load order for editing: " + err.message);
    } finally {
      setLoadingWaiterOrders(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (cart.length === 0 || !editingOrderId) return;
    
    try {
      setSubmitting(true);
      setError("");

      const stockResult = await checkOrderStock(
        cart.map((item) => ({ Bpro_id: item.Bpro_id, pro_quantity: item.qty }))
      );

      if (!stockResult.success) {
        setStockErrorModal({ shortages: stockResult.shortages });
        setSubmitting(false);
        return;
      }

      const orderPayload = {
        table_id: editingOrderTableId,
        or_tax: taxRate,
        or_totalcost: Number(taxableBase.toFixed(2)),
        or_totalCostWtax: Number(total.toFixed(2)),
        or_notes: notes?.trim() || "",
        or_addons: addons?.trim() || "",
        or_allergies: allergies?.trim() || "",
        items: cart.map(item => ({
          Bpro_id: item.Bpro_id,
          qty: item.qty,
          unit_price: item.unitPrice
        }))
      };

      await updateOrder(editingOrderId, orderPayload);
      
      setCart([]);
      setNotes("");
      setAddons("");
      setAllergies("");
      setEditingOrderId(null);
      setEditingOrderTableId(null);
      setSearchTerm("");
      fetchWaiterOrders();
    } catch (err) {
      console.error(err);
      setError("Failed to update order: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const newHeldOrder = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      paymentMethod,
      orderType,
      allergies,
      addons,
      addonsPrice,
      notes,
      discountPct,
      serviceFee
    };
    setHeldOrders((prev) => [...prev, newHeldOrder]);

    // Reset form
    setCart([]);
    setPaymentMethod("Cash");
    setOrderType("takeaway");
    setAllergies("");
    setAddons("");
    setAddonsPrice("");
    setNotes("");
    setDiscountPct(0);
    setServiceFee(0);
  };

  const handleResumeOrder = (holdId) => {
    const orderToResume = heldOrders.find((ho) => ho.id === holdId);
    if (!orderToResume) return;

    if (cart.length > 0) {
      handleHoldOrder();
    }

    setCart(orderToResume.cart);
    setPaymentMethod(orderToResume.paymentMethod);
    setOrderType(orderToResume.orderType);
    setAllergies(orderToResume.allergies || "");
    setAddons(orderToResume.addons || "");
    setAddonsPrice(orderToResume.addonsPrice || "");
    setNotes(orderToResume.notes || "");
    setDiscountPct(orderToResume.discountPct || 0);
    setServiceFee(orderToResume.serviceFee || 0);

    setHeldOrders((prev) => prev.filter((ho) => ho.id !== holdId));
    setShowHeldOrdersModal(false);
  };

  const handleRemoveHeldOrder = (holdId) => {
    setHeldOrders((prev) => prev.filter((ho) => ho.id !== holdId));
  };

  const logoutAndNavigate = () => {
    logout();
  };

  const selectedProductCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Toast notification style
  const toastStyle = {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#0A5BAE',
    color: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 10000,
    fontSize: '16px',
    fontWeight: '500',
    animation: 'slideUp 0.5s ease-out',
    maxWidth: '90%',
  };

  return (
    <div className="min-h-screen bg-[#F3F7FB] text-slate-900">
      <OrderReadyAlerts alerts={orderReadyAlerts} onDismiss={handleDismissOrderReady} />

      {/* Product Notifications Container */}
      {productNotifications.length > 0 && (
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
          className="product-notifications-container"
        >
          {productNotifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                backgroundColor: '#FEF3C7',
                borderLeft: '4px solid #F59E0B',
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
                  📢 New Product Available
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
                onClick={() => dismissProductNotification(notification.id)}
                style={{
                  background: '#F59E0B',
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

      <header className="border-b border-black/5 bg-linear-to-r from-[#094f96] via-[#0c87b1] to-[#50c164] text-white shadow-[0_10px_30px_rgba(2,8,23,0.15)]">
        <div className="mx-auto flex max-w-450 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-white/20">
              <img
                src={posIcon}
                alt="Hotel POS logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div className="leading-tight">
              <div className="text-[17px] font-semibold tracking-wide">Hotel POS</div>
              <div className="text-[13px] text-white/80">Point of Sale System</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setShowHeldOrdersModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <span>Held Orders ({heldOrders.length})</span>
            </button>
            {waiterEnabled && (
              <button
                onClick={handleOpenWaiterOrders}
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <span>Waiter Orders ({waiterOrders.length})</span>
              </button>
            )}
            <button
              onClick={() => navigate("/cashier/pos")}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0A5BAE] shadow-sm transition hover:-translate-y-px"
            >
              <FaShoppingCart className="h-3.5 w-3.5" />
              POS
            </button>
            <button
              onClick={() => navigate("/cashier/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <span className="text-base">▦</span>
              Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/15 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0A5BAE]">
                <FaUserCircle className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-semibold leading-none">
                  {user?.u_fname || "Cashier"} {user?.u_lname || ""}
                </div>
                <div className="mt-0.5 text-[11px] text-white/80">{branchName}</div>
              </div>
            </div>

            <button
              onClick={logoutAndNavigate}
              className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
            >
              <FaSignOutAlt className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-380 px-3 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">Point of Sale</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">⌖</span>
            <span>{branchName}</span>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
          <section className="space-y-5">
            <div className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 sm:p-5">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or description..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map(({ label, icon: Icon, active }) => (
                  <button
                    key={label}
                    onClick={() => setSelectedCategory(label)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${active && selectedCategory === label
                      ? "border-sky-500 bg-linear-to-r from-[#0A5BAE] to-[#19A4E5] text-white shadow-md shadow-sky-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {loading ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Loading products ...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No products match your search.
                </div>
              ) : (
                filteredProducts.map((product, index) => {
                  const Icon = (() => {
                    const source = `${product.pro_name ?? ""} ${product.pro_des ?? ""}`.toLowerCase();
                    if (source.includes("coffee")) return FaCoffee;
                    if (
                      source.includes("beer") ||
                      source.includes("wine") ||
                      source.includes("whiskey") ||
                      source.includes("cocktail")
                    ) {
                      return FaWineGlassAlt;
                    }
                    if (
                      source.includes("suite") ||
                      source.includes("laundry") ||
                      source.includes("parking") ||
                      source.includes("checkout") ||
                      source.includes("desk")
                    ) {
                      return FaDesktop;
                    }
                    if (
                      source.includes("breakfast") ||
                      source.includes("steak") ||
                      source.includes("salad") ||
                      source.includes("pasta") ||
                      source.includes("sandwich") ||
                      source.includes("seafood")
                    ) {
                      return FaUtensils;
                    }
                    return FaCalculator;
                  })();
                  // made_to_order products are always billable (no stock limit)
                  const isMadeToOrder = product.product_type === "made_to_order";
                  const ignoreStock = isMadeToOrder;
                  const stockCount = Number(product.pro_quantity ?? 0);
                  const isOutOfStock = !ignoreStock && stockCount <= 0;
                  const priceLabel = Number(product.pro_price ?? 0).toFixed(2);

                  return (
                    <article
                      key={product.Bpro_id ?? index}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`group rounded-2xl border p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition ${
                        isOutOfStock
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50"
                          : "cursor-pointer border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-14 w-full items-center justify-center rounded-xl bg-sky-50 text-[#0A5BAE]">
                          <Icon className="h-7 w-7" />
                        </div>
                        {!(ignoreStock) && (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 text-[11px] font-semibold text-white shadow-sm">
                          {stockCount}
                        </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-slate-900">{product.pro_name}</h3>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {isOutOfStock ? "Out of stock" : (ignoreStock ? "Available now" : "Available now")}
                      </p>
                      <div className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                        ${priceLabel}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="rounded-3xl w-[370px] h-fit bg-white shadow-[0_10px_30px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
            <div className="rounded-t-3xl bg-linear-to-r from-[#0A5BAE] to-[#19A4E5] px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <FaShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Shopping Cart</h2>
                    <p className="text-xs text-white/80">
                      {selectedProductCount} item{selectedProductCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCart([])}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                >
                  <FaTrashAlt className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Add products from the left panel to build the order.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.Bpro_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{item.pro_name}</h3>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.Bpro_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-100"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.Bpro_id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                        >
                          <FaMinus className="h-3 w-3" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">{item.qty}</span>
                        <button
                          onClick={() => updateQuantity(item.Bpro_id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                        >
                          <FaPlus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-lg font-semibold tracking-tight text-slate-900">
                        ${(item.unitPrice * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="grid gap-2">
                  <input
                    aria-label="allergies"
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Allergies / Dietary (e.g., Nuts, Gluten)"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                  />

                  <div className="flex gap-2">
                    <input
                      aria-label="addons"
                      type="text"
                      value={addons}
                      onChange={(e) => setAddons(e.target.value)}
                      placeholder="Add Ons (e.g., Extra cheese)"
                      className="h-9 w-2/3 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                    />
                    <input
                      aria-label="addons price"
                      type="number"
                      value={addonsPrice}
                      onChange={(e) => setAddonsPrice(e.target.value)}
                      placeholder="Price"
                      className="h-9 w-1/3 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                    />
                  </div>

                  <input
                    aria-label="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (special requests)"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Tax (10%)</span>
                  <span className="font-semibold text-slate-900">${tax.toFixed(2)}</span>
                </div>
                <div className="my-4 h-px bg-slate-200" />
                <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span className="text-2xl tracking-tight">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Order Type</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("takeaway")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${orderType === "takeaway"
                      ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                      : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                  >
                    Takeaway
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("dine-in")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${orderType === "dine-in"
                      ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                      : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                  >
                    Dine-in
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Payment Method</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium shadow-sm transition ${paymentMethod === "Cash"
                      ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                      : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${paymentMethod === "Cash" ? "bg-[#00B67A]" : "bg-slate-300"}`}
                    />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Card")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium shadow-sm transition ${paymentMethod === "Card"
                      ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                      : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${paymentMethod === "Card" ? "bg-[#00B67A]" : "bg-slate-300"}`}
                    />
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("PayHere")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium shadow-sm transition ${paymentMethod === "PayHere"
                      ? "border-[#0E6DCF] bg-white text-[#0E6DCF] ring-2 ring-blue-100"
                      : "border-blue-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${paymentMethod === "PayHere" ? "bg-[#0E6DCF]" : "bg-slate-300"}`}
                    />
                    <span className="font-bold">
                      pay<span className={paymentMethod === "PayHere" ? "text-yellow-400" : "text-slate-400"}>here</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleHoldOrder}
                    disabled={submitting || cart.length === 0}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#0A5BAE] bg-white px-5 py-4 text-sm font-semibold text-[#0A5BAE] shadow-sm transition hover:bg-[#0A5BAE] hover:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                  >
                    Hold Order
                  </button>

                  <button
                    onClick={handleCheckout}
                    disabled={submitting || cart.length === 0 || !branchId}
                    className="inline-flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#55C24A] px-5 py-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(85,194,74,0.28)] transition hover:bg-[#49b03f] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    <FaShoppingCart className="h-4 w-4" />
                    {submitting ? "Processing..." : "Checkout"}
                  </button>
                </div>
                {editingOrderId && editingOrderStatus !== 'completed' && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleUpdateOrder}
                      disabled={submitting || cart.length === 0}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0A5BAE] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#08498d] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Update Order
                    </button>
                    <button
                      onClick={() => {
                         setEditingOrderId(null);
                         setEditingOrderStatus(null);
                         setEditingOrderTableId(null);
                         setCart([]);
                         setNotes("");
                         setAddons("");
                         setAllergies("");
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-300"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Held Orders Modal */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800">Held Orders ({heldOrders.length})</h2>
              <button
                onClick={() => setShowHeldOrdersModal(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {heldOrders.length === 0 ? (
                <div className="text-center py-6 text-slate-500">No held orders available.</div>
              ) : (
                heldOrders.map((ho) => (
                  <div key={ho.id} className="flex justify-between items-center rounded-xl border p-4 hover:shadow-md transition">
                    <div>
                      <div className="font-semibold text-slate-800">Order at {ho.timestamp}</div>
                      <div className="text-sm text-slate-500">
                        {ho.cart.length} items • {ho.orderType} • {ho.paymentMethod}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemoveHeldOrder(ho.id)}
                        className="rounded-lg bg-red-50 text-red-500 px-3 py-2 text-sm font-medium hover:bg-red-100"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => handleResumeOrder(ho.id)}
                        className="rounded-lg bg-[#0A5BAE] text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiter Orders Modal */}
      {waiterEnabled && showWaiterOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800">Waiter Orders ({waiterOrders.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchWaiterOrders}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowWaiterOrdersModal(false)}
                  className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {loadingWaiterOrders ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-60">
                  <FaSpinner className="h-10 w-10 animate-spin text-[#0A5BAE] mb-4" />
                  <p className="text-sm font-bold text-slate-500">Loading orders...</p>
                </div>
              ) : waiterOrders.length === 0 ? (
                <div className="text-center py-6 text-slate-500">No waiter orders available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {waiterOrders.map((ao) => (
                    <div key={ao.or_id} className="flex flex-col justify-between rounded-xl border p-4 shadow-sm hover:shadow-md transition">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-slate-800 text-lg">Order #{ao.or_id}</div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${ao.or_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            ao.or_status === 'sent_to_kitchen' ? 'bg-orange-100 text-orange-700' :
                              ao.or_status === 'sent_to_bar' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {ao.or_status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 space-y-1">
                          <p><strong>Table:</strong> {ao.table_id || 'Takeaway'}</p>
                          <p><strong>Type:</strong> {ao.or_type}</p>
                          <p><strong>Total:</strong> ${Number(ao.or_totalCostWtax || ao.or_totalcost || 0).toFixed(2)}</p>
                          {ao.or_notes && <p className="text-xs italic mt-2 text-red-500 line-clamp-2">{ao.or_notes}</p>}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                        <button
                          onClick={() => handleEditWaiterOrder(ao)}
                          disabled={loadingWaiterOrders}
                          className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            ao.or_status === 'completed' 
                              ? 'bg-[#55C24A] text-white hover:bg-[#49b03f]' 
                              : 'border border-[#0A5BAE] text-[#0A5BAE] hover:bg-[#0A5BAE] hover:text-white'
                          }`}
                        >
                          {ao.or_status === 'completed' ? 'Bill Order' : 'Edit Order'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Stock Modal */}
      {stockErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b pb-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl font-bold">
                !
              </div>
              <h2 className="text-lg font-bold text-slate-800">Insufficient Stock</h2>
            </div>

            <p className="text-sm text-slate-600 mb-3">
              This order cannot be placed. The following ingredients don't have enough stock:
            </p>

            <ul className="space-y-2 mb-5">
              {stockErrorModal.shortages.map((s, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  <span className="font-semibold">{s.ingredient}</span> — needs {s.required}
                  {s.unit}, only {s.available}
                  {s.unit} available
                </li>
              ))}
            </ul>

            <button
              onClick={() => setStockErrorModal(null)}
              className="w-full rounded-xl bg-[#0A5BAE] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Toast notification for new products */}
      {showNewProductToast && (
        <div style={toastStyle}>
          <FaBell size={18} />
          <span>New product "{newProductName}" is now available!</span>
        </div>
      )}

      {/* PayHere QR Payment Modal */}
      {payhereModal && (
        <PayHereQRModal
          paymentUrl={payhereModal.paymentUrl}
          orderId={payhereModal.orderId}
          onSuccess={() => handlePayHereSuccess(payhereModal.invoiceState)}
          onCancel={() => {
            setPayhereModal(null);
            setSubmitting(false);
          }}
        />
      )}

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
          
          @keyframes slideUp {
            from {
              transform: translateX(-50%) translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          .product-notifications-container::-webkit-scrollbar {
            width: 4px;
          }
          
          .product-notifications-container::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .product-notifications-container::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
          }
        `}
      </style>
    </div>
  );
};

export default CashierPos;