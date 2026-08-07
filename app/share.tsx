// import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
// import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import { getSharePayload } from "../utils/share-session";

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
const FOCUS_UNLOCK_SCORE = 1000;
const LOCKED_IN_UNLOCK_SCORE = 2000;
const GOLDEN_UNLOCK_SCORE = 3000;


function isBadgeUnlocked(score: number, threshold: number) {
  return score >= threshold;
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

function isLikelyPhoneWeb(ScreenWidth: number) {
  // console.log("Platform.OS: \"", Platform.OS, "\"\nwindow:", typeof window, "\nnavigator:", typeof navigator, "\nuserAgent:", navigator?.userAgent);
  if (Platform.OS !== "web") return false;
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const uaMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const narrowViewport = ScreenWidth < 900;
  const coarsePointer = typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;

  // console.log("isLikelyPhoneWeb:", (uaMobile || (narrowViewport && coarsePointer)));
  return uaMobile || (narrowViewport && coarsePointer);
}

function ensureFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path.replace(/^file:\/\//, "")}`;
}

export function calculateAuraPercent(finalScore: number): number {
  // 1. Scores <= 0: Max percentage
  if (finalScore <= 0) {
    return 100;
  }

  // 2. Scores between 0 and 2500 (100% -> 25%)
  if (finalScore <= 2500) {
    const progress = finalScore / 2500;
    return 100 - progress * (100 - 25);
  }

  // 3. Scores between 2500 and 5000 (25% -> 1% using exponential drop)
  if (finalScore <= 5000) {
    const progress = (finalScore - 2500) / 2500;
    // Exponential decay ensures a realistic curve down to 1%
    return 25 * Math.pow(1 / 25, progress);
  }

  // 4. Scores above 5000 (1% decaying towards 0.1%)
  const excessScore = finalScore - 5000;
  const decayRate = 0.0015; // Controls how fast it approaches 0.1%
  return 0.1 + 0.9 * Math.exp(-decayRate * excessScore);
}

export default function ShareScreen() {
  const router = useRouter();
  const previewShotRef = useRef<ViewShot | null>(null);

  const payload = getSharePayload();
  const finalScore = payload?.score ?? 0;
  const tierTitle = payload?.tierTitle ?? "Aura Tier";
  const tierMessage = payload?.tierMessage ?? "Your result";
  const { width } = useWindowDimensions();

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

  const auraPercent = calculateAuraPercent(finalScore);

  // console.log("[ShareScreen] finalScore:", finalScore, "auraPercent:", auraPercent);
  const sliderFillPercent = Math.max(0, Math.min(100, 100 - auraPercent));
  const showTopQuarterBadge = auraPercent < 25;
  // EDIT HERE: tweak the TOP x% curve by changing calculateAuraPercent above.
  // The displayed value is clamped to stay below 25% and never below 0.1%.
  const topPercentValue = Math.max(0.1, Math.min(24.9, auraPercent));
  const showGoldenBadge = isBadgeUnlocked(finalScore, GOLDEN_UNLOCK_SCORE);
  const showFocusBadge = isBadgeUnlocked(finalScore, FOCUS_UNLOCK_SCORE);
  const showLockedInBadge = isBadgeUnlocked(finalScore, LOCKED_IN_UNLOCK_SCORE);

  

  const isPhoneWeb = useMemo(() => isLikelyPhoneWeb(width), []);
  // console.log("[ShareScreen] isPhoneWeb:", isPhoneWeb);

  const handleShareImage = useCallback(async () => {
    setIsPreparingShareImage(true);

    // console.log("[SHARE] starting image preparation")
    try {
      // Native fallback (if opened as app instead of website)
      if (Platform.OS !== "web") {

        // console.log("[SHARE] starting image capture for native share")
        if (!previewShotRef.current) throw new Error("Preview is not ready");

        const previewCapturePath = await captureRef(previewShotRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });

        if (!previewCapturePath) throw new Error("No preview image generated");

        // console.log("[SHARE] captured image at:", previewCapturePath)
        
        const fileUrl = ensureFileUri(previewCapturePath);
        const NativeShare = (await import("react-native-share")).default;

        // console.log("[SHARE] opening native share sheet with fileUrl:", fileUrl)
        await NativeShare.open({
          url: fileUrl,
          type: "image/png",
          failOnCancel: false,
          title: "Hey, I just got my Aura result! Try it out for free on aurarank.ca!",
        });

        return;
      }

      // Web export (phone browser => share sheet, desktop => download)
      const exportWidth = 1080;
      const exportHeight = aspectRatio === "1:1" ? 1080 : 1920;
      const slug = tierTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const fileName = `MyAuraResult-${slug || "result"}.png`;

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${exportWidth}px;height:${exportHeight}px;overflow:hidden;z-index:-1;`;

      const exportNode = document.createElement("div");
      exportNode.style.cssText = `width:${exportWidth}px;height:${exportHeight}px;background:${selectedShareTheme.background};padding:96px;box-sizing:border-box;font-family:${shareFontFamily},sans-serif;`;

      const exportDate = new Date().toLocaleString("en-US", { month: "short", day: "numeric" }).toUpperCase();
      const exportShowDetails = layoutDensity === "detailed";
      const exportSliderPercent = sliderFillPercent;
      const safeName = escapeHtml(shareDisplayName.trim());
      const safeDetails = escapeHtml(shareDetails.trim());
      const safeTierTitle = escapeHtml(tierTitle);
      const safeTierMessage = escapeHtml(tierMessage);
      const topPercentLabel = topPercentValue.toFixed(1);

      exportNode.innerHTML = `
        <div style="height:100%;border-radius:56px;border:2px solid ${selectedShareTheme.accent};background:${showAura ? `radial-gradient(circle at 220px 420px, rgba(6,182,212,0.24) 0%, rgba(6,182,212,0.06) 30%, transparent 60%), #0f172a` : "#0f172a"};color:${selectedShareTheme.text};display:flex;flex-direction:column;justify-content:space-between;padding:78px;box-sizing:border-box;">
          <div style="position:relative;">
            <div style="position:absolute;top:18px;right:18px;color:${selectedShareTheme.muted};opacity:0.8;font-size:28px;">${exportDate}</div>
            <div>
              <p style="letter-spacing:8px;margin:0 0 18px;color:${selectedShareTheme.accent};font-size:40px;">AURA RESULT</p>
              <h1 style="margin:0;font-size:160px;line-height:1.02;background:linear-gradient(180deg,#ffffff 0%,#C0C0C0 100%);-webkit-background-clip:text;color:transparent;">${Number.isFinite(finalScore) ? finalScore : 0}</h1>
              <h2 style="margin:28px 0 0;font-size:70px;line-height:1.2;font-weight:900;font-family:Helvetica,Arial,sans-serif;">${safeTierTitle}</h2>
              ${
                exportShowDetails
                  ? `
                <p style="margin:24px 0 50px;color:${selectedShareTheme.muted};font-size:46px;line-height:1.45;opacity:0.7;">${safeTierMessage}</p>
                ${showTopQuarterBadge ? `<div style="margin-top:18px;display:inline-flex;align-items:center;justify-content:center;background:${selectedShareTheme.accent};color:#021018;border-radius:18px;padding:10px 16px;font-size:40px;font-weight:800;line-height:1;">TOP ${topPercentLabel}%</div>` : ""}
                <div style="margin-top:30px;display:flex;gap:20px;flex-wrap:wrap;">
                  
                  ${showFocusBadge ? `<div style="background:#0B1221;border:1px solid ${selectedShareTheme.accent};padding:25px 40px;border-radius:18px;color:${selectedShareTheme.accent};font-weight:1400;"><p style="margin:0;font-size:36px;">⚡ Focus</p></div>` : ""}
                  ${showLockedInBadge ? `<div style="background:#0B1221;border:1px solid ${selectedShareTheme.accent};padding:25px 40px;border-radius:18px;color:${selectedShareTheme.accent};font-weight:1400;"><p style="margin:0;font-size:36px;">✨ Locked In</p></div>` : ""}
                  ${showGoldenBadge ? `<div style="background:#0B1221;border:1px solid ${selectedShareTheme.accent};padding:25px 40px;border-radius:18px;color:${selectedShareTheme.accent};font-weight:1400;"><p style="margin:0;font-size:36px;">🏅 AuraMaxxing</p></div>` : ""}
                </div>
              `
                  : ""
              }

              <!-- SLIDER COMPONENT START -->
              <div style="margin-top:52px;position:relative;width:100%;height:18px;background:rgba(255,255,255,0.12);border-radius:999px;">
                <!-- Active Track Fill -->
                <div style="position:absolute;left:0;top:0;height:100%;width:${exportSliderPercent}%;background:${selectedShareTheme.accent};border-radius:999px;opacity:0.6;"></div>
                <!-- Glowing Circle Thumb -->
                <div style="position:absolute;left:${exportSliderPercent}%;top:50%;transform:translate(-50%, -50%);width:52px;height:52px;border-radius:50%;background:${selectedShareTheme.accent};border:6px solid #0f172a;box-shadow:0 0 24px ${selectedShareTheme.accent};"></div>
              </div>
              <!-- SLIDER COMPONENT END -->
            </div>
          </div>
          <div>
            ${safeName ? `<p style="margin:0;font-size:46px;color:${selectedShareTheme.accent};">${safeName}</p>` : ""}
            ${safeDetails ? `<p style="margin:${safeName ? "24px" : "0"} 0 0;font-size:34px;line-height:1.45;color:${selectedShareTheme.muted};">${safeDetails}</p>` : ""}
            <p style="margin:12px 0 0;letter-spacing:5px;font-size:24px;color:${selectedShareTheme.accent};">aurarank.ca</p>
          </div>
        </div>
      `;

      wrapper.appendChild(exportNode);
      document.body.appendChild(wrapper);

      let blob: Blob | null = null;
      try {
        await nextFrame();
        if (document.fonts?.ready) await document.fonts.ready;
        await nextFrame();

        const { toBlob } = await import("html-to-image");
        blob = await toBlob(exportNode, {
          cacheBust: true,
          pixelRatio: Math.max(2, window.devicePixelRatio || 1),
          width: exportWidth,
          height: exportHeight,
        });
      } finally {
        wrapper.remove();
      }

      if (!blob) throw new Error("No image blob generated");

      // Mobile web => share sheet (files)

      // console.log("[ShareScreen.handleShareImage] isPhoneWeb:", isPhoneWeb, "navigator.share:", typeof navigator !== "undefined" && "share" in navigator);
      if (isPhoneWeb && typeof navigator !== "undefined" && "share" in navigator) {

        // console.log("     continuing...")
        const file = new File([blob], fileName, { type: "image/png" });

        const canShareFiles =
          typeof navigator.canShare === "function"
            ? navigator.canShare({ files: [file] })
            : false;

        // console.log("     canShareFiles:", canShareFiles);
        if (canShareFiles) {
          try {
            await navigator.share({
              title: "Share Aura Result",
              files: [file],
            });
            return;
          } catch (err: unknown) {
            const name = err instanceof Error ? err.name : "";
            // console.log("      error sharing:", name, err);
            if (name === "AbortError") return;
          }
        }
      }

      // Desktop web OR fallback => download
      // console.log("[ShareScreen.handleShareImage] fallback to download");
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      // console.error(error);
      Alert.alert("Export failed", "Could not generate/share the image. Please try again.");
    } finally {
      setIsPreparingShareImage(false);
    }

    /*
    // Previous share logic intentionally replaced:
    // - expo-sharing path
    // - duplicated toBlob/share attempts
    // - invalid navigator.share({ files: Promise<File[]> })
    */
  }, [
    aspectRatio,
    finalScore,
    isPhoneWeb,
    layoutDensity,
    selectedShareTheme.accent,
    selectedShareTheme.background,
    selectedShareTheme.muted,
    selectedShareTheme.text,
    shareDetails,
    shareDisplayName,
    shareFontFamily,
    showAura,
    showGoldenBadge,
    showFocusBadge,
    showLockedInBadge,
    tierMessage,
    tierTitle,
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
            placeholder="[Optional] Name or Nickname"
            placeholderTextColor="#64748B"
            style={styles.shareInput}
          />
          <TextInput
            value={shareDetails}
            onChangeText={setShareDetails}
            placeholder="[Optional] Comments or Details"
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

                    {showTopQuarterBadge ? (
                      <View style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: selectedShareTheme.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 }}>
                        <Text style={{ color: '#021018', fontWeight: '700', fontSize: 12 }}>TOP {topPercentValue.toFixed(1)}%</Text>
                      </View>
                    ) : null}

                    <View style={{ marginTop: 20, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
                      {showGoldenBadge ? (
                        <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                          <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>🌿 Calm</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ marginTop: 16, width: 240 }}>
                      <View style={{ height: 6, backgroundColor: '#0f2230', borderRadius: 999, position: 'relative' }}>
                        <View style={{ position: 'absolute', left: `${sliderFillPercent}%`, top: -6, transform: [{ translateX: -9 }], width: 18, height: 18, borderRadius: 9, backgroundColor: selectedShareTheme.accent, borderWidth: 2, borderColor: '#fff' }} />
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
              : Platform.OS === "web" && !isPhoneWeb
              ? "Download Aura Image"
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
