import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import { getSharePayload } from "./share-session";

type ShareCardTheme = {
  id: string;
  label: string;
  background: string;
  accent: string;
  text: string;
  muted: string;
};

const SHARE_CARD_THEMES: ShareCardTheme[] = [
  {
    id: "deep-midnight",
    label: "Midnight",
    background: "linear-gradient(140deg, #0b1320 0%, #111827 52%, #1e293b 100%)",
    accent: "#22d3ee",
    text: "#f8fafc",
    muted: "#cbd5e1",
  },
  {
    id: "stealth",
    label: "Stealth",
    background: "linear-gradient(140deg, #0b0b0b 0%, #1b1b1b 50%, #2b2b2b 100%)",
    accent: "#9ca3af",
    text: "#f8fafc",
    muted: "#94a3b8",
  },
  {
    id: "pastel",
    label: "Pastel",
    background: "linear-gradient(140deg, #fdf2f8 0%, #eef2ff 50%, #ecfccb 100%)",
    accent: "#a78bfa",
    text: "#6f7990",
    muted: "#64748b",
  },
  {
    id: "ember",
    label: "Ember",
    background: "linear-gradient(145deg, #2a0f0a 0%, #7c2d12 55%, #f97316 100%)",
    accent: "#fed7aa",
    text: "#fff7ed",
    muted: "#ffedd5",
  },
  {
    id: "forest",
    label: "Forest",
    background: "linear-gradient(145deg, #052e16 0%, #14532d 50%, #22c55e 100%)",
    accent: "#bbf7d0",
    text: "#f0fdf4",
    muted: "#dcfce7",
  },
];

const SHARE_CARD_FONTS = ["Georgia", "Trebuchet MS", "Courier New", "Impact"];
const CALM_UNLOCK_SCORE = 100;
const FOCUS_UNLOCK_SCORE = 200;
const LOCKED_IN_UNLOCK_SCORE = 500;
const AURA_SCORE_MAX = 2500;

function isBadgeUnlocked(score: number, threshold: number) {
  return score >= threshold;
}

