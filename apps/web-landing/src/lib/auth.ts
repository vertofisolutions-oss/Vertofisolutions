"use client";

import { normalizePlan, PlanTier } from "./plans";

/** Token storage keys */
const ACCESS_KEY = "vertofi.panels.access";
const REFRESH_KEY = "vertofi.panels.refresh";
const REGISTERED_USERS_KEY = "vertofi_registered_users";
const CURRENT_USER_ID_KEY = "vertofi_current_user_id";

export type Role =
  | "ASSOCIATE"
  | "ACCOUNTANT"
  | "BUSINESS_OWNER"
  | "BUSINESS_USER"
  | "BHS_ANALYST"
  | "LAWYER";

export interface Claims {
  sub: string;
  role: Role;
  professionalType?: string;
  orgId?: string;
  plan?: string;
  name?: string;
  email?: string;
  mobile?: string;
}

export interface BusinessProfileData {
  name: string;
  legalName?: string;
  tradeName?: string;
  email?: string;
  mobile?: string;
  altMobile?: string;
  aadhaar?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  turnover?: string;
  businessType?: string;
  industry?: string;
  plan?: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  plan: PlanTier;
  billingCycle: "MONTHLY" | "YEARLY";
  businessProfile?: BusinessProfileData;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: string;
  updatedAt?: string;
}

/** Pre-registered active seed accounts */
export const INITIAL_REGISTERED_USERS: RegisteredUser[] = [
  {
    id: "usr_goutham_01",
    name: "Goutham Badiga",
    email: "gouthambadiga01@gmail.com",
    mobile: "9876543210",
    password: "Vertofi@7755",
    plan: "ENTERPRISE",
    billingCycle: "MONTHLY",
    role: "BUSINESS_OWNER",
    businessProfile: {
      name: "Goutham Enterprises",
      legalName: "Goutham Badiga Trading Pvt Ltd",
      tradeName: "Goutham Enterprises",
      email: "gouthambadiga01@gmail.com",
      mobile: "9876543210",
      gstin: "36AABCU9603R1ZM",
      pan: "AABCU9603R",
      state: "Telangana",
      country: "INDIA",
      businessType: "PVT_LTD",
      turnover: "40L_2CR",
      plan: "ENTERPRISE",
    },
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_geethika_02",
    name: "Geethika Parvatham",
    email: "geethikaparvatham@gmail.com",
    mobile: "9876543211",
    password: "Geethu@1720",
    plan: "FREE",
    billingCycle: "MONTHLY",
    role: "BUSINESS_OWNER",
    businessProfile: {
      name: "Parvatham Solutions",
      legalName: "Parvatham Technologies LLP",
      tradeName: "Parvatham Solutions",
      email: "geethikaparvatham@gmail.com",
      mobile: "9876543211",
      gstin: "36AABCP1234K1Z5",
      pan: "AABCP1234K",
      state: "Telangana",
      country: "INDIA",
      businessType: "LLP",
      turnover: "40L_2CR",
      plan: "FREE",
    },
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

/** Clean and normalize 10-digit mobile */
export function normalizeMobile(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/** Clean and normalize email address */
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/** Read registered users from persistent storage and ensure defaults & password updates exist */
export function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return INITIAL_REGISTERED_USERS;
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    let users: RegisteredUser[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users)) users = [];

    let modified = false;

    // Ensure all seed accounts exist in user storage and have the authoritative credentials
    for (const initUser of INITIAL_REGISTERED_USERS) {
      const initMail = normalizeEmail(initUser.email);
      const initMob = normalizeMobile(initUser.mobile);

      const existingIdx = users.findIndex(
        (u) =>
          normalizeEmail(u.email) === initMail ||
          normalizeMobile(u.mobile) === initMob
      );

      if (existingIdx === -1) {
        users.push(initUser);
        modified = true;
      } else {
        // Enforce the correct password and details for seed accounts
        if (users[existingIdx].password !== initUser.password) {
          users[existingIdx].password = initUser.password;
          modified = true;
        }
        if (!users[existingIdx].email) {
          users[existingIdx].email = initUser.email;
          modified = true;
        }
        if (!users[existingIdx].mobile) {
          users[existingIdx].mobile = initUser.mobile;
          modified = true;
        }
        if (!users[existingIdx].name) {
          users[existingIdx].name = initUser.name;
          modified = true;
        }
        // Sync authoritative plan from initial seed user
        if (users[existingIdx].id === initUser.id && users[existingIdx].plan !== initUser.plan) {
          users[existingIdx].plan = initUser.plan;
          if (users[existingIdx].businessProfile) {
            users[existingIdx].businessProfile!.plan = initUser.plan;
          }
          modified = true;
        }
        if (!users[existingIdx].plan) {
          users[existingIdx].plan = initUser.plan;
          modified = true;
        }
        if (!users[existingIdx].status) {
          users[existingIdx].status = "ACTIVE";
          modified = true;
        }
      }
    }

    if (modified || !raw) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return INITIAL_REGISTERED_USERS;
  }
}

