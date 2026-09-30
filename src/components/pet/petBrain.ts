import type { PetAction } from "./types";
import type { User } from "../../types";

export interface PetBrainResponse {
  speech: string;
  action?: PetAction;
  suggestions?: string[];
}

export function processPetMessage(query: string, user: User): PetBrainResponse {
  const q = query.toLowerCase().trim();
  const isVendor = user.role === "vendor";
  const isAdmin = user.role === "super_admin";

  // Greetings
  if (q.match(/^(hi|hello|hey|yo|hai|hola|greetings)/)) {
    return {
      speech: `WOOF! 🐶 BEEP! Hi ${user.name || "there"}! I'm Sparky, your robotic puppy guide! Tell me where you want to go and I'll wag my tail, jump over, and point to the button!`,
      suggestions: [
        isVendor ? "Add a new product" : "View all products",
        "Where are Add-ons?",
        "Show my Orders",
        "Take a tour",
      ],
    };
  }

  if (q.includes("who are you") || q.includes("what can you do") || q.includes("help") || q.includes("puppy") || q.includes("dog")) {
    return {
      speech: `I'm Sparky the Robo-Pup! 🐶⚡ I can scamper across the screen, point my paw directly at buttons, open modals, and guide you anywhere in the ${isVendor ? "Vendor" : "Admin"} dashboard. Ask me: "Where are add-ons?" or "Add product"!`,
      suggestions: [
        "Where are Add-ons?",
        "Where are Orders?",
        "How to add a product?",
        "Take a tour",
      ],
    };
  }

  // Add-ons
  if (q.includes("addon") || q.includes("add-on") || q.includes("gift wrap") || q.includes("extra")) {
    const route = isVendor ? "/vendor/addons" : "/admin/addons";
    return {
      speech: `Got it! 🎁 Add-ons let you offer gift wrapping, custom greeting cards, and extra perks. Follow me to Add-ons Management!`,
      action: {
        type: "navigate",
        route,
        targetSelector: "button:has-text('Add Add-on'), [data-guide='btn-add-addon'], a[href*='addons']",
        label: "Jump to Add-ons",
        explanation: "Here is where you create and manage all add-ons for your products!",
      },
      suggestions: ["Add a new add-on", "Where are products?", "Show orders"],
    };
  }

  // Create Product / Add Product
  if (
    q.includes("add product") ||
    q.includes("create product") ||
    q.includes("new product") ||
    q.includes("upload product")
  ) {
    const route = isVendor ? "/vendor/products" : "/admin/products";
    return {
      speech: `Right away! 📦 Let me jump to the products page and show you the "Add Product" button!`,
      action: {
        type: "navigate",
        route,
        targetSelector: "button:has-text('Add Product'), [data-guide='btn-add-product'], a[href*='products']",
        label: "Take me to Add Product",
        explanation: "Click this button to open the product creation modal and list a new item!",
      },
      suggestions: ["Where are Add-ons?", "Show my Orders", "Manage Categories"],
    };
  }

  // Products Listing
  if (q.includes("product") || q.includes("item") || q.includes("catalog") || q.includes("inventory")) {
    const route = isVendor ? "/vendor/products" : "/admin/products";
    return {
      speech: `Let's check your inventory! 📦 Navigating to Products...`,
      action: {
        type: "navigate",
        route,
        targetSelector: "a[href*='products'], table, button:has-text('Add Product')",
        label: "View Products",
        explanation: "Here is your full product catalog with pricing, stock quantity, and active statuses.",
      },
      suggestions: ["Add a new product", "Manage Categories", "Product Offers"],
    };
  }

  // Orders
  if (q.includes("order") || q.includes("shipping") || q.includes("tracking") || q.includes("dispatch")) {
    const route = isVendor ? "/vendor/orders" : "/admin/orders";
    return {
      speech: `Follow me! 🛒 Here is where you can view, filter, download PDFs, and update order statuses!`,
      action: {
        type: "navigate",
        route,
        targetSelector: "a[href*='orders'], table, button:has-text('Filter')",
        label: "Jump to Orders",
        explanation: "Track customer orders, prepare items, update fulfillment, and view invoices here.",
      },
      suggestions: ["Where are products?", "Check reviews", "Show statistics"],
    };
  }

  // Reviews & Ratings
  if (q.includes("review") || q.includes("rating") || q.includes("feedback") || q.includes("star")) {
    const route = isVendor ? "/vendor/reviews" : "/admin/reviews";
    return {
      speech: `⭐ Let's see what your customers are saying! Jumping to Customer Reviews.`,
      action: {
        type: "navigate",
        route,
        targetSelector: "a[href*='reviews'], table",
        label: "Go to Reviews",
        explanation: "Read customer reviews, star ratings, and feedback for your store.",
      },
      suggestions: ["Where are orders?", "Product offers", "Dashboard"],
    };
  }

  // Offers & Discounts
  if (q.includes("offer") || q.includes("discount") || q.includes("coupon") || q.includes("sale")) {
    const route = isVendor ? "/vendor/offers" : "/admin/offers";
    return {
      speech: `🏷️ Looking to boost sales? Here is where you manage offers and discounts!`,
      action: {
        type: "navigate",
        route,
        targetSelector: "a[href*='offers'], button:has-text('Create'), button:has-text('Add')",
        label: "Jump to Offers",
        explanation: "Create limited-time percentage or flat discounts for your items.",
      },
      suggestions: ["Add a new product", "Where are Add-ons?", "My Orders"],
    };
  }

  // Categories & Subcategories
  if (q.includes("category") || q.includes("categories") || q.includes("subcategory") || q.includes("subcategories")) {
    const route = isVendor ? "/vendor/categories" : "/admin/categories";
    return {
      speech: `🗂️ Categories help customers discover your items quickly. Let's go to Category Management!`,
      action: {
        type: "navigate",
        route,
        targetSelector: "a[href*='categories'], button:has-text('Add')",
        label: "Go to Categories",
        explanation: "Browse existing categories or request new ones for your products.",
      },
      suggestions: ["Add product", "Subcategories", "Add-ons"],
    };
  }

  // Profile & Password
  if (q.includes("profile") || q.includes("account") || q.includes("password") || q.includes("store details")) {
    const route = isVendor ? "/vendor/profile" : "/profile";
    return {
      speech: `👤 Let's head over to your profile settings!`,
      action: {
        type: "navigate",
        route,
        targetSelector: "a[href*='profile'], button[type='submit']",
        label: "Open Profile",
        explanation: "Update your business name, contact info, and bank or pickup details here.",
      },
      suggestions: ["Change password", "My orders", "Dashboard"],
    };
  }

  // Admin Specific: Staff & Payroll
  if (isAdmin && (q.includes("staff") || q.includes("employee") || q.includes("salary") || q.includes("payroll"))) {
    return {
      speech: `👥 Managing the team? Heading over to Staff & Payroll Management!`,
      action: {
        type: "navigate",
        route: "/admin/staff",
        targetSelector: "a[href*='staff'], button:has-text('Add Staff')",
        label: "Staff Management",
        explanation: "Add staff members, assign roles, manage commissions, and review payroll.",
      },
      suggestions: ["Staff roles", "Salary management", "Vendor applications"],
    };
  }

  // Admin Specific: Vendors
  if (isAdmin && (q.includes("vendor") || q.includes("seller") || q.includes("merchant"))) {
    return {
      speech: `🏬 Heading over to Marketplace Vendors management!`,
      action: {
        type: "navigate",
        route: "/admin/vendors/active",
        targetSelector: "a[href*='vendors'], table",
        label: "Active Vendors",
        explanation: "View active sellers, review pending applications, and manage vendor products.",
      },
      suggestions: ["Vendor orders", "Vendor products", "Statistics"],
    };
  }

  // Admin Specific: Analytics / Profit
  if (isAdmin && (q.includes("profit") || q.includes("analytics") || q.includes("stat") || q.includes("revenue"))) {
    return {
      speech: `📈 Let's inspect the numbers! Taking you to Profit & Statistics analytics.`,
      action: {
        type: "navigate",
        route: "/admin/profit",
        targetSelector: "a[href*='profit'], [data-guide='analytics-card']",
        label: "View Profit Analytics",
        explanation: "See real-time profit margins, bestsellers, and financial metrics.",
      },
      suggestions: ["Statistics", "Export data", "Orders"],
    };
  }

  // Dark / Light Theme
  if (q.includes("dark mode") || q.includes("light mode") || q.includes("theme")) {
    return {
      speech: `🌓 You can toggle dark or light mode using the theme button in the top navigation bar!`,
      action: {
        type: "highlight",
        targetSelector: "header button:has(svg), header button[aria-label*='theme'], [data-guide='theme-toggle']",
        label: "Point to Theme Toggle",
        explanation: "Click right here to switch between Dark Mode and Light Mode!",
      },
      suggestions: ["Where are products?", "Show orders", "Add-ons"],
    };
  }

  // Dashboard / Home
  if (q.includes("home") || q.includes("dashboard") || q.includes("overview")) {
    const route = isAdmin ? "/admin" : "/";
    return {
      speech: `🏠 Going back to the Main Dashboard!`,
      action: {
        type: "navigate",
        route,
        label: "Back to Dashboard",
        explanation: "Here is your high-level overview of daily performance, revenue, and active orders.",
      },
      suggestions: ["My products", "Add-ons", "Orders"],
    };
  }

  // Guided Tour
  if (q.includes("tour") || q.includes("walkthrough") || q.includes("guide me")) {
    return {
      speech: `✨ Awesome! Let's do a guided tour. I'll walk through the main sections of your control center!`,
      action: {
        type: "tour",
        label: "Start Tour",
        explanation: "Follow me as I jump through the most important tools in your portal!",
      },
      suggestions: ["Add a product", "Manage add-ons", "View orders"],
    };
  }

  // Fallback
  return {
    speech: `BEEP! 🤔 I'm not totally sure about "${query}", but here are the most popular places I can jump to:`,
    suggestions: [
      isVendor ? "Add a new product" : "View all products",
      "Where are Add-ons?",
      "Show my Orders",
      "Customer Reviews",
      "Take a tour",
    ],
  };
}