// future feature
function getTopBadgeLabel(score: number) {
  const safePercent = Math.max(0, Math.min(100, Math.round((score / AURA_SCORE_MAX) * 100)));
  return `TOP ${safePercent}%`;
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 16);
  });

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hexToRgba(hex: string, alpha = 1) {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ensureFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path.replace(/^file:\/\//, "")}`;
}

function buildShareCardSvg({
  finalScore,
  tierTitle,
  tierMessage,
  shareDisplayName,
  shareDetails,
  shareFontFamily,
  selectedShareTheme,
  layoutDensity = "detailed",
  showAura = true,
  aspectRatio = '9:16',
}: {
  finalScore: number;
  tierTitle: string;
  tierMessage: string;
  shareDisplayName: string;
  shareDetails: string;
  shareFontFamily: string;
  selectedShareTheme: ShareCardTheme;
  layoutDensity?: "detailed" | "minimal";
  showAura?: boolean;
  aspectRatio?: '9:16' | '1:1';
}) {
  const safeName = escapeHtml(shareDisplayName.trim());
  const safeDetails = escapeHtml(shareDetails.trim());
  const safeTierTitle = escapeHtml(tierTitle);
  const safeTierMessage = escapeHtml(tierMessage);
  const safeFont = escapeHtml(shareFontFamily);
  const progressPercent = Math.max(0, Math.min(100, finalScore)) / 100;
  const progressBarX = 174 + Math.round(progressPercent * 600);
  const dateStamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const svgWidth = 1080;
  const svgHeight = aspectRatio === '1:1' ? 1080 : 1920;
  const showCalmBadge = isBadgeUnlocked(finalScore, CALM_UNLOCK_SCORE);
  const showFocusBadge = isBadgeUnlocked(finalScore, FOCUS_UNLOCK_SCORE);
  const showLockedInBadge = isBadgeUnlocked(finalScore, LOCKED_IN_UNLOCK_SCORE);

  return `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aura result share card">
      <defs>
        <linearGradient id="background-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1320" />
          <stop offset="52%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <linearGradient id="score-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#C0C0C0" />
        </linearGradient>
        <radialGradient id="aura-glow" cx="15%" cy="22%" r="40%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.28" />
          <stop offset="40%" stop-color="#06b6d4" stop-opacity="0.12" />
          <stop offset="100%" stop-color="transparent" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${svgWidth}" height="${svgHeight}" fill="url(#background-gradient)" />
      ${showAura ? `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="url(#aura-glow)" />` : ``}
      <rect x="96" y="96" width="888" height="1728" rx="56" fill="#0f172a" stroke="${selectedShareTheme.accent}" stroke-width="2" />
      <text x="174" y="254" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="34" letter-spacing="8">AURA RESULT</text>
      <text x="834" y="220" fill="${selectedShareTheme.muted}" font-family="${safeFont}" font-size="18" opacity="0.8">${dateStamp}</text>
      <text x="174" y="430" fill="url(#score-gradient)" font-family="${safeFont}" font-size="134" font-weight="900">${Number.isFinite(finalScore) ? finalScore : 0}</text>
      <text x="174" y="520" fill="${selectedShareTheme.text}" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="900">${safeTierTitle}</text>
      ${layoutDensity === "detailed" ? `
        <text x="174" y="596" fill="${selectedShareTheme.muted}" fill-opacity="0.7" font-family="${safeFont}" font-size="36">${safeTierMessage}</text>
        <g>
          <rect x="174" y="620" rx="22" ry="22" width="160" height="48" fill="${selectedShareTheme.accent}" />
          <text x="254" y="652" fill="#021018" font-family="${safeFont}" font-size="20" font-weight="700" text-anchor="middle">${getTopBadgeLabel(finalScore)}</text>
        </g>
        <g>
          ${showFocusBadge ? `
            <rect x="174" y="700" rx="20" ry="20" width="156" height="44" fill="#0B1221" stroke="${selectedShareTheme.accent}" />
            <text x="252" y="730" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="18" font-weight="700" text-anchor="middle">⚡ Focus</text>
          ` : ""}

          ${showCalmBadge ? `
            <rect x="354" y="700" rx="20" ry="20" width="156" height="44" fill="#0B1221" stroke="${selectedShareTheme.accent}" />
            <text x="432" y="730" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="18" font-weight="700" text-anchor="middle">🌿 Calm</text>
          ` : ""}

          ${showLockedInBadge ? `
            <rect x="534" y="700" rx="20" ry="20" width="156" height="44" fill="#0B1221" stroke="${selectedShareTheme.accent}" />
            <text x="612" y="730" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="18" font-weight="700" text-anchor="middle">✨ Locked In</text>
          ` : ""}
        </g>
        <g>
          <line x1="174" x2="834" y="780" stroke="${selectedShareTheme.muted}" stroke-width="6" stroke-linecap="round" opacity="0.35" />
          <circle cx="${progressBarX}" cy="780" r="14" fill="${selectedShareTheme.accent}" stroke="#ffffff" stroke-width="2" />
        </g>
        ${safeName ? `<text x="174" y="1438" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="46" font-weight="800">${safeName}</text>` : ""}
        ${safeDetails ? `<text x="174" y="1510" fill="${selectedShareTheme.muted}" font-family="${safeFont}" font-size="34">${safeDetails}</text>` : ""}
      ` : ""}
      <text x="174" y="1638" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="24" letter-spacing="5">aurarank.ca</text>
    </svg>
  `;
}

export default function ShareScreen() {
  const router = useRouter();
  const previewShotRef = useRef<ViewShot | null>(null);
  const payload = getSharePayload();
  const finalScore = payload?.score ?? 0;
  const tierTitle = payload?.tierTitle ?? "Aura Tier";
  const tierMessage = payload?.tierMessage ?? "Your result";

  const [shareDisplayName, setShareDisplayName] = useState("");
  const [shareDetails, setShareDetails] = useState("");
  const [shareThemeId, setShareThemeId] = useState(SHARE_CARD_THEMES[0].id);
  const [shareFontFamily, setShareFontFamily] = useState(SHARE_CARD_FONTS[0]);
  const [layoutDensity, setLayoutDensity] = useState<"detailed" | "minimal">("detailed");
  const [showAura, setShowAura] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const [isPreparingShareImage, setIsPreparingShareImage] = useState(false);

  const selectedShareTheme = useMemo(() => {
    return SHARE_CARD_THEMES.find((theme) => theme.id === shareThemeId) ?? SHARE_CARD_THEMES[0];
  }, [shareThemeId]);
  const previewProgress = Math.max(0, Math.min(100, finalScore)) / 100;
  const showCalmBadge = isBadgeUnlocked(finalScore, CALM_UNLOCK_SCORE);
  const showFocusBadge = isBadgeUnlocked(finalScore, FOCUS_UNLOCK_SCORE);
  const showLockedInBadge = isBadgeUnlocked(finalScore, LOCKED_IN_UNLOCK_SCORE);

  

  const handleShareImage = useCallback(async () => {
    setIsPreparingShareImage(true);

    const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
    const isMobileBrowser =
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        Dimensions.get('window').width < 768);

    const isPhone = isNativeMobile || isMobileBrowser;

    try {
      // ─── Native iOS / Android ───────────────────────────────────────────────
      if (isNativeMobile) {
        if (!previewShotRef.current) throw new Error("Preview is not ready");

        const slug = tierTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const shareDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
        const shareFilePath = ensureFileUri(`${shareDirectory}aura-${slug || "result"}.png`);

        const previewCapturePath = await captureRef(previewShotRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });

        if (!previewCapturePath) throw new Error("No preview image generated");

        const sourceUri = ensureFileUri(previewCapturePath);

        try {
          const existing = await FileSystem.getInfoAsync(shareFilePath);
          if (existing.exists) await FileSystem.deleteAsync(shareFilePath, { idempotent: true });
        } catch {
          // ignore cache cleanup failures
        }

        await FileSystem.copyAsync({ from: sourceUri, to: shareFilePath });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) throw new Error("Sharing is not available on this device");

        await Sharing.shareAsync(shareFilePath, {
          dialogTitle: "Share Aura Result",
          mimeType: "image/png",
          UTI: "public.png",
        });

        return;
      }

      // ─── Web (both desktop and mobile browser) ──────────────────────────────
      const exportWidth = 1080;
      const exportHeight = aspectRatio === '1:1' ? 1080 : 1920;

      // Build the off-screen node (shared by both web paths)
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${exportWidth}px;height:${exportHeight}px;overflow:hidden;z-index:-1;`;

      const exportNode = document.createElement("div");
      exportNode.style.cssText = `width:${exportWidth}px;height:${exportHeight}px;background:${selectedShareTheme.background};padding:96px;box-sizing:border-box;font-family:${shareFontFamily},sans-serif;`;

      const exportDate = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      const exportShowDetails = layoutDensity === 'detailed';
      const safeName = escapeHtml(shareDisplayName.trim());
      const safeDetails = escapeHtml(shareDetails.trim());
      const safeTierTitle = escapeHtml(tierTitle);
      const safeTierMessage = escapeHtml(tierMessage);

      exportNode.innerHTML = `
        <div style="height:100%;border-radius:56px;border:2px solid ${selectedShareTheme.accent};background:${showAura ? `radial-gradient(circle at 220px 420px, rgba(6,182,212,0.24) 0%, rgba(6,182,212,0.06) 30%, transparent 60%), #0f172a` : '#0f172a'};color:${selectedShareTheme.text};display:flex;flex-direction:column;justify-content:space-between;padding:78px;box-sizing:border-box;">
          <div style="position:relative;">
            <div style="position:absolute;top:18px;right:18px;color:${selectedShareTheme.muted};opacity:0.8;font-size:14px;">${exportDate}</div>
            <div>
              <p style="letter-spacing:8px;margin:0 0 18px;color:${selectedShareTheme.accent};font-size:34px;">AURA RESULT</p>
              <h1 style="margin:0;font-size:134px;line-height:1.02;background:linear-gradient(180deg,#ffffff 0%,#C0C0C0 100%);-webkit-background-clip:text;color:transparent;">${Number.isFinite(finalScore) ? finalScore : 0}</h1>
              <h2 style="margin:28px 0 0;font-size:54px;line-height:1.2;font-weight:900;font-family:Helvetica,Arial,sans-serif;">${safeTierTitle}</h2>
              ${exportShowDetails ? `
                <p style="margin:24px 0 0;color:${selectedShareTheme.muted};font-size:36px;line-height:1.45;opacity:0.7;">${safeTierMessage}</p>
                <div style="margin-top:14px;display:flex;gap:10px;">
                  <div style="background:#0B1221;border:1px solid ${selectedShareTheme.accent};padding:8px 14px;border-radius:18px;color:${selectedShareTheme.accent};font-weight:700;">⚡ Focus</div>
                  <div style="background:#0B1221;border:1px solid ${selectedShareTheme.accent};padding:8px 14px;border-radius:18px;color:${selectedShareTheme.accent};font-weight:700;">🌿 Calm</div>
                  <div style="background:#0B1221;border:1px solid ${selectedShareTheme.accent};padding:8px 14px;border-radius:18px;color:${selectedShareTheme.accent};font-weight:700;">✨ Locked In</div>
                </div>
                <div style="margin-top:20px;width:420px;">
                  <div style="height:6px;background:#0f2230;border-radius:999px;position:relative;">
                    <div style="position:absolute;left:${Math.round((Math.max(0, Math.min(100, finalScore)) / 100) * 100)}%;top:-7px;transform:translateX(-50%);width:18px;height:18px;border-radius:9px;background:${selectedShareTheme.accent};border:2px solid #fff;"></div>
                  </div>
                </div>
                <div style="margin-top:14px;display:inline-block;background:${selectedShareTheme.accent};color:#021018;padding:8px 18px;border-radius:24px;font-weight:700;font-size:18px;">${getTopBadgeLabel(finalScore)}</div>
              ` : ''}
            </div>
          </div>
          <div>
            ${safeName ? `<p style="margin:0;font-size:46px;color:${selectedShareTheme.accent};">${safeName}</p>` : ""}
            ${safeDetails ? `<p style="margin:${safeName ? "24px" : "0"} 0 0;font-size:34px;line-height:1.45;color:${selectedShareTheme.muted};">${safeDetails}</p>` : ""}
            <p style="margin:-8px 0 0;letter-spacing:5px;font-size:24px;color:${selectedShareTheme.accent};">aurarank.ca</p>
          </div>
        </div>
      `;

      wrapper.appendChild(exportNode);
      document.body.appendChild(wrapper);

      await nextFrame();
      if (document.fonts?.ready) await document.fonts.ready;
      await nextFrame();

      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(exportNode, {
        cacheBust: true,
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        width: exportWidth,
        height: exportHeight,
      });

      wrapper.remove();

      if (!blob) throw new Error("No blob generated");

      const slug = tierTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const fileName = `MyAuraResult-${slug || "result"}.png`;

      // ─── Mobile web: use Web Share API with file ─────────────────────────────
      const file = new File([blob], fileName, { type: "image/png" });

      if (isPhone) {
        if (!navigator.share) {
          // fallback download (same as before)
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(downloadUrl);
          return;
        }

        // DON'T await the blob first. Instead, kick off share immediately
        // so the browser sees it happen synchronously inside the gesture,
        // then resolve the file promise once toBlob finishes.
        const { toBlob } = await import("html-to-image");

        const filePromise: Promise<File[]> = toBlob(exportNode, {
          cacheBust: true,
          pixelRatio: Math.max(2, window.devicePixelRatio || 1),
          width: exportWidth,
          height: exportHeight,
        }).then((b) => {
          if (!b) throw new Error("No blob generated");
          return [new File([b], fileName, { type: "image/png" })];
        });

        try {
          await navigator.share({ files: filePromise });
          return;
        } catch (err: unknown) {
          const name = err instanceof Error ? err.name : "";
          if (name === "AbortError") return; // user dismissed — fine
          console.warn("navigator.share failed, falling back to download:", err);
        }

        // fallback: wait for the blob we already started and download it
        const fallbackBlob = await filePromise.then((files) => files[0]);
        const downloadUrl = URL.createObjectURL(fallbackBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        return;
      }


      // ─── Desktop web: trigger download ───────────────────────────────────────
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error(error);
      Alert.alert("Export failed", "Could not generate the share image. Please try again.");
    } finally {
      setIsPreparingShareImage(false);
    }
  }, [
    finalScore,
    selectedShareTheme.accent,
    selectedShareTheme.background,
    selectedShareTheme.muted,
    selectedShareTheme.text,
    shareDetails,
    shareDisplayName,
    shareFontFamily,
    tierMessage,
    tierTitle,
    layoutDensity,
    aspectRatio,
    showAura,
  ]);
    

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>

          {/* DEBUG feature: going back to quiz not required */}
          {/*
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to the result screen"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          */}
        </View>

        <Text style={styles.header}>Share Your Aura</Text>
        <Text style={styles.subHeader}>Customize your image, then export it.</Text>

        <View style={styles.editorCard}>
          <TextInput
            value={shareDisplayName}
            onChangeText={setShareDisplayName}
            placeholder="Optional display name"
            placeholderTextColor="#64748B"
            style={styles.shareInput}
          />
          <TextInput
            value={shareDetails}
            onChangeText={setShareDetails}
            placeholder="Optional details"
            placeholderTextColor="#64748B"
            style={[styles.shareInput, styles.shareInputMultiline]}
            multiline
            numberOfLines={3}
            maxLength={180}
          />

          <Text style={styles.shareLabel}>Theme</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeRow}
          >
            {SHARE_CARD_THEMES.map((theme) => {
              const isSelected = theme.id === shareThemeId;

              return (
                <Pressable
                  key={theme.id}
                  onPress={() => setShareThemeId(theme.id)}
                  style={[styles.themeChip, isSelected && styles.themeChipSelected]}
                >
                  <View style={[styles.themeColorSwatch, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextSelected]}>
                    {theme.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.shareLabel}>Font</Text>
          <View style={styles.choiceRow}>
            {SHARE_CARD_FONTS.map((fontName) => {
              const isSelected = fontName === shareFontFamily;

              return (
                <Pressable
                  key={fontName}
                  onPress={() => setShareFontFamily(fontName)}
                  style={[styles.choiceChip, isSelected && styles.choiceChipSelected]}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      { fontFamily: Platform.OS === "web" ? fontName : undefined },
                      isSelected && styles.choiceChipTextSelected,
                    ]}
                  >
                    {fontName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

              <Text style={styles.shareLabel}>Layout</Text>
              <View style={styles.checkboxGrid}>
                {[
                  { id: 'detailed', label: 'Detailed' },
                  { id: 'minimal', label: 'Minimal' },
                ].map((opt) => {
                  const isSelected = layoutDensity === opt.id;

                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setLayoutDensity(opt.id as any)}
                      style={[styles.checkboxOption, isSelected && styles.checkboxOptionSelected]}
                    >
                      <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]}>
                        <Text style={[styles.checkboxCheck, isSelected && styles.checkboxCheckVisible]}>✓</Text>
                      </View>
                      <Text style={[styles.checkboxLabel, isSelected && styles.checkboxLabelSelected]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.sliderRow}>
                <View style={styles.sliderColumn}>
                  <Text style={styles.shareLabel}>Aura</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Aura ${showAura ? 'on' : 'off'}`}
                    onPress={() => setShowAura((current) => !current)}
                    style={styles.aspectSlider}
                  >
                    <View style={styles.aspectSliderTrack}>
                      <View style={[styles.aspectSliderThumb, showAura ? styles.aspectSliderThumbOn : styles.aspectSliderThumbOff]} />

                      <View style={styles.aspectSliderOption}>
                        <View style={[styles.aspectIconFrame, !showAura && styles.aspectIconFrameSelected]}>
                          <View style={styles.aspectIconOutline} />
                        </View>
                      </View>

                      <View style={styles.aspectSliderOption}>
                        <View style={[styles.aspectIconFrame, showAura && styles.aspectIconFrameSelected]}>
                          <View style={styles.aspectIconFilled} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.sliderColumn}>
                  <Text style={styles.shareLabel}>Aspect Ratio</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Aspect ratio ${aspectRatio === '1:1' ? 'square' : 'rectangle'}`}
                    onPress={() => setAspectRatio((current) => (current === '1:1' ? '9:16' : '1:1'))}
                    style={styles.aspectSlider}
                  >
                    <View style={styles.aspectSliderTrack}>
                      <View style={[styles.aspectSliderThumb, aspectRatio === '1:1' ? styles.aspectSliderThumbSquare : styles.aspectSliderThumbRectangle]} />

                      <View style={styles.aspectSliderOption}>
                        <View style={[styles.aspectIconFrame, aspectRatio === '9:16' && styles.aspectIconFrameSelected]}>
                          <View style={styles.aspectIconRectangle} />
                        </View>
                      </View>

                      <View style={styles.aspectSliderOption}>
                        <View style={[styles.aspectIconFrame, aspectRatio === '1:1' && styles.aspectIconFrameSelected]}>
                          <View style={styles.aspectIconSquare} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>
              </View>
        </View>

        <View style={styles.previewWrapper}>
          <ViewShot ref={previewShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
            <View
              collapsable={false}
            style={[
              styles.previewCard,
              {
                backgroundColor: "#0f172a",
                borderColor: selectedShareTheme.accent,
              },
            ]}
          >
            {showAura && (
              <View style={{
                position: 'absolute',
                top: 40,
                left: 28,
                width: 420,
                height: 420,
                borderRadius: 210,
                backgroundColor: hexToRgba(selectedShareTheme.accent, 0.14),
                zIndex: 0,
              }} />
            )}
              <Text style={{ position: 'absolute', top: 20, right: 18, color: selectedShareTheme.muted, opacity: 0.8, fontSize: 12 }}>{new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</Text>
            <View style={styles.previewInner}>
              <View>
                <Text style={[styles.previewLabel, { color: selectedShareTheme.accent }]}>AURA RESULT</Text>
                <Text
                  style={[
                    styles.previewScore,
                    { color: selectedShareTheme.text, fontFamily: shareFontFamily },
                  ]}
                >
                  {Number.isFinite(finalScore) ? finalScore : 0}
                </Text>
                <Text
                  style={[
                    styles.previewTier,
                    { color: selectedShareTheme.text, fontFamily: Platform.OS === "web" ? "Helvetica" : undefined },
                  ]}
                >
                  {tierTitle}
                </Text>
                {layoutDensity === 'detailed' ? (
                  <>
                    <Text
                      style={[
                        styles.previewMessage,
                        { color: hexToRgba(selectedShareTheme.muted, 0.7), fontFamily: shareFontFamily },
                      ]}
                    >
                      {tierMessage}
                    </Text>

                    { /* future feature */ }
                    {/*
                    <View style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: selectedShareTheme.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 }}>
                      <Text style={{ color: '#021018', fontWeight: '700', fontSize: 12 }}>{getTopBadgeLabel(finalScore)}</Text>
                    </View>
                    */}

                    <View style={{ marginTop: 20, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {showCalmBadge ? (
                        <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                          <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>🌿 Calm</Text>
                        </View>
                      ) : null}
                      {showFocusBadge ? (
                        <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                          <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>⚡ Focus</Text>
                        </View>
                      ) : null}
                      {showLockedInBadge ? (
                        <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                          <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>✨ Locked In</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ marginTop: 16, width: 240 }}>
                      <View style={{ height: 6, backgroundColor: '#0f2230', borderRadius: 999, position: 'relative' }}>
                        <View style={{ position: 'absolute', left: `${previewProgress * 100}%`, top: -6, transform: [{ translateX: -9 }], width: 18, height: 18, borderRadius: 9, backgroundColor: selectedShareTheme.accent, borderWidth: 2, borderColor: '#fff' }} />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>

              <View>
                {!!shareDisplayName.trim() && (
                  <Text
                    style={[
                      styles.previewName,
                      { color: selectedShareTheme.accent, fontFamily: shareFontFamily },
                    ]}
                  >
                    {shareDisplayName.trim()}
                  </Text>
                )}
                {!!shareDetails.trim() && (
                  <Text
                    style={[
                      styles.previewDetails,
                      { color: selectedShareTheme.muted, fontFamily: shareFontFamily },
                    ]}
                  >
                    {shareDetails.trim()}
                  </Text>
                )}
                <Text style={[styles.previewBrand, { color: selectedShareTheme.accent }]}>my-aura-app</Text>
              </View>
            </View>
            </View>
          </ViewShot>

        </View>

        {Platform.OS !== "web" ? (
          <View style={styles.nativeShareNote}>
            <Text style={styles.nativeShareNoteText}>
              Your device share sheet will open with the generated image.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primaryButton, styles.secondaryButton]}
          disabled={isPreparingShareImage}
          onPress={() => {
            void handleShareImage();
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {isPreparingShareImage
              ? "Preparing image..."
              : Platform.OS === 'web' && 
      (typeof window !== 'undefined' && 
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        Dimensions.get('window').width < 768))
                ? "Download Aura Image (Temp)" + navigator.canShare ? "canshare" : "cantshare"
                : "Share Aura Image"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 700,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignSelf: "center",
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0B1221",
  },
  backButtonText: {
    color: "#E2E8F0",
    fontWeight: "700",
  },
  header: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
  },
  subHeader: {
    color: "#94A3B8",
    marginBottom: 8,
  },
  editorCard: {
    backgroundColor: "#111C32",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
    gap: 10,
  },
  shareInput: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E2E8F0",
    backgroundColor: "#0B1221",
  },
  shareInputMultiline: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  shareLabel: {
    color: "#CBD5E1",
    fontWeight: "700",
    marginTop: 2,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingRight: 4,
  },
  sliderRow: {
    flexDirection: "row",
    gap: 10,
  },
  sliderColumn: {
    flex: 1,
    gap: 8,
  },
  checkboxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  checkboxOption: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 14,
    backgroundColor: "#0B1221",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkboxOptionSelected: {
    borderColor: "#22D3EE",
    backgroundColor: "#083344",
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxBoxSelected: {
    borderColor: "#67E8F9",
    backgroundColor: "#67E8F9",
  },
  checkboxCheck: {
    color: "transparent",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 12,
  },
  checkboxCheckVisible: {
    color: "#06212A",
  },
  checkboxLabel: {
    color: "#CBD5E1",
    fontWeight: "700",
    fontSize: 13,
  },
  checkboxLabelSelected: {
    color: "#E0F2FE",
  },
  aspectSlider: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 18,
    backgroundColor: "#0B1221",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aspectSliderTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    minHeight: 48,
  },
  aspectSliderThumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "48%",
    borderRadius: 14,
    backgroundColor: "#083344",
    borderWidth: 1,
    borderColor: "#22D3EE",
  },
  aspectSliderThumbSquare: {
    right: 0,
  },
  aspectSliderThumbRectangle: {
    left: 0,
  },
  aspectSliderOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 1,
  },
  aspectIconFrame: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  aspectIconFrameSelected: {
    backgroundColor: "rgba(34, 211, 238, 0.18)",
  },
  aspectIconSquare: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "transparent",
  },
  aspectIconRectangle: {
    width: 16,
    height: 11,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "transparent",
  },
  aspectIconOutline: {
    width: 13,
    height: 13,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "transparent",
  },
  aspectIconFilled: {
    width: 13,
    height: 13,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
  },
  aspectOptionLabel: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 12,
  },
  aspectOptionLabelSelected: {
    color: "#67E8F9",
  },
  aspectSliderThumbOn: {
    right: 0,
  },
  aspectSliderThumbOff: {
    left: 0,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0B1221",
  },
  choiceChipSelected: {
    borderColor: "#22D3EE",
    backgroundColor: "#083344",
  },
  choiceChipText: {
    color: "#CBD5E1",
    fontWeight: "600",
    fontSize: 12,
  },
  choiceChipTextSelected: {
    color: "#67E8F9",
  },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#0B1221",
  },
  themeChipSelected: {
    borderColor: "#22D3EE",
    backgroundColor: "#083344",
  },
  themeColorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  previewWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: 4,
  },
  previewCard: {
    width: 324,
    height: 576,
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  previewInner: {
    flex: 1,
    justifyContent: "space-between",
    padding: 22,
  },
  previewLabel: {
    letterSpacing: 4,
    fontSize: 10,
    marginBottom: 8,
    fontWeight: "700",
  },
  previewScore: {
    fontSize: 62,
    lineHeight: 68,
    fontWeight: "900",
  },
  previewTier: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
  },
  previewMessage: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "800",
  },
  previewDetails: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  previewBrand: {
    marginTop: 20,
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  nativeShareNote: {
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111C32",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  nativeShareNoteText: {
    color: "#94A3B8",
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#22D3EE",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#475569",
  },
  secondaryButtonText: {
    color: "#E2E8F0",
    fontWeight: "700",
    fontSize: 16,
  },
});
