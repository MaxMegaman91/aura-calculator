import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";


export default function IndexScreen() {
    const router = useRouter();
    const welcomeMessage = "Discover your aura score and personality traits with our fun and insightful quiz. \nCompete with your friends to see who is the coolest in your group! \nClick the button below to get started on your journey of self-discovery!";
    const transitionOpacityRef = useRef(new Animated.Value(1)).current;

    const animateTransitionOpacity = useCallback(
        (toValue: number, duration: number) => {
          return new Promise<void>((resolve) => {
            Animated.timing(transitionOpacityRef, {
              toValue,
              duration,
              useNativeDriver: true,
            }).start(() => resolve());
          });
        },
        [transitionOpacityRef],
      );

    const goNextPage = useCallback(async () => {
        await animateTransitionOpacity(0, 500);
        router.push("/start");
    }, [animateTransitionOpacity, router]);

    return (

        <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
          <Animated.View style={{ flex: 1, backgroundColor: "#0F172A", width: "100%", alignItems: "center", justifyContent: "center", padding: 20, opacity: transitionOpacityRef }}>

            <View style={{flex: 1, backgroundColor: "#0F172A", width: "100%", alignItems: "center", justifyContent: "center", padding: 20}}>
                    <Text style={{ color: '#fff', fontSize: 48, fontWeight: 'bold', marginBottom: 20 }}>Welcome to The Aura Calculator</Text>
                    <Text style={{ color: '#fff', fontSize: 24, textAlign: 'center', marginBottom: 40 }}>{welcomeMessage}</Text>
                    <Pressable
                        onPress={goNextPage}
                        style={{ backgroundColor: '#0B1221', paddingHorizontal: 50, paddingVertical: 20, borderRadius: 12 }}
                        
                    >
                        <Text style={{ color: '#fff', fontSize: 16 }}>Start Quiz</Text>
                    </Pressable>
            </View>
          </Animated.View>
        </View>

    )
}