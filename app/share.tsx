import { File, Paths } from "expo-file-system";
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

function buildShareCardSvg({
  finalScore,
  tierTitle,
  tierMessage,
  shareDisplayName,
  shareDetails,
  shareFontFamily,
  selectedShareTheme,
}: {
  finalScore: number;
  tierTitle: string;
  tierMessage: string;
  shareDisplayName: string;
  shareDetails: string;
  shareFontFamily: string;
  selectedShareTheme: ShareCardTheme;
}) {
  const safeName = escapeHtml(shareDisplayName.trim());
  const safeDetails = escapeHtml(shareDetails.trim());
  const safeTierTitle = escapeHtml(tierTitle);
  const safeTierMessage = escapeHtml(tierMessage);
  const safeFont = escapeHtml(shareFontFamily);

  return `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aura result share card">
      <defs>
        <linearGradient id="background-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1320" />
          <stop offset="52%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#background-gradient)" />
      <rect x="96" y="96" width="888" height="1728" rx="56" fill="#0f172a" stroke="${selectedShareTheme.accent}" stroke-width="2" />
      <text x="174" y="254" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="34" letter-spacing="8">AURA RESULT</text>
      <text x="174" y="430" fill="${selectedShareTheme.text}" font-family="${safeFont}" font-size="112" font-weight="900">${Number.isFinite(finalScore) ? finalScore : 0}</text>
      <text x="174" y="520" fill="${selectedShareTheme.text}" font-family="${safeFont}" font-size="54" font-weight="800">${safeTierTitle}</text>
      <text x="174" y="596" fill="${selectedShareTheme.muted}" font-family="${safeFont}" font-size="36">${safeTierMessage}</text>
      ${safeName ? `<text x="174" y="1488" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="46" font-weight="800">${safeName}</text>` : ""}
      ${safeDetails ? `<text x="174" y="1560" fill="${selectedShareTheme.muted}" font-family="${safeFont}" font-size="34">${safeDetails}</text>` : ""}
      <text x="174" y="1688" fill="${selectedShareTheme.accent}" font-family="${safeFont}" font-size="24" letter-spacing="5">my-aura-app</text>
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
  const [isPreparingShareImage, setIsPreparingShareImage] = useState(false);

  const selectedShareTheme = useMemo(() => {
    return SHARE_CARD_THEMES.find((theme) => theme.id === shareThemeId) ?? SHARE_CARD_THEMES[0];
  }, [shareThemeId]);

  const handleShareImage = useCallback(async () => {
    setIsPreparingShareImage(true);

    try {
      if (Platform.OS === "web") {
        if (typeof document === "undefined") {
          throw new Error("Document not available");
        }

        const safeName = escapeHtml(shareDisplayName.trim());
        const safeDetails = escapeHtml(shareDetails.trim());
        const safeTierTitle = escapeHtml(tierTitle);
        const safeTierMessage = escapeHtml(tierMessage);

        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.left = "-9999px";
        wrapper.style.top = "0";
        wrapper.style.width = "1080px";
        wrapper.style.height = "1920px";
        wrapper.style.overflow = "hidden";
        wrapper.style.zIndex = "-1";

        const exportNode = document.createElement("div");
        exportNode.style.width = "1080px";
        exportNode.style.height = "1920px";
        exportNode.style.background = selectedShareTheme.background;
        exportNode.style.padding = "96px";
        exportNode.style.boxSizing = "border-box";
        exportNode.style.fontFamily = `${shareFontFamily}, sans-serif`;

        exportNode.innerHTML = `
          <div style="
            height: 100%;
            border-radius: 56px;
            border: 2px solid ${selectedShareTheme.accent};
            background: #0f172a;
            color: ${selectedShareTheme.text};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 78px;
            box-sizing: border-box;
          ">
            <div>
              <p style="letter-spacing: 8px; margin: 0 0 18px; color: ${selectedShareTheme.accent}; font-size: 34px;">AURA RESULT</p>
              <h1 style="margin: 0; font-size: 112px; line-height: 1.04;">${Number.isFinite(finalScore) ? finalScore : 0}</h1>
              <h2 style="margin: 28px 0 0; font-size: 54px; line-height: 1.2;">${safeTierTitle}</h2>
              <p style="margin: 24px 0 0; color: ${selectedShareTheme.muted}; font-size: 36px; line-height: 1.45;">${safeTierMessage}</p>
            </div>
            <div>
              ${safeName ? `<p style="margin: 0; font-size: 46px; color: ${selectedShareTheme.accent};">${safeName}</p>` : ""}
              ${safeDetails ? `<p style="margin: ${safeName ? "24px" : "0"} 0 0; font-size: 34px; line-height: 1.45; color: ${selectedShareTheme.muted};">${safeDetails}</p>` : ""}
              <p style="margin: 42px 0 0; letter-spacing: 5px; font-size: 24px; color: ${selectedShareTheme.accent};">my-aura-app</p>
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
          width: 1080,
          height: 1920,
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
      });

      const slug = tierTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const shareFile = new File(Paths.cache, `aura-${slug || "result"}.svg`);
      shareFile.write(svg, { encoding: "utf8" });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error("Sharing is not available on this device");
      }

      await Sharing.shareAsync(shareFile.uri, {
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
                    { color: selectedShareTheme.text, fontFamily: shareFontFamily },
                  ]}
                >
                  {tierTitle}
                </Text>
                <Text
                  style={[
                    styles.previewMessage,
                    { color: selectedShareTheme.muted, fontFamily: shareFontFamily },
                  ]}
                >
                  {tierMessage}
                </Text>
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
    fontSize: 52,
    lineHeight: 58,
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
    marginTop: 16,
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
