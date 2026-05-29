import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
    id: "dynamic",
    label: "Dynamic",
    background: "linear-gradient(140deg, #071422 0%, #071a24 50%, #0b2530 100%)",
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
    text: "#0f172a",
    muted: "#64748b",
  },
  {
    id: "deep-midnight",
    label: "Midnight",
    background: "linear-gradient(140deg, #0b1320 0%, #111827 52%, #1e293b 100%)",
    accent: "#22d3ee",
    text: "#f8fafc",
    muted: "#cbd5e1",
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
  aspectRatio?: '9:16' | '1:1' | 'transparent';
}) {
  const safeName = escapeHtml(shareDisplayName.trim());
  const safeDetails = escapeHtml(shareDetails.trim());
  const safeTierTitle = escapeHtml(tierTitle);
  const safeTierMessage = escapeHtml(tierMessage);
  const safeFont = escapeHtml(shareFontFamily);
  const progressPercent = Math.max(0, Math.min(100, finalScore)) / 100;
  const progressBarX = 174 + Math.round(progressPercent * 600);
  const dateStamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const svgWidth = aspectRatio === '1:1' || aspectRatio === 'transparent' ? 1080 : 1080;
  const svgHeight = aspectRatio === '1:1' || aspectRatio === 'transparent' ? 1080 : 1920;

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
      ${aspectRatio === 'transparent' ? '' : `<rect width="1080" height="1920" fill="url(#background-gradient)" />`}
      ${showAura && aspectRatio !== 'transparent' ? `<rect x="0" y="0" width="1080" height="1920" fill="url(#aura-glow)" />` : ``}
      <rect x="96" y="96" width="888" height="1728" rx="56" fill="#0f172a" stroke="${selectedShareTheme.accent}" stroke-width="2" />
      <text x="174" y="254" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="34" letter-spacing="8">AURA RESULT</text>
      <text x="834" y="220" fill="${selectedShareTheme.muted}" font-family="${safeFont}" font-size="18" opacity="0.8">${dateStamp}</text>
      <text x="174" y="430" fill="url(#score-gradient)" font-family="${safeFont}" font-size="134" font-weight="900">${Number.isFinite(finalScore) ? finalScore : 0}</text>
      <text x="174" y="520" fill="${selectedShareTheme.text}" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="900">${safeTierTitle}</text>
      ${layoutDensity === "detailed" ? `
        <text x="174" y="596" fill="${selectedShareTheme.muted}" fill-opacity="0.7" font-family="${safeFont}" font-size="36">${safeTierMessage}</text>
        <g>
          <rect x="174" y="620" rx="22" ry="22" width="160" height="48" fill="${selectedShareTheme.accent}" />
          <text x="254" y="652" fill="#021018" font-family="${safeFont}" font-size="20" font-weight="700" text-anchor="middle">TOP 8%</text>
        </g>
        <g>
          <rect x="174" y="700" rx="20" ry="20" width="156" height="44" fill="#0B1221" stroke="${selectedShareTheme.accent}" />
          <text x="252" y="730" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="18" font-weight="700" text-anchor="middle">⚡ Focus</text>

          <rect x="354" y="700" rx="20" ry="20" width="156" height="44" fill="#0B1221" stroke="${selectedShareTheme.accent}" />
          <text x="432" y="730" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="18" font-weight="700" text-anchor="middle">🌿 Calm</text>

          <rect x="534" y="700" rx="20" ry="20" width="156" height="44" fill="#0B1221" stroke="${selectedShareTheme.accent}" />
          <text x="612" y="730" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="18" font-weight="700" text-anchor="middle">✨ Locked In</text>
        </g>
        <g>
          <line x1="174" x2="834" y="780" stroke="${selectedShareTheme.muted}" stroke-width="6" stroke-linecap="round" opacity="0.35" />
          <circle cx="${progressBarX}" cy="780" r="14" fill="${selectedShareTheme.accent}" stroke="#ffffff" stroke-width="2" />
        </g>
        ${safeName ? `<text x="174" y="1438" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="46" font-weight="800">${safeName}</text>` : ""}
        ${safeDetails ? `<text x="174" y="1510" fill="${selectedShareTheme.muted}" font-family="${safeFont}" font-size="34">${safeDetails}</text>` : ""}
      ` : ""}
      <text x="174" y="1638" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="24" letter-spacing="5">my-aura-app</text>
    </svg>
  `;
}

export default function ShareScreen() {
  const router = useRouter();
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
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | 'transparent'>('9:16');
  const [isPreparingShareImage, setIsPreparingShareImage] = useState(false);

  const selectedShareTheme = useMemo(() => {
    return SHARE_CARD_THEMES.find((theme) => theme.id === shareThemeId) ?? SHARE_CARD_THEMES[0];
  }, [shareThemeId]);
  const previewProgress = Math.max(0, Math.min(100, finalScore)) / 100;

  const handleShareImage = useCallback(async () => {
    setIsPreparingShareImage(true);

    try {
      if (Platform.OS === "web") {
        const safeName = escapeHtml(shareDisplayName.trim());
        const safeDetails = escapeHtml(shareDetails.trim());
        const safeTierTitle = escapeHtml(tierTitle);
        const safeTierMessage = escapeHtml(tierMessage);

        const exportWidth = aspectRatio === '1:1' || aspectRatio === 'transparent' ? 1080 : 1080;
        const exportHeight = aspectRatio === '1:1' || aspectRatio === 'transparent' ? 1080 : 1920;

        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.left = "-9999px";
        wrapper.style.top = "0";
        wrapper.style.width = `${exportWidth}px`;
        wrapper.style.height = `${exportHeight}px`;
        wrapper.style.overflow = "hidden";
        wrapper.style.zIndex = "-1";

        const exportNode = document.createElement("div");
        exportNode.style.width = `${exportWidth}px`;
        exportNode.style.height = `${exportHeight}px`;
        exportNode.style.background = selectedShareTheme.background;
        exportNode.style.padding = "96px";
        exportNode.style.boxSizing = "border-box";
        exportNode.style.fontFamily = `${shareFontFamily}, sans-serif`;

        const exportProgress = Math.max(0, Math.min(100, finalScore)) / 100;
        const exportDate = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        const exportShowDetails = layoutDensity === 'detailed';
        const exportShowAura = showAura;
        exportNode.innerHTML = `
            <div style="
            height: 100%;
            border-radius: 56px;
            border: 2px solid ${selectedShareTheme.accent};
            background: ${exportShowAura ? 'radial-gradient(circle at 220px 420px, rgba(6,182,212,0.24) 0%, rgba(6,182,212,0.06) 30%, transparent 60%), #0f172a' : '#0f172a'};
            color: ${selectedShareTheme.text};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 78px;
            box-sizing: border-box;
          ">
            <div style="position:relative;">
              <div style="position:absolute; top:18px; right:18px; color: ${selectedShareTheme.muted}; opacity:0.8; font-size:14px;">${exportDate}</div>
            <div>
              <p style="letter-spacing: 8px; margin: 0 0 18px; color: ${selectedShareTheme.accent}; font-size: 34px;">AURA RESULT</p>
              <h1 style="margin: 0; font-size: 134px; line-height: 1.02; background: linear-gradient(180deg, #ffffff 0%, #C0C0C0 100%); -webkit-background-clip: text; color: transparent;">${Number.isFinite(finalScore) ? finalScore : 0}</h1>
              <h2 style="margin: 28px 0 0; font-size: 54px; line-height: 1.2; font-weight: 900; font-family: Helvetica, Arial, sans-serif;">${safeTierTitle}</h2>
              ${exportShowDetails ? `
                <p style="margin: 24px 0 0; color: ${selectedShareTheme.muted}; font-size: 36px; line-height: 1.45; opacity: 0.7;">${safeTierMessage}</p>
                <div style="margin-top: 14px; display:flex; gap:10px;">
                  <div style="background:#0B1221; border:1px solid ${selectedShareTheme.accent}; padding:8px 14px; border-radius:18px; color: ${selectedShareTheme.accent}; font-weight:700;">⚡ Focus</div>
                  <div style="background:#0B1221; border:1px solid ${selectedShareTheme.accent}; padding:8px 14px; border-radius:18px; color: ${selectedShareTheme.accent}; font-weight:700;">🌿 Calm</div>
                  <div style="background:#0B1221; border:1px solid ${selectedShareTheme.accent}; padding:8px 14px; border-radius:18px; color: ${selectedShareTheme.accent}; font-weight:700;">✨ Locked In</div>
                </div>
                <div style="margin-top:20px; width:420px;">
                  <div style="height:6px; background:#0f2230; border-radius:999px; position:relative;">
                    <div style="position:absolute; left: ${Math.round((Math.max(0, Math.min(100, finalScore)) / 100) * 100)}%; top: -7px; transform: translateX(-50%); width:18px; height:18px; border-radius:9px; background: ${selectedShareTheme.accent}; border:2px solid #fff;"></div>
                  </div>
                </div>
                <div style="margin-top: 14px; display: inline-block; background: ${selectedShareTheme.accent}; color: #021018; padding: 8px 18px; border-radius: 24px; font-weight: 700; font-size: 18px;">TOP 8%</div>
              ` : ''}
            </div>
            <div>
              ${safeName ? `<p style="margin: 0; font-size: 46px; color: ${selectedShareTheme.accent};">${safeName}</p>` : ""}
              ${safeDetails ? `<p style="margin: ${safeName ? "24px" : "0"} 0 0; font-size: 34px; line-height: 1.45; color: ${selectedShareTheme.muted};">${safeDetails}</p>` : ""}
              <p style="margin: -8px 0 0; letter-spacing: 5px; font-size: 24px; color: ${selectedShareTheme.accent};">my-aura-app</p>
            </div>
          </div>
        `;

        wrapper.appendChild(exportNode);
        document.body.appendChild(wrapper);

        await nextFrame();
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        await nextFrame();

        const { toBlob } = await import("html-to-image");
        const blob = await toBlob(exportNode, {
          cacheBust: true,
          pixelRatio: Math.max(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
          width: exportWidth,
          height: exportHeight,
        });

        if (!blob) {
          throw new Error("No blob generated");
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const slug = tierTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        link.href = downloadUrl;
        link.download = `aura-${slug || "result"}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        wrapper.remove();
        return;
      }

      const svg = buildShareCardSvg({
        finalScore,
        tierTitle,
        tierMessage,
        shareDisplayName,
        shareDetails,
        shareFontFamily,
        selectedShareTheme,
        layoutDensity,
        showAura,
        aspectRatio,
      });

      const slug = tierTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const shareFilePath = `${FileSystem.cacheDirectory}aura-${slug || "result"}.svg`;
      await FileSystem.writeAsStringAsync(shareFilePath, svg, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error("Sharing is not available on this device");
      }

      await Sharing.shareAsync(shareFilePath, {
        dialogTitle: "Share Aura Result",
        mimeType: "image/svg+xml",
        UTI: "public.svg-image",
      });
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to the result screen"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
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
          <View style={styles.choiceRow}>
            {SHARE_CARD_THEMES.map((theme) => {
              const isSelected = theme.id === shareThemeId;

              return (
                <Pressable
                  key={theme.id}
                  onPress={() => setShareThemeId(theme.id)}
                  style={[styles.choiceChip, isSelected && styles.choiceChipSelected]}
                >
                  <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextSelected]}>
                    {theme.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
              <View style={styles.choiceRow}>
                {[
                  { id: 'detailed', label: 'Detailed' },
                  { id: 'minimal', label: 'Minimal' },
                ].map((opt) => {
                  const isSelected = layoutDensity === opt.id;
                  return (
                    <Pressable key={opt.id} onPress={() => setLayoutDensity(opt.id as any)} style={[styles.choiceChip, isSelected && styles.choiceChipSelected]}>
                      <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextSelected]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
        </View>

        <View style={styles.previewWrapper}>
          <View
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
                    <View style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: selectedShareTheme.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 }}>
                      <Text style={{ color: '#021018', fontWeight: '700', fontSize: 12 }}>TOP 8%</Text>
                    </View>

                    <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                      <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                        <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>⚡ Focus</Text>
                      </View>
                      <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                        <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>🌿 Calm</Text>
                      </View>
                      <View style={{ backgroundColor: '#0B1221', borderWidth: 1, borderColor: selectedShareTheme.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                        <Text style={{ color: selectedShareTheme.accent, fontWeight: '700', fontSize: 12 }}>✨ Locked In</Text>
                      </View>
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

          <Text style={styles.shareLabel}>Background Style</Text>
          <View style={styles.choiceRow}>
            <Pressable onPress={() => setShowAura(true)} style={[styles.choiceChip, showAura && styles.choiceChipSelected]}>
              <Text style={[styles.choiceChipText, showAura && styles.choiceChipTextSelected]}>Aura On</Text>
            </Pressable>
            <Pressable onPress={() => setShowAura(false)} style={[styles.choiceChip, !showAura && styles.choiceChipSelected]}>
              <Text style={[styles.choiceChipText, !showAura && styles.choiceChipTextSelected]}>Aura Off</Text>
            </Pressable>
          </View>
          <Text style={styles.shareLabel}>Aspect Ratio</Text>
          <View style={styles.choiceRow}>
            {[
              { id: '9:16', label: '9:16 (Story)' },
              { id: '1:1', label: '1:1 (Square)' },
              { id: 'transparent', label: 'Transparent PNG' },
            ].map((opt) => {
              const isSelected = aspectRatio === opt.id;
              return (
                <Pressable key={opt.id} onPress={() => setAspectRatio(opt.id as any)} style={[styles.choiceChip, isSelected && styles.choiceChipSelected]}>
                  <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
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
              : Platform.OS === "web"
                ? "Download Aura Image (Temp)"
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
    marginTop: -34,
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
