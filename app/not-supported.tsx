import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function NotSupported() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Instagram Story Share Not Supported Here</Text>
        <Text style={styles.description}>
          Posting to Instagram Story is only available on mobile devices where the
          Instagram app can be opened.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => {
            router.back();
          }}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: "#CBD5E1",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 500,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#22D3EE",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 16,
  },
});