/** Save users array to storage */
export function saveRegisteredUsers(users: RegisteredUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error("Failed to save registered users:", err);
  }
}

/** Find a user by email or mobile number */
export function findUserByIdentifier(identifier: string): RegisteredUser | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim();
  const cleanMail = normalizeEmail(clean);
  const cleanMob = normalizeMobile(clean);
  const users = getRegisteredUsers();

  return users.find((u) => {
    const uEmail = normalizeEmail(u.email);
    const uMobile = normalizeMobile(u.mobile);
    if (clean.includes("@")) {
      return uEmail === cleanMail;
    }
    return (cleanMob && cleanMob.length === 10 && uMobile === cleanMob) || uEmail === cleanMail;
  });
}

/** Check if phone number is already registered */
export function isPhoneRegistered(mobile: string, excludeUserId?: string): boolean {
  const target = normalizeMobile(mobile);
  if (!target || target.length !== 10) return false;
  const users = getRegisteredUsers();
  return users.some(
    (u) => normalizeMobile(u.mobile) === target && (!excludeUserId || u.id !== excludeUserId)
  );
}

/** Check if email address is already registered */
export function isEmailRegistered(email: string, excludeUserId?: string): boolean {
  const target = normalizeEmail(email);
  if (!target || !target.includes("@")) return false;
  const users = getRegisteredUsers();
  return users.some(
    (u) => normalizeEmail(u.email) === target && (!excludeUserId || u.id !== excludeUserId)
  );
}

