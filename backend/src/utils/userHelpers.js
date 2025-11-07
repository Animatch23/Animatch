import User from "../models/User.js";

const sanitizeUsernameCandidate = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
};

const buildUsernameCandidates = (email, displayName) => {
  const candidates = [];
  const fromDisplayName = sanitizeUsernameCandidate(displayName ?? "").slice(0, 24);
  if (fromDisplayName && !candidates.includes(fromDisplayName)) {
    candidates.push(fromDisplayName);
  }

  const emailLocalPart = sanitizeUsernameCandidate((email || "").split("@")[0]);
  if (emailLocalPart && !candidates.includes(emailLocalPart)) {
    candidates.push(emailLocalPart);
  }

  candidates.push("animatcher");
  return candidates;
};

export const generateUniqueUsername = async (email, displayName) => {
  const candidates = buildUsernameCandidates(email, displayName);
  const tried = new Set();

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) {
      continue;
    }
    tried.add(candidate);

    if (!(await User.exists({ username: candidate }))) {
      return candidate;
    }

    let suffix = 1;
    while (suffix < 1000) {
      const withSuffix = `${candidate}_${suffix}`;
      if (!(await User.exists({ username: withSuffix }))) {
        return withSuffix;
      }
      suffix += 1;
    }
  }

  return `animatcher_${Math.floor(Math.random() * 10000)}`;
};

export const ensureUserRecord = async (email, displayName) => {
  if (!email) {
    throw new Error("Email is required to ensure user record");
  }

  let user = await User.findOne({ email });
  if (user) {
    return user;
  }

  const username = await generateUniqueUsername(email, displayName);
  user = await User.create({
    email,
    username,
    profilePicture: null,
  });

  return user;
};