/** Register a new user account with strict uniqueness and plan association */
export function registerUser(details: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword?: string;
  plan?: string;
  billingCycle?: "MONTHLY" | "YEARLY";
  businessProfile?: Partial<BusinessProfileData>;
}): { success: boolean; user?: RegisteredUser; error?: string } {
  const name = details.name?.trim() || "";
  const email = normalizeEmail(details.email);
  const mobile = normalizeMobile(details.mobile);
  const password = details.password || "";
  const confirmPassword = details.confirmPassword;
  const planTier = normalizePlan(details.plan || "FREE");
  const billingCycle = details.billingCycle || "MONTHLY";

  // 1. Mobile validation
  if (!mobile || mobile.length !== 10) {
    return { success: false, error: "Please enter a valid 10-digit mobile number." };
  }

  // 2. Email validation
  if (!email || !email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid work email address." };
  }

  // 3. Password validation
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  // 4. Phone uniqueness check
  if (isPhoneRegistered(mobile)) {
    return {
      success: false,
      error: "An account already exists with this phone number. Please use a different phone number.",
    };
  }

  // 5. Email uniqueness check
  if (isEmailRegistered(email)) {
    return {
      success: false,
      error: "An account already exists with this email address. Please sign in instead.",
    };
  }

  const finalName = name || (email ? email.split("@")[0] : "Business Owner");
  const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newUser: RegisteredUser = {
    id: userId,
    name: finalName,
    email,
    mobile,
    password,
    plan: planTier,
    billingCycle,
    role: "BUSINESS_OWNER",
    businessProfile: {
      name: details.businessProfile?.name || finalName,
      legalName: details.businessProfile?.legalName || finalName,
      tradeName: details.businessProfile?.tradeName || finalName,
      email,
      mobile,
      gstin: details.businessProfile?.gstin || "",
      pan: details.businessProfile?.pan || "",
      state: details.businessProfile?.state || "",
      turnover: details.businessProfile?.turnover || "",
      businessType: details.businessProfile?.businessType || "PROPRIETORSHIP",
      plan: planTier,
      ...details.businessProfile,
    },
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  const users = getRegisteredUsers();
  users.push(newUser);
  saveRegisteredUsers(users);

  // Return created account
  return { success: true, user: newUser };
}

/** Authenticate user credentials and create active session */
export function authenticateUser(
  identifier: string,
  passwordInput: string,
  rememberMe: boolean = true
): { success: boolean; user?: RegisteredUser; error?: string } {
  const cleanId = (identifier || "").trim();
  const password = passwordInput || "";

  if (!cleanId) {
    return { success: false, error: "Please enter your email or mobile number." };
  }
  if (!password) {
    return { success: false, error: "Please enter your password." };
  }

  // Find user in registered users
  const user = findUserByIdentifier(cleanId);
  if (!user || user.password !== password) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  if (user.status === "INACTIVE") {
    return {
      success: false,
      error: "Your account is deactivated. Please contact Vertofi support.",
    };
  }

  // Create session for authenticated user
  createActiveSession(user, rememberMe);

  return { success: true, user };
}

/** Create active session tokens and local user context */
export function createActiveSession(user: RegisteredUser, rememberMe: boolean = true): void {
  if (typeof window === "undefined") return;

  const userOrg = `org_${user.id}`;
  const mockPayload: Claims = {
    sub: user.id,
    role: user.role || "BUSINESS_OWNER",
    orgId: userOrg,
    plan: user.plan,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
  };

  const mockToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    btoa(unescape(encodeURIComponent(JSON.stringify(mockPayload)))) +
    ".mocksignature";

  setTokens(mockToken, "mock-refresh-token");

  // User-specific session data
  const userPlan = normalizePlan(user.plan || "FREE");
  localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
  localStorage.setItem("vertofi.orgId", userOrg);
  localStorage.setItem("vertofi_user_name", user.name);
  localStorage.setItem("vertofi_user_email", user.email);
  localStorage.setItem("vertofi_user_mobile", user.mobile);
  localStorage.setItem("vertofi.plan", userPlan);
  localStorage.setItem("vertofi_user_plan", userPlan);

  const subState = {
    plan: userPlan,
    billingCycle: user.billingCycle || "MONTHLY",
    status: userPlan === "FREE" ? "active" : "active",
    trialStartDate: null,
    trialEndDate: null,
    renewalDate: null,
    founderPricing: false,
    addons: [],
    commercialFeatures: [],
    usage: {
      transactions: 24,
      scannedBills: 0,
      users: 1,
      gstins: 1,
      payrollEmployees: 0,
      branches: 1,
    },
  };
  localStorage.setItem("vertofi_subscription_state", JSON.stringify(subState));

  if (user.businessProfile) {
    const updatedProfile = { ...user.businessProfile, plan: userPlan };
    localStorage.setItem("vertofi_business_profile", JSON.stringify(updatedProfile));
    if (user.businessProfile.state) {
      localStorage.setItem("vertofi_user_state", user.businessProfile.state);
    }
  } else {
    localStorage.setItem(
      "vertofi_business_profile",
      JSON.stringify({
        name: user.name,
        legalName: user.name,
        email: user.email,
        mobile: user.mobile,
        plan: userPlan,
      })
    );
  }

  if (!rememberMe) {
    sessionStorage.setItem("vertofi_session_transient", "1");
  } else {
    sessionStorage.removeItem("vertofi_session_transient");
  }

  // Dispatch events to notify listeners across the application
  window.dispatchEvent(new CustomEvent("vertofi:subscription-changed", { detail: subState }));
  window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: userPlan } }));
  window.dispatchEvent(new CustomEvent("vertofi:auth-changed", { detail: { user } }));
  window.dispatchEvent(new Event("storage"));
}

/** Get currently authenticated user */
export function getCurrentUser(): RegisteredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const currentUserId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (currentUserId) {
      const users = getRegisteredUsers();
      const user = users.find((u) => u.id === currentUserId);
      if (user) return user;
    }

    // Fallback: check claims from token
    const claims = decodeClaims();
    if (claims && claims.sub) {
      const user = findUserByIdentifier(claims.sub) || findUserByIdentifier(claims.email || "");
      if (user) return user;
    }
  } catch {}
  return null;
}

/** Check if a valid authenticated user session exists */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = getAccess();
  const userId = localStorage.getItem(CURRENT_USER_ID_KEY);
  return Boolean(token && userId);
}

/** Permanently update an existing user's plan */
export function updateUserPlan(
  userId: string,
  newPlan: PlanTier,
  cycle: "MONTHLY" | "YEARLY" = "MONTHLY"
): boolean {
  const users = getRegisteredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;

  users[idx].plan = newPlan;
  users[idx].billingCycle = cycle;
  if (users[idx].businessProfile) {
    users[idx].businessProfile!.plan = newPlan;
  }
  users[idx].updatedAt = new Date().toISOString();
  saveRegisteredUsers(users);

  // If this is currently active user, update active session as well
  const currentUserId = localStorage.getItem(CURRENT_USER_ID_KEY);
  if (currentUserId === userId) {
    localStorage.setItem("vertofi.plan", newPlan);
    localStorage.setItem("vertofi_user_plan", newPlan);
    const profRaw = localStorage.getItem("vertofi_business_profile");
    if (profRaw) {
      try {
        const p = JSON.parse(profRaw);
        p.plan = newPlan;
        localStorage.setItem("vertofi_business_profile", JSON.stringify(p));
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: newPlan } }));
    window.dispatchEvent(new Event("storage"));
  }
  return true;
}

/** Token persistence helpers */
export function setTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem("vertofi.access", access);
  localStorage.setItem("vertofi.refresh", refresh);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("vertofi.access");
  localStorage.removeItem("vertofi.refresh");
  localStorage.removeItem(CURRENT_USER_ID_KEY);
  localStorage.removeItem("vertofi.orgId");
  localStorage.removeItem("vertofi_user_name");
  localStorage.removeItem("vertofi_user_email");
  localStorage.removeItem("vertofi_user_mobile");
  localStorage.removeItem("vertofi_user_state");
  localStorage.removeItem("vertofi.plan");
  localStorage.removeItem("vertofi_user_plan");
  localStorage.removeItem("vertofi_business_profile");
  localStorage.removeItem("vertofi_business_turnover");
  localStorage.removeItem("vertofi_assigned_professionals");
  sessionStorage.removeItem("vertofi_session_transient");

  window.dispatchEvent(new CustomEvent("vertofi:auth-changed", { detail: { user: null } }));
  window.dispatchEvent(new Event("storage"));
}

export function logout(): void {
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function getAccess(): string | null {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(ACCESS_KEY) || localStorage.getItem("vertofi.access");
}

export function decodeClaims(): Claims | null {
  const token = getAccess();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))));
    return {
      sub: json.sub,
      role: json.role,
      professionalType: json.professionalType,
      orgId: json.orgId,
      plan: json.plan,
      name: json.name,
      email: json.email,
      mobile: json.mobile,
    };
  } catch {
    return null;
  }
}

export const ROLE_HOME: Record<Role, string> = {
  ASSOCIATE: "/associates",
  ACCOUNTANT: "/accountants",
  BHS_ANALYST: "/bhs-portal",
  LAWYER: "/legal-portal",
  BUSINESS_OWNER: "/dashboard",
  BUSINESS_USER: "/dashboard",
};
